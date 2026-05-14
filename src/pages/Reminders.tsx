import { useState, useEffect } from 'react';
import { MessageCircle, Smartphone, Bell, CheckCircle2, Clock, Calendar as CalendarIcon, ExternalLink } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface AppointmentWithContact {
  id: string;
  scheduled_at: string;
  appointment_type: string;
  status: string;
  send_whatsapp_reminder: boolean;
  send_sms_reminder: boolean;
  contacts: { name: string; phone: string };
}

export default function RemindersPage() {
  const [upcomingAppointments, setUpcomingAppointments] = useState<AppointmentWithContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [sentReminders, setSentReminders] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchUpcomingReminders();
  }, []);

  async function fetchUpcomingReminders() {
    setLoading(true);
    try {
      // משיכת פגישות מ-עכשיו ועד סוף מחר (48 שעות) עבור תזכורות
      const now = new Date();
      const endOfTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2).toISOString();
      
      const { data, error } = await supabase
        .from('appointments')
        .select('id, scheduled_at, appointment_type, status, send_whatsapp_reminder, send_sms_reminder, contacts(name, phone)')
        .eq('status', 'scheduled') // רק פגישות שטרם בוצעו/בוטלו
        .gte('scheduled_at', now.toISOString())
        .lt('scheduled_at', endOfTomorrow)
        .order('scheduled_at', { ascending: true });

      if (error) throw error;
      setUpcomingAppointments(data || []);
    } catch (error) {
      console.error('Error fetching reminders:', error);
    } finally {
      setLoading(false);
    }
  }

  // פונקציה לייצור ושליחת הודעת WhatsApp מובנית
  const handleSendWhatsApp = (aptId: string, name: string, phone: string, dateStr: string, aptType: string) => {
    // פורמט תאריך ושעה יפים להודעה
    const aptDate = new Date(dateStr);
    const dateFormatted = aptDate.toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' });
    const timeFormatted = aptDate.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });

    // יצירת תוכן ההודעה
    const message = `שלום ${name}, ממרכז הייעוץ של הרב.\nרצינו להזכירך על פגישתך שנקבעה ליום ${dateFormatted} בשעה ${timeFormatted} בנושא ${aptType}.\n\nנשמח לראותך! אנא אשר/י הגעה בהודעה חוזרת.`;
    
    // ניקוי מספר הטלפון (הסרת מקפים ורווחים, והוספת קידומת בינלאומית אם חסר)
    let cleanPhone = phone.replace(/[-\s]/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '972' + cleanPhone.substring(1);
    }

    // פתיחת WhatsApp Web או האפליקציה עם ההודעה
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
    
    // סימון וי ירוק על המסך שההודעה נשלחה
    setSentReminders(prev => ({ ...prev, [`wa_${aptId}`]: true }));
  };

  // פונקציה לייצור ושליחת SMS (באמצעות אפליקציית המסרונים של הנייד)
  const handleSendSMS = (aptId: string, name: string, phone: string, dateStr: string) => {
    const aptDate = new Date(dateStr);
    const timeFormatted = aptDate.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
    
    const message = `תזכורת: פגישתך עם הרב תתקיים ב-${aptDate.toLocaleDateString('he-IL')} בשעה ${timeFormatted}. מרכז הייעוץ.`;
    
    // פתיחת חלון SMS מובנה במערכת
    window.open(`sms:${phone}?body=${encodeURIComponent(message)}`, '_blank');
    setSentReminders(prev => ({ ...prev, [`sms_${aptId}`]: true }));
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto dir-rtl" style={{ direction: 'rtl' }}>
      
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
          <Bell className="w-7 h-7 text-emerald-500" />
          מרכז תזכורות (48 שעות קרובות)
        </h1>
        <p className="text-slate-500 mt-2">שלח הודעות אישור ותזכורת לפגישות של היום ומחר בלחיצת כפתור (דרך WhatsApp Web או SMS).</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <span className="font-semibold text-slate-700">פגישות שדורשות תזכורת ({upcomingAppointments.length})</span>
          <button onClick={fetchUpcomingReminders} className="text-sm text-sky-600 hover:text-sky-700 font-medium">
            רענן רשימה
          </button>
        </div>

        {loading ? (
          <div className="p-12 flex justify-center">
            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : upcomingAppointments.length === 0 ? (
          <div className="p-16 text-center text-slate-500">
            <CheckCircle2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p>אין פגישות ב-48 השעות הקרובות שדורשות תזכורת.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {upcomingAppointments.map((apt) => {
              const aptDate = new Date(apt.scheduled_at);
              const isToday = aptDate.toDateString() === new Date().toDateString();
              
              // בדיקה אילו תזכורות התבקשו בעת קביעת הפגישה
              const needsWa = apt.send_whatsapp_reminder;
              const needsSms = apt.send_sms_reminder;
              
              // אם לא סומן כלום, אין טעם להציג כפתורים (או שנציג אופציונלי)
              if (!needsWa && !needsSms) return null;

              return (
                <div key={apt.id} className={`p-5 hover:bg-slate-50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 ${isToday ? 'bg-sky-50/20' : ''}`}>
                  
                  {/* פרטי הפגישה */}
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-16 h-16 bg-slate-100 rounded-xl flex flex-col items-center justify-center border border-slate-200">
                      <span className="text-xs font-bold text-slate-400 uppercase">{aptDate.toLocaleDateString('he-IL', { weekday: 'short' })}</span>
                      <span className="text-sm font-bold text-slate-700">{aptDate.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                        {apt.contacts?.name || 'פונה לא ידוע'}
                        {isToday && <span className="text-[10px] bg-sky-100 text-sky-700 px-2 py-0.5 rounded-full font-bold">היום</span>}
                      </h3>
                      <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
                        <span>{apt.contacts?.phone}</span>
                        <span className="text-slate-300">•</span>
                        <span>{apt.appointment_type}</span>
                      </div>
                    </div>
                  </div>

                  {/* כפתורי פעולה (שליחה) */}
                  <div className="flex flex-wrap gap-2">
                    {needsWa && (
                      <button 
                        onClick={() => handleSendWhatsApp(apt.id, apt.contacts?.name || '', apt.contacts?.phone || '', apt.scheduled_at, apt.appointment_type)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                          sentReminders[`wa_${apt.id}`] 
                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' 
                            : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm'
                        }`}
                      >
                        {sentReminders[`wa_${apt.id}`] ? <CheckCircle2 className="w-4 h-4" /> : <MessageCircle className="w-4 h-4" />}
                        {sentReminders[`wa_${apt.id}`] ? 'נשלח בוואטסאפ' : 'שלח וואטסאפ'}
                      </button>
                    )}

                    {needsSms && (
                      <button 
                        onClick={() => handleSendSMS(apt.id, apt.contacts?.name || '', apt.contacts?.phone || '', apt.scheduled_at)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                          sentReminders[`sms_${apt.id}`] 
                            ? 'bg-sky-50 text-sky-600 border border-sky-200' 
                            : 'bg-sky-100 hover:bg-sky-200 text-sky-700'
                        }`}
                      >
                        {sentReminders[`sms_${apt.id}`] ? <CheckCircle2 className="w-4 h-4" /> : <Smartphone className="w-4 h-4" />}
                        {sentReminders[`sms_${apt.id}`] ? 'נשלח SMS' : 'שלח SMS'}
                      </button>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}