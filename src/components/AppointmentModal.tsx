import { useState, useEffect } from 'react';
import { X, Calendar, Clock, User, FileText, MapPin, Link } from 'lucide-react';
import { supabase, Contact, Appointment } from '../lib/supabase';

interface Props {
  appointment?: Appointment | null;
  preselectedContactId?: string;
  onClose: () => void;
  onSaved: () => void;
}

function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function buildGoogleCalendarUrl(appt: { title: string; description: string; location: string; scheduled_at: string; duration_minutes: number }) {
  const start = new Date(appt.scheduled_at);
  const end = new Date(start.getTime() + appt.duration_minutes * 60000);
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: appt.title,
    details: appt.description,
    location: appt.location,
    dates: `${fmt(start)}/${fmt(end)}`,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export default function AppointmentModal({ appointment, preselectedContactId, onClose, onSaved }: Props) {
  const [form, setForm] = useState({
    contact_id: preselectedContactId || '',
    title: '',
    description: '',
    scheduled_at: '',
    duration_minutes: 30,
    location: '',
    notes: '',
    status: 'scheduled' as Appointment['status'],
  });
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [savedAppt, setSavedAppt] = useState<Appointment | null>(null);

  useEffect(() => {
    loadContacts();
    if (appointment) {
      setForm({
        contact_id: appointment.contact_id,
        title: appointment.title,
        description: appointment.description,
        scheduled_at: toLocalInput(appointment.scheduled_at),
        duration_minutes: appointment.duration_minutes,
        location: appointment.location,
        notes: appointment.notes,
        status: appointment.status,
      });
    }
  }, [appointment]);

  async function loadContacts() {
    const { data } = await supabase.from('contacts').select('id, name').order('name');
    setContacts(data || []);
  }

  function set(field: string, value: string | number) {
    setForm(f => ({ ...f, [field]: value }));
  }

  async function handleSave() {
    if (!form.contact_id) { setError('יש לבחור איש קשר'); return; }
    if (!form.title.trim()) { setError('כותרת היא שדה חובה'); return; }
    if (!form.scheduled_at) { setError('יש לבחור תאריך ושעה'); return; }
    setSaving(true); setError('');

    const data = {
      contact_id: form.contact_id,
      title: form.title.trim(),
      description: form.description.trim(),
      scheduled_at: new Date(form.scheduled_at).toISOString(),
      duration_minutes: Number(form.duration_minutes),
      location: form.location.trim(),
      notes: form.notes.trim(),
      status: form.status,
    };

    let res;
    if (appointment) {
      res = await supabase.from('appointments').update(data).eq('id', appointment.id).select().maybeSingle();
    } else {
      res = await supabase.from('appointments').insert(data).select().maybeSingle();
    }

    setSaving(false);
    if (res.error) { setError(res.error.message); return; }
    setSavedAppt(res.data as Appointment);
  }

  if (savedAppt) {
    const gcalUrl = buildGoogleCalendarUrl({
      title: savedAppt.title,
      description: savedAppt.description,
      location: savedAppt.location,
      scheduled_at: savedAppt.scheduled_at,
      duration_minutes: savedAppt.duration_minutes,
    });
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-scaleIn text-center">
          <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-7 h-7 text-emerald-600" />
          </div>
          <h3 className="font-frank font-bold text-slate-800 text-lg mb-2">
            {appointment ? 'התור עודכן!' : 'התור נקבע בהצלחה!'}
          </h3>
          <p className="text-slate-500 text-sm mb-6">
            {new Date(savedAppt.scheduled_at).toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            {' בשעה '}
            {new Date(savedAppt.scheduled_at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
          </p>
          <div className="flex flex-col gap-3">
            <a
              href={gcalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-sm font-medium transition-colors"
            >
              <Link className="w-4 h-4" />
              הוסף ליומן גוגל
            </a>
            <button
              onClick={onSaved}
              className="w-full py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              סגור
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col animate-scaleIn">
        <div className="flex items-center justify-between p-6 border-b border-slate-100 flex-shrink-0">
          <h2 className="font-frank font-bold text-slate-800 text-lg">
            {appointment ? 'עריכת תור' : 'קביעת תור חדש'}
          </h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 transition-colors">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto scrollbar-thin">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600">{error}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              <User className="w-3.5 h-3.5 inline ml-1 text-slate-400" />איש קשר *
            </label>
            <select
              value={form.contact_id}
              onChange={e => set('contact_id', e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
            >
              <option value="">בחר איש קשר...</option>
              {contacts.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              כותרת הפגישה *
            </label>
            <input
              value={form.title}
              onChange={e => set('title', e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              placeholder="שאלה בהלכה, ייעוץ..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                <Calendar className="w-3.5 h-3.5 inline ml-1 text-slate-400" />תאריך ושעה *
              </label>
              <input
                type="datetime-local"
                value={form.scheduled_at}
                onChange={e => set('scheduled_at', e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                dir="ltr"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                <Clock className="w-3.5 h-3.5 inline ml-1 text-slate-400" />משך (דקות)
              </label>
              <select
                value={form.duration_minutes}
                onChange={e => set('duration_minutes', Number(e.target.value))}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
              >
                {[15, 20, 30, 45, 60, 90, 120].map(m => (
                  <option key={m} value={m}>{m} דקות</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              <MapPin className="w-3.5 h-3.5 inline ml-1 text-slate-400" />מיקום
            </label>
            <input
              value={form.location}
              onChange={e => set('location', e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              placeholder="בית הכנסת, בית הרב..."
            />
          </div>

          {appointment && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">סטטוס</label>
              <select
                value={form.status}
                onChange={e => set('status', e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
              >
                <option value="scheduled">מתוכנן</option>
                <option value="completed">הושלם</option>
                <option value="cancelled">בוטל</option>
                <option value="no_show">לא הגיע</option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              <FileText className="w-3.5 h-3.5 inline ml-1 text-slate-400" />תיאור / הכנה
            </label>
            <textarea
              value={form.description}
              onChange={e => set('description', e.target.value)}
              rows={2}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
              placeholder="נושא הפגישה, שאלות להכנה..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">הערות פנימיות</label>
            <textarea
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              rows={2}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
              placeholder="הערות שיישארו בתיק..."
            />
          </div>
        </div>

        <div className="p-6 pt-0 flex gap-3 flex-shrink-0">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 bg-sky-600 hover:bg-sky-700 disabled:opacity-60 text-white py-2.5 rounded-xl text-sm font-medium transition-colors"
          >
            {saving ? 'שומר...' : appointment ? 'שמור שינויים' : 'קבע תור'}
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
