import { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Clock, User, MessageCircle, Mail, FileText, Check, Plus, Trash2, Smartphone, List, LayoutGrid } from 'lucide-react';
import { supabase } from '../lib/supabase';
import CalendarView from '../components/CalendarView';

interface Contact {
  id: string;
  name: string;
  phone: string;
}

interface Appointment {
  id: string;
  contact_id: string;
  scheduled_at: string;
  appointment_type: string;
  status: string;
  notes: string;
  send_whatsapp_reminder: boolean;
  send_sms_reminder: boolean;
  send_email_reminder: boolean;
  contacts?: Contact;
}

interface AppointmentsPageProps {
  preselectedContactId?: string;
  onClearPreselect: () => void;
}

const APPOINTMENT_TYPES = [
  { id: 'personal', label: 'ייעוץ אישי / ברכה', duration: '20 דק', color: 'bg-blue-100 text-blue-700' },
  { id: 'shalom', label: 'שלום בית', duration: '45 דק', color: 'bg-emerald-100 text-emerald-700' },
  { id: 'business', label: 'ייעוץ עסקי ומשפטי', duration: '30 דק', color: 'bg-amber-100 text-amber-700' },
  { id: 'tfilin', label: 'בדיקת תפילין ומזוזות', duration: '15 דק', color: 'bg-sky-100 text-sky-700' },
];

type ViewMode = 'list' | 'calendar';

