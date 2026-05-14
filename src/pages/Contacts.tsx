import { useState, useEffect } from 'react';
import { Plus, Search, Phone, Mail, Calendar, Clock, History, Edit2, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import ContactModal from '../components/ContactModal';

// הגדרות סוגי נתונים
interface Contact {
  id: string;
  name: string;
  phone: string;
  email?: string;
  tags?: string[];
  general_notes?: string;
  created_at: string;
}

interface Appointment {
  id: string;
  scheduled_at?: string;
  appointment_date?: string;
  appointment_type?: string;
  title?: string;
  status: string;
  notes?: string;
}

interface ContactsPageProps {
  onNewAppointment: (contactId: string) => void;
}

export default function ContactsPage({ onNewAppointment }: ContactsPageProps) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [contactHistory, setContactHistory] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  
  // שדות לעריכת איש קשר ומודל
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Contact | null>(null);

  // שדות לעריכת ה-CRM של הפונה
  const [newTag, setNewTag] = useState('');
  const [generalNotes, setGeneralNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchContacts();
  }, []);

  async function fetchContacts() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setContacts(data || []);
      
      // אם יש איש קשר בחור, נרענן גם אותו
      if (selectedContact) {
        const updated = data?.find(c => c.id === selectedContact.id);
        if (updated) setSelectedContact(updated);
      }
    } catch (err) {
      console.error('Error fetching contacts:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSelectContact(contact: Contact) {
    setSelectedContact(contact);
    setGeneralNotes(contact.general_notes || '');
    
    // משיכת היסטוריית פגישות
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('contact_id', contact.id)
        .order('scheduled_at', { ascending: false });

      if (error) throw error;
      setContactHistory(data || []);
    } catch (err) {
      console.error('Error fetching history:', err);
    }
  }

  async function handleSaveCRM() {
    if (!selectedContact) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('contacts')
        .update({
          general_notes: generalNotes,
          tags: selectedContact.tags
        })
        .eq('id', selectedContact.id);

      if (error) throw error;
      
      setContacts(contacts.map(c => c.id === selectedContact.id ? { ...c, general_notes: generalNotes, tags: selectedContact.tags } : c));
      alert('נתוני ה-CRM עודכנו בהצלחה');
    } catch (err) {
      console.error(err);
      alert('שגיאה בשמירת הנתונים. האם הרצת את המיגרציה למסד הנתונים?');
    } finally {
      setIsSaving(false);
    }
  }

  const addTag = () => {
    if (!selectedContact || !newTag.trim()) return;
    const currentTags = selectedContact.tags || [];
    if (currentTags.includes(newTag.trim())) return;
    
    const updatedContact = { ...selectedContact, tags: [...currentTags, newTag.trim()] };
    setSelectedContact(updatedContact);
    setNewTag('');
  };

  const removeTag = (tagToRemove: string) => {
    if (!selectedContact) return;
    const updatedContact = { 
      ...selectedContact, 
      tags: (selectedContact.tags || []).filter(t => t !== tagToRemove) 
    };
    setSelectedContact(updatedContact);
  };

  const filteredContacts = contacts.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (c.phone && c.phone.includes(searchTerm))
  );

  function getStatusLabel(status: string) {
    const s = status?.toLowerCase() || '';
    if (s.includes('confirm') || s.includes('scheduled')) return { label: 'מאושר/נקבע', color: 'text-green-600' };
    if (s.includes('cancel')) return { label: 'בוטל', color: 'text-red-500' };
    if (s.includes('complete')) return { label: 'בוצע', color: 'text-sky-600' };
    return { label: 'ממתין', color: 'text-amber-500' };
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto dir-rtl" style={{ direction: 'rtl' }}>
      
      {/* כותרת עליונה */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">ניהול פונים ומערכת CRM</h1>
          <p className="text-slate-500 mt-1">{contacts.length} אנשי קשר במערכת</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative w-72">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="חיפוש לפי שם או טלפון..."
              className="w-full pr-10 pl-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-sky-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button
            onClick={() => { setEditing(null); setModalOpen(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-sm font-medium transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            איש קשר חדש
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* צד ימין: רשימת אנשי הקשר */}
        <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden h-[calc(100vh-220px)] flex flex-col">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 font-semibold text-slate-700 flex justify-between items-center">
            כל הפונים 
          </div>
          <div className="overflow-y-auto flex-1 divide-y divide-slate-50">
            {loading ? (
              <div className="p-8 text-center flex flex-col items-center justify-center">
                <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin mb-2" />
                <span className="text-slate-400 text-sm">טוען נתונים...</span>
              </div>
            ) : filteredContacts.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">לא נמצאו פונים</div>
            ) : (
              filteredContacts.map(contact => (
                <div 
                  key={contact.id} 
                  onClick={() => handleSelectContact(contact)}
                  className={`p-4 cursor-pointer transition-all hover:bg-slate-50 ${selectedContact?.id === contact.id ? 'bg-sky-50/40 border-r-4 border-sky-500' : 'border-r-4 border-transparent'}`}
                >
                  <div className="font-semibold text-slate-800">{contact.name}</div>
                  <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                    <Phone className="w-3 h-3" /> {contact.phone}
                  </div>
                  {contact.tags && contact.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {contact.tags.slice(0, 3).map(t => (
                        <span key={t} className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px]">{t}</span>
                      ))}
                      {contact.tags.length > 3 && <span className="px-1.5 py-0.5 text-slate-400 text-[10px]">+{contact.tags.length - 3}</span>}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* צד שמאל: פרופיל CRM וכרטיס פונה חכם */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-6 h-[calc(100vh-220px)] overflow-y-auto relative">
          {selectedContact ? (
            <div className="animate-fadeIn">
              {/* כותרת פרופיל */}
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start border-b border-slate-100 pb-5 mb-6 gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-slate-800">{selectedContact.name}</h2>
                  <div className="flex items-center gap-4 mt-2">
                    <span className="flex items-center gap-1.5 text-sm text-slate-500">
                      <Phone className="w-4 h-4 text-slate-400" /> {selectedContact.phone}
                    </span>
                    {selectedContact.email && (
                      <span className="flex items-center gap-1.5 text-sm text-slate-500">
                        <Mail className="w-4 h-4 text-slate-400" /> {selectedContact.email}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setEditing(selectedContact); setModalOpen(true); }}
                    className="p-2 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors border border-slate-200"
                    title="ערוך פרטי איש קשר"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onNewAppointment(selectedContact.id)}
                    className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-sm"
                  >
                    <Calendar className="w-4 h-4" /> קבע תור לרב
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* חלק ימני בפרופיל: תגיות והערות */}
                <div>
                  {/* תגיות CRM */}
                  <div className="mb-6">
                    <label className="block text-sm font-semibold text-slate-700 mb-3">תגיות פונה (CRM)</label>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {(selectedContact.tags || []).map(t => (
                        <span key={t} className="flex items-center gap-1.5 px-2.5 py-1 bg-sky-50 text-sky-700 rounded-lg text-xs font-medium border border-sky-100">
                          {t}
                          <button onClick={() => removeTag(t)} className="hover:text-red-500 text-sm font-bold ml-1">×</button>
                        </span>
                      ))}
                      {(selectedContact.tags || []).length === 0 && <span className="text-xs text-slate-400">אין תגיות לפונה זה</span>}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="הוסף תג (למשל: דחוף, תורם)..."
                        className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-sky-500 bg-slate-50"
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addTag()}
                      />
                      <button onClick={addTag} className="px-4 py-2 bg-slate-800 text-white rounded-lg text-xs hover:bg-slate-700 transition-colors">הוסף</button>
                    </div>
                  </div>

                  {/* הערות וסיכומים קבועים של הרב */}
                  <div className="mb-6">
                    <label className="block text-sm font-semibold text-slate-700 mb-3">תיק פונה והערות קבועות לרב</label>
                    <textarea
                      rows={5}
                      placeholder="רשום כאן רקע חשוב, מידע משפחתי או כל דבר שהרב צריך לדעת עליו קבוע לפני הפגישה..."
                      className="w-full p-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-sky-500 bg-slate-50 resize-none"
                      value={generalNotes}
                      onChange={(e) => setGeneralNotes(e.target.value)}
                    />
                    <button
                      onClick={handleSaveCRM}
                      disabled={isSaving}
                      className="mt-3 w-full px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 shadow-sm"
                    >
                      {isSaving ? 'שומר שינויים...' : 'שמור נתוני CRM'}
                    </button>
                  </div>
                </div>

                {/* חלק שמאלי בפרופיל: היסטוריית פגישות */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                    <History className="w-4 h-4 text-slate-400" />
                    היסטוריית פגישות וסיכומי ייעוץ
                  </h3>
                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                    {contactHistory.length === 0 ? (
                      <div className="p-4 border border-dashed border-slate-200 rounded-xl text-center">
                        <p className="text-xs text-slate-400">לא נמצאו פגישות קודמות במערכת.</p>
                      </div>
                    ) : (
                      contactHistory.map(apt => {
                        const dateStr = apt.scheduled_at || apt.appointment_date;
                        const statusObj = getStatusLabel(apt.status);
                        
                        return (
                          <div key={apt.id} className="p-4 border border-slate-100 rounded-xl bg-slate-50/50 hover:bg-slate-50 transition-colors">
                            <div className="flex justify-between items-start mb-2 gap-2">
                              <div>
                                <span className="font-semibold text-xs px-2 py-1 bg-white border border-slate-200 rounded-md text-slate-700 shadow-sm">
                                  {apt.appointment_type || apt.title || 'פגישת ייעוץ'}
                                </span>
                              </div>
                              <span className="text-[11px] text-slate-500 flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-md">
                                <Clock className="w-3 h-3" />
                                {dateStr ? new Date(dateStr).toLocaleString('he-IL', { dateStyle: 'short', timeStyle: 'short' }) : 'תאריך חסר'}
                              </span>
                            </div>
                            
                            <div className="text-xs text-slate-600 mt-3 bg-white p-2.5 rounded-lg border border-slate-100">
                              <strong className="text-slate-800">סיכום פגישה: </strong> 
                              {apt.notes ? <span className="whitespace-pre-wrap">{apt.notes}</span> : <span className="text-slate-400 italic">לא נרשם סיכום</span>}
                            </div>
                            
                            <div className="mt-3 text-[11px] flex justify-between items-center border-t border-slate-100 pt-2">
                              <span>סטטוס: <span className={`font-bold ${statusObj.color}`}>{statusObj.label}</span></span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
              <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-4">
                <Search className="w-8 h-8 text-slate-300" />
              </div>
              <p className="text-sm font-medium">בחר פונה מהרשימה כדי לראות את כרטיס ה-CRM המלא שלו</p>
            </div>
          )}
        </div>
      </div>

      {/* מודל עריכה / הוספה של איש קשר (נשמר מהקוד הקודם שלך) */}
      {modalOpen && (
        <ContactModal
          contact={editing}
          onClose={() => setModalOpen(false)}
          onSaved={() => { setModalOpen(false); fetchContacts(); }}
        />
      )}
    </div>
  );
}