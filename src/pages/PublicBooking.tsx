import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  format, addMinutes, startOfHour, addHours,
  setHours, setMinutes, addDays, startOfDay,
} from 'date-fns';
import { he } from 'date-fns/locale';
import { CalendarCheck, Clock, User, Phone, Mail, CheckCircle, RefreshCw } from 'lucide-react';

const START_HOUR      = 8;
const END_HOUR        = 21;
const DURATION        = 60;   // minutes per slot
const STEP            = 30;   // minute increments when searching

interface SlotInfo {
  start: Date;
  end:   Date;
}

interface FormData {
  name:  string;
  phone: string;
  email: string;
}

export default function PublicBooking() {
  const [slot,    setSlot]    = useState<SlotInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [booked,  setBooked]  = useState(false);
  const [form,    setForm]    = useState<FormData>({ name: '', phone: '', email: '' });
  const [error,   setError]   = useState('');

  useEffect(() => { findNextSlot(); }, []);

  async function findNextSlot() {
    setLoading(true);
    setSlot(null);

    const now = new Date();

    const { data: existing } = await supabase
      .from('appointments')
      .select('scheduled_at, duration_minutes')
      .gte('scheduled_at', now.toISOString())
      .in('status', ['scheduled'])
      .order('scheduled_at', { ascending: true });

    const busyRanges: [Date, Date][] = (existing || []).map(r => [
      new Date(r.scheduled_at),
      addMinutes(new Date(r.scheduled_at), r.duration_minutes || DURATION),
    ]);

    // Start from next full hour, at least 5 minutes from now
    let candidate = startOfHour(addHours(now, 1));
    if (candidate.getHours() < START_HOUR) {
      candidate = setMinutes(setHours(candidate, START_HOUR), 0);
    }

    let found: SlotInfo | null = null;
    let guard = 0;

    while (!found && guard < 500) {
      guard++;

      const h = candidate.getHours();

      if (h >= END_HOUR) {
        const tomorrow = addDays(startOfDay(candidate), 1);
        candidate = setMinutes(setHours(tomorrow, START_HOUR), 0);
        continue;
      }

      const slotEnd = addMinutes(candidate, DURATION);

      const conflict = busyRanges.some(([s, e]) => candidate < e && slotEnd > s);

      if (!conflict) {
        found = { start: candidate, end: slotEnd };
      } else {
        candidate = addMinutes(candidate, STEP);
      }
    }

    setSlot(found);
    setLoading(false);
  }

  async function handleBook(e: React.FormEvent) {
    e.preventDefault();
    if (!slot) return;
    if (!form.name.trim() || !form.phone.trim()) {
      setError('יש למלא שם וטלפון');
      return;
    }

    setSaving(true);
    setError('');

    // First create (or find) a contact
    let contactId: string | null = null;

    const { data: existing } = await supabase
      .from('contacts')
      .select('id')
      .eq('phone', form.phone.trim())
      .maybeSingle();

    if (existing) {
      contactId = existing.id;
    } else {
      const { data: created } = await supabase
        .from('contacts')
        .insert([{ name: form.name.trim(), phone: form.phone.trim(), email: form.email.trim() }])
        .select('id')
        .maybeSingle();
      contactId = created?.id ?? null;
    }

    if (!contactId) {
      setError('שגיאה ביצירת פרטי הקשר');
      setSaving(false);
      return;
    }

    const { error: insertErr } = await supabase.from('appointments').insert([{
      contact_id:             contactId,
      scheduled_at:           slot.start.toISOString(),
      duration_minutes:       DURATION,
      appointment_type:       'ייעוץ אישי / ברכה',
      status:                 'scheduled',
      notes:                  form.email.trim() ? `אימייל: ${form.email.trim()}` : '',
      created_by:             'booking_page',
      send_whatsapp_reminder: false,
      send_sms_reminder:      false,
      send_email_reminder:    false,
    }]);

    setSaving(false);

    if (insertErr) {
      setError('שגיאה בשמירת הפגישה, אנא נסה שוב');
      return;
    }

    setBooked(true);
  }

  // ── Confirmation screen ────────────────────────────────────────────────────
  if (booked && slot) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center p-6" dir="rtl">
        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 max-w-md w-full p-10 text-center">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">הפגישה נקבעה!</h1>
          <p className="text-slate-500 mb-6">
            נשמח לראותך ב
            <span className="font-semibold text-slate-700"> {format(slot.start, 'EEEE', { locale: he })} </span>
            {format(slot.start, 'dd/MM/yyyy')} בשעה
            <span className="font-semibold text-slate-700"> {format(slot.start, 'HH:mm')}</span>
          </p>
          <div className="bg-slate-50 rounded-2xl p-4 text-sm text-slate-600 mb-8 border border-slate-100">
            <p className="font-medium text-slate-800 mb-1">{form.name}</p>
            <p dir="ltr">{form.phone}</p>
          </div>
          <button
            onClick={() => { setBooked(false); setForm({ name: '', phone: '', email: '' }); findNextSlot(); }}
            className="flex items-center gap-2 mx-auto text-sm text-sky-600 hover:text-sky-700 font-medium transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            קביעת פגישה נוספת
          </button>
        </div>
      </div>
    );
  }

  // ── Main booking screen ────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 py-12 px-4" dir="rtl">
      <div className="max-w-lg mx-auto">

        {/* Brand header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-sky-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <CalendarCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-800">תיאום פגישה</h1>
          <p className="text-slate-500 mt-2">קבע פגישה בקלות — אנו נמצא עבורך את הזמן הפנוי הקרוב ביותר</p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">

          {/* Slot display */}
          <div className="bg-sky-600 px-8 py-7 text-center">
            {loading ? (
              <div className="flex flex-col items-center gap-3 text-white">
                <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <p className="text-sm opacity-80">מחפש את הזמן הפנוי הקרוב...</p>
              </div>
            ) : slot ? (
              <div className="text-white">
                <p className="text-sm opacity-75 mb-1">המועד הפנוי הקרוב ביותר</p>
                <div className="flex items-center justify-center gap-3 mb-2">
                  <Clock className="w-5 h-5 opacity-80" />
                  <span className="text-4xl font-black tracking-tight">{format(slot.start, 'HH:mm')}</span>
                </div>
                <p className="text-lg font-semibold capitalize">
                  {format(slot.start, 'EEEE', { locale: he })},{' '}
                  {format(slot.start, 'dd MMMM yyyy', { locale: he })}
                </p>
                <p className="text-sm opacity-70 mt-1">משך הפגישה: {DURATION} דקות</p>
              </div>
            ) : (
              <p className="text-white opacity-80">לא נמצא מועד פנוי</p>
            )}
          </div>

          {/* Form */}
          {!loading && slot && (
            <form onSubmit={handleBook} className="p-8 space-y-5">
              <h2 className="text-lg font-bold text-slate-800 mb-1">פרטים אישיים</h2>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600">{error}</div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" /> שם מלא
                </label>
                <input
                  type="text" required value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="ישראל ישראלי"
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-slate-50"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5" /> טלפון
                  </label>
                  <input
                    type="tel" required value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    placeholder="050-0000000"
                    dir="ltr"
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5" /> אימייל (אופציונלי)
                  </label>
                  <input
                    type="email" value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="mail@example.com"
                    dir="ltr"
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-slate-50"
                  />
                </div>
              </div>

              <button
                type="submit" disabled={saving}
                className="w-full py-4 bg-sky-600 hover:bg-sky-700 disabled:bg-sky-400 text-white font-bold rounded-xl shadow-md transition-all text-sm mt-2"
              >
                {saving ? 'שומר...' : `אשר פגישה ב-${format(slot.start, 'HH:mm')}`}
              </button>

              <p className="text-xs text-center text-slate-400">
                בלחיצה על האישור תקבע פגישה במועד המוצג לעיל
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