export default function AppointmentsPage({ preselectedContactId, onClearPreselect }: AppointmentsPageProps) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  const [selectedContact, setSelectedContact] = useState(preselectedContactId || '');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [appType, setAppType] = useState('ייעוץ אישי / ברכה');
  const [notes, setNotes] = useState('');
  const [sendWa, setSendWa] = useState(true);
  const [sendSms, setSendSms] = useState(true);
  const [sendEmail, setSendEmail] = useState(true);

  useEffect(() => {
    fetchData();
    if (preselectedContactId) {
      setSelectedContact(preselectedContactId);
      const now = new Date();
      setDate(now.toISOString().split('T')[0]);
      setTime(`${String(now.getHours() + 1).padStart(2, '0')}:00`);
    }
  }, [preselectedContactId]);

  async function fetchData() {
    setLoading(true);
    try {
      const { data: contactsData } = await supabase.from('contacts').select('id, name, phone').order('name');
      if (contactsData) setContacts(contactsData);

      const { data: aptData } = await supabase
        .from('appointments')
        .select('*, contacts(name, phone)')
        .order('scheduled_at', { ascending: true });

      if (aptData) setAppointments(aptData);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateAppointment(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedContact || !date || !time) return alert('נא למלא איש קשר, תאריך ושעה');

    setIsSubmitting(true);
    const scheduled_at = new Date(`${date}T${time}`).toISOString();

    try {
      const { error } = await supabase.from('appointments').insert([{
        contact_id: selectedContact,
        scheduled_at,
        appointment_type: appType,
        status: 'scheduled',
        notes,
        send_whatsapp_reminder: sendWa,
        send_sms_reminder: sendSms,
        send_email_reminder: sendEmail,
      }]);

      if (error) throw error;

      setSelectedContact('');
      setDate('');
      setTime('');
      setNotes('');
      if (preselectedContactId) onClearPreselect();
      fetchData();
    } catch (error) {
      console.error(error);
      alert('שגיאה ביצירת פגישה.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function updateStatus(id: string, newStatus: string) {
    await supabase.from('appointments').update({ status: newStatus }).eq('id', id);
    fetchData();
  }

  function handleCalendarDateClick(dateStr: string) {
    const dt = new Date(dateStr);
    setDate(dt.toISOString().split('T')[0]);
    const h = String(dt.getHours()).padStart(2, '0');
    const m = String(dt.getMinutes()).padStart(2, '0');
    setTime(`${h}:${m}`);
    setViewMode('list');
  }

  function handleCalendarEventClick(id: string) {
    const appt = appointments.find(a => a.id === id);
    if (!appt) return;
    setSelectedContact(appt.contact_id);
    setDate(new Date(appt.scheduled_at).toISOString().split('T')[0]);
    const dt = new Date(appt.scheduled_at);
    setTime(`${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`);
    setAppType(appt.appointment_type || 'ייעוץ אישי / ברכה');
    setNotes(appt.notes || '');
    setViewMode('list');
  }

  const calendarEvents = appointments.map(a => ({
    id: a.id,
    title: a.contacts?.name || 'פגישה',
    start: a.scheduled_at,
    extendedProps: {
      status: a.status,
      contactName: a.contacts?.name || '',
      appointmentType: a.appointment_type || '',
      notes: a.notes || '',
    },
  }));

  const upcomingAppointments = appointments.filter(
    a => new Date(a.scheduled_at) >= new Date(new Date().toISOString().split('T')[0])
  );

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto" style={{ direction: 'rtl' }}>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">יומן פגישות וזימונים</h1>
          <p className="text-slate-500 mt-1 text-sm">ניהול זמנים, ייעוץ והגדרת תזכורות אוטומטיות</p>
        </div>
        <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              viewMode === 'list' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <List className="w-4 h-4" />
            רשימה
          </button>
          <button
            onClick={() => setViewMode('calendar')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              viewMode === 'calendar' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            לוח שנה
          </button>
        </div>
      </div>

      {viewMode === 'calendar' ? (
        <CalendarView
          appointments={calendarEvents}
          onDateClick={handleCalendarDateClick}
          onEventClick={handleCalendarEventClick}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* טופס זימון */}
          <div className="lg:col-span-1">
            <form onSubmit={handleCreateAppointment} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Plus className="w-5 h-5 text-sky-600" />
                קביעת תור חדש
              </h2>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  <User className="inline w-3.5 h-3.5 ml-1" />
                  איש קשר
                </label>
                <select
                  value={selectedContact}
                  onChange={e => setSelectedContact(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                  required
                >
                  <option value="">בחר איש קשר...</option>
                  {contacts.map(c => (
                    <option key={c.id} value={c.id}>{c.name} — {c.phone}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">
                    <CalendarIcon className="inline w-3.5 h-3.5 ml-1" />
                    תאריך
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">
                    <Clock className="inline w-3.5 h-3.5 ml-1" />
                    שעה
                  </label>
                  <input
                    type="time"
                    value={time}
                    onChange={e => setTime(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-2">סוג פגישה</label>
                <div className="space-y-2">
                  {APPOINTMENT_TYPES.map(t => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setAppType(t.label)}
                      className={`w-full flex items-center justify-between p-3 rounded-xl border text-sm transition-all ${
                        appType === t.label
                          ? 'border-sky-500 bg-sky-50 text-sky-700'
                          : 'border-slate-200 hover:border-slate-300 text-slate-700'
                      }`}
                    >
                      <span className="font-medium">{t.label}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-md ${t.color}`}>{t.duration}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  <FileText className="inline w-3.5 h-3.5 ml-1" />
                  הערות
                </label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={3}
                  placeholder="הוסף הערות לפגישה..."
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-2">שליחת תזכורות</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                    <input type="checkbox" checked={sendWa} onChange={e => setSendWa(e.target.checked)} className="rounded text-sky-600 w-4 h-4" />
                    <MessageCircle className="w-4 h-4 text-emerald-500" />
                    <span className="text-sm text-slate-700">תזכורת וואטסאפ</span>
                    {sendWa && <Check className="w-4 h-4 text-emerald-500 mr-auto" />}
                  </label>
                  <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                    <input type="checkbox" checked={sendSms} onChange={e => setSendSms(e.target.checked)} className="rounded text-sky-600 w-4 h-4" />
                    <Smartphone className="w-4 h-4 text-blue-500" />
                    <span className="text-sm text-slate-700">תזכורת SMS</span>
                    {sendSms && <Check className="w-4 h-4 text-emerald-500 mr-auto" />}
                  </label>
                  <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                    <input type="checkbox" checked={sendEmail} onChange={e => setSendEmail(e.target.checked)} className="rounded text-sky-600 w-4 h-4" />
                    <Mail className="w-4 h-4 text-sky-500" />
                    <span className="text-sm text-slate-700">זימון במייל</span>
                    {sendEmail && <Check className="w-4 h-4 text-emerald-500 mr-auto" />}
                  </label>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-sky-600 hover:bg-sky-700 disabled:bg-sky-400 text-white rounded-xl text-sm font-medium transition-colors shadow-sm"
              >
                {isSubmitting ? 'שומר...' : 'קבע תור'}
              </button>
            </form>
          </div>

          {/* רשימת פגישות */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <h2 className="text-lg font-bold text-slate-800 mb-5 flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-sky-600" />
                פגישות קרובות
                {!loading && (
                  <span className="mr-auto text-xs font-normal text-slate-400 bg-slate-100 px-2.5 py-1 rounded-lg">
                    {upcomingAppointments.length} פגישות
                  </span>
                )}
              </h2>

              {loading ? (
                <div className="flex justify-center py-12">
                  <div className="w-7 h-7 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : upcomingAppointments.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <CalendarIcon className="w-6 h-6 text-slate-300" />
                  </div>
                  <p className="text-slate-400 text-sm">אין פגישות קרובות</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {upcomingAppointments.map(appt => {
                    const dt = new Date(appt.scheduled_at);
                    const dateStr = dt.toLocaleDateString('he-IL', { weekday: 'short', day: 'numeric', month: 'short' });
                    const timeStr = dt.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
                    const typeInfo = APPOINTMENT_TYPES.find(t => t.label === appt.appointment_type);

                    return (
                      <div key={appt.id} className="flex items-start gap-4 p-4 rounded-xl border border-slate-100 hover:border-slate-200 hover:shadow-sm transition-all">
                        <div className="flex flex-col items-center justify-center w-14 h-14 bg-sky-50 rounded-xl border border-sky-100 flex-shrink-0">
                          <span className="text-xs font-bold text-sky-700">{timeStr}</span>
                          <span className="text-xs text-sky-500 mt-0.5">{dateStr}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-semibold text-slate-800 text-sm">{appt.contacts?.name || 'לא ידוע'}</p>
                              {appt.appointment_type && (
                                <span className={`inline-block text-xs px-2 py-0.5 rounded-md mt-1 ${typeInfo?.color || 'bg-slate-100 text-slate-600'}`}>
                                  {appt.appointment_type}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              {appt.status === 'scheduled' && (
                                <button
                                  onClick={() => updateStatus(appt.id, 'completed')}
                                  className="p-1.5 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors"
                                  title="סמן כהושלם"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                onClick={() => updateStatus(appt.id, 'cancelled')}
                                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                title="בטל פגישה"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          {appt.notes && (
                            <p className="mt-1.5 text-xs text-slate-400 bg-slate-50 rounded-lg px-2.5 py-1.5">{appt.notes}</p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            {appt.send_whatsapp_reminder && (
                              <span className="flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                                <MessageCircle className="w-3 h-3" /> WA
                              </span>
                            )}
                            {appt.send_sms_reminder && (
                              <span className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                                <Smartphone className="w-3 h-3" /> SMS
                              </span>
                            )}
                            {appt.send_email_reminder && (
                              <span className="flex items-center gap-1 text-xs text-sky-600 bg-sky-50 px-2 py-0.5 rounded-md">
                                <Mail className="w-3 h-3" /> מייל
                              </span>
                            )}
                            <span className={`mr-auto text-xs px-2 py-0.5 rounded-md ${
                              appt.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                              appt.status === 'cancelled' ? 'bg-red-100 text-red-600' :
                              'bg-sky-100 text-sky-700'
                            }`}>
                              {appt.status === 'completed' ? 'הושלם' : appt.status === 'cancelled' ? 'בוטל' : 'מתוכנן'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
