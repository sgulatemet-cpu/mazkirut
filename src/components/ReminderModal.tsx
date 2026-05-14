import { useState } from 'react';
import { X, MessageCircle, Mail, Phone, Send, ExternalLink, CheckCircle } from 'lucide-react';
import { supabase, Appointment } from '../lib/supabase';

interface Props {
  appointment: Appointment;
  onClose: () => void;
}

type ReminderType = 'whatsapp' | 'email' | 'phone';

function buildWhatsAppUrl(phone: string, message: string) {
  const clean = phone.replace(/\D/g, '');
  const intl = clean.startsWith('0') ? '972' + clean.slice(1) : clean;
  return `https://wa.me/${intl}?text=${encodeURIComponent(message)}`;
}

function buildEmailUrl(email: string, subject: string, body: string) {
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function buildDefaultMessage(type: ReminderType, appt: Appointment): string {
  const contact = appt.contact;
  const date = new Date(appt.scheduled_at).toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' });
  const time = new Date(appt.scheduled_at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
  const name = contact?.name || 'שלום';

  if (type === 'whatsapp' || type === 'phone') {
    return `שלום ${name},\n\nתזכורת לפגישה עם הרב:\n📅 ${date}\n🕐 שעה ${time}${appt.location ? `\n📍 ${appt.location}` : ''}\n\nנושא: ${appt.title}\n\nבהצלחה!`;
  }
  return `שלום ${name},\n\nזוהי תזכורת לפגישתכם עם הרב:\n\nתאריך: ${date}\nשעה: ${time}${appt.location ? `\nמיקום: ${appt.location}` : ''}\nנושא: ${appt.title}\n\nבברכה`;
}

export default function ReminderModal({ appointment, onClose }: Props) {
  const [type, setType] = useState<ReminderType>('whatsapp');
  const [message, setMessage] = useState(buildDefaultMessage('whatsapp', appointment));
  const [sent, setSent] = useState(false);
  const [saving, setSaving] = useState(false);

  function changeType(t: ReminderType) {
    setType(t);
    setMessage(buildDefaultMessage(t, appointment));
  }

  async function logReminder() {
    setSaving(true);
    await supabase.from('reminders').insert({
      appointment_id: appointment.id,
      contact_id: appointment.contact_id,
      reminder_type: type,
      status: 'sent',
      scheduled_for: new Date().toISOString(),
      sent_at: new Date().toISOString(),
      message_body: message,
    });
    setSaving(false);
    setSent(true);
  }

  const contact = appointment.contact;

  function handleSend() {
    if (type === 'whatsapp' && contact?.phone) {
      window.open(buildWhatsAppUrl(contact.phone, message), '_blank');
    } else if (type === 'email' && contact?.email) {
      const subject = `תזכורת פגישה: ${appointment.title}`;
      window.open(buildEmailUrl(contact.email, subject, message), '_blank');
    } else if (type === 'phone' && contact?.phone) {
      window.open(`tel:${contact.phone}`, '_blank');
    }
    logReminder();
  }

  if (sent) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 text-center animate-scaleIn">
          <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-7 h-7 text-emerald-600" />
          </div>
          <h3 className="font-frank font-bold text-slate-800 text-lg mb-2">התזכורת נשלחה!</h3>
          <p className="text-slate-500 text-sm mb-6">הפעולה נרשמה בהיסטוריית התזכורות</p>
          <button onClick={onClose} className="w-full bg-sky-600 hover:bg-sky-700 text-white py-2.5 rounded-xl text-sm font-medium transition-colors">
            סגור
          </button>
        </div>
      </div>
    );
  }

  const typeConfig = {
    whatsapp: { icon: MessageCircle, label: 'וואטסאפ', color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200', active: 'bg-emerald-600 text-white border-emerald-600' },
    email: { icon: Mail, label: 'אימייל', color: 'text-sky-600', bg: 'bg-sky-50 border-sky-200', active: 'bg-sky-600 text-white border-sky-600' },
    phone: { icon: Phone, label: 'טלפון', color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200', active: 'bg-amber-600 text-white border-amber-600' },
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-scaleIn">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div>
            <h2 className="font-frank font-bold text-slate-800 text-lg">שליחת תזכורת</h2>
            <p className="text-sm text-slate-400 mt-0.5">{contact?.name}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 transition-colors">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Type selector */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">שיטת שליחה</label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(typeConfig) as ReminderType[]).map(t => {
                const cfg = typeConfig[t];
                const Icon = cfg.icon;
                const isActive = type === t;
                const hasInfo = t === 'phone' || t === 'whatsapp' ? !!contact?.phone : !!contact?.email;
                return (
                  <button
                    key={t}
                    onClick={() => changeType(t)}
                    disabled={!hasInfo}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-sm font-medium transition-all ${
                      !hasInfo ? 'opacity-40 cursor-not-allowed bg-slate-50 border-slate-200 text-slate-400'
                      : isActive ? cfg.active : `border-slate-200 text-slate-600 hover:${cfg.bg}`
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {cfg.label}
                    {!hasInfo && <span className="text-xs opacity-70">אין פרטים</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Contact info */}
          {contact && (
            <div className="bg-slate-50 rounded-xl p-3 text-sm">
              <p className="text-slate-500">
                {(type === 'whatsapp' || type === 'phone') && contact.phone && (
                  <span>טלפון: <span dir="ltr">{contact.phone}</span></span>
                )}
                {type === 'email' && contact.email && (
                  <span>אימייל: <span dir="ltr">{contact.email}</span></span>
                )}
              </p>
            </div>
          )}

          {/* Message */}
          {type !== 'phone' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">הודעה</label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                rows={6}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
              />
            </div>
          )}

          {type === 'phone' && (
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-sm text-amber-700">
              לחץ "שלח תזכורת" כדי לחייג ל-{contact?.name}. הפגישה תירשם בהיסטוריה.
            </div>
          )}
        </div>

        <div className="p-6 pt-0 flex gap-3">
          <button
            onClick={handleSend}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-700 disabled:opacity-60 text-white py-2.5 rounded-xl text-sm font-medium transition-colors"
          >
            {type === 'phone' ? <Phone className="w-4 h-4" /> : <ExternalLink className="w-4 h-4" />}
            {type === 'phone' ? 'חייג ורשום תזכורת' : 'פתח ושלח'}
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
          >
            ביטול
          </button>
        </div>
      </div>
    </div>
  );
}
