import { useRef, useState, useMemo } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import heLocale from '@fullcalendar/core/locales/he';
import type { DateClickArg } from '@fullcalendar/interaction';
import type { EventClickArg } from '@fullcalendar/core';
import { X, Search, UserPlus, ChevronDown } from 'lucide-react';
import { supabase } from '../lib/supabase';

// ─── Secretary / system-user definitions ─────────────────────────────────────
export const SYSTEM_USERS: Record<string, { id: string; name: string; color: string }> = {
  sec_1:        { id: 'sec_1',        name: 'חיים (מזכיר 1)',              color: '#0ea5e9' },
  sec_2:        { id: 'sec_2',        name: 'דוד (מזכיר 2)',               color: '#10b981' },
  sec_3:        { id: 'sec_3',        name: 'אפרים (מזכיר 3)',             color: '#f59e0b' },
  booking_page: { id: 'booking_page', name: 'אתר הזמנות (אוטומטי)',        color: '#64748b' },
};

export const DEFAULT_USER_ID = 'sec_1';

// ─── Interfaces ───────────────────────────────────────────────────────────────
interface CalendarAppointment {
  id: string;
  title: string;
  start: string;
  end?: string;
  extendedProps?: {
    status: string;
    contactName: string;
    appointmentType: string;
    notes: string;
    createdBy?: string;
  };
}

interface Contact {
  id: string;
  name: string;
  phone: string;
}

interface Props {
  appointments: CalendarAppointment[];
  contacts: Contact[];
  currentUserId?: string;
  onSaved: () => void;
  onEventClick: (id: string) => void;
}

type Step = 'contact' | 'details';

interface NewContactForm { name: string; phone: string; email: string; }
interface MeetingForm {
  contact_id: string; contact_name: string;
  appointment_type: string; start: string; end: string; notes: string;
}

const APPOINTMENT_TYPES = [
  'ייעוץ אישי / ברכה', 'שלום בית', 'ייעוץ עסקי ומשפטי', 'בדיקת תפילין ומזוזות',
];

function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function CalendarView({ appointments, contacts, currentUserId = DEFAULT_USER_ID, onSaved, onEventClick }: Props) {
  const calendarRef = useRef<FullCalendar>(null);

  const [open, setOpen]       = useState(false);
  const [step, setStep]       = useState<Step>('contact');
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');

  const [search, setSearch]               = useState('');
  const [showNewContact, setShowNewContact] = useState(false);
  const [newContact, setNewContact]       = useState<NewContactForm>({ name: '', phone: '', email: '' });

  const [meeting, setMeeting] = useState<MeetingForm>({
    contact_id: '', contact_name: '',
    appointment_type: APPOINTMENT_TYPES[0],
    start: '', end: '', notes: '',
  });

  const filteredContacts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter(c =>
      c.name.toLowerCase().includes(q) ||
      (c.phone || '').replace(/\D/g, '').includes(q.replace(/\D/g, ''))
    );
  }, [contacts, search]);

  function openModal(dateStr: string) {
    const start = new Date(dateStr);
    const end   = new Date(start.getTime() + 60 * 60 * 1000);
    setError(''); setSearch(''); setShowNewContact(false);
    setNewContact({ name: '', phone: '', email: '' });
    setStep('contact');
    setMeeting({
      contact_id: '', contact_name: '',
      appointment_type: APPOINTMENT_TYPES[0],
      start: toLocalInput(start.toISOString()),
      end:   toLocalInput(end.toISOString()),
      notes: '',
    });
    setOpen(true);
  }

  function handleDateClick(arg: DateClickArg) { openModal(arg.date.toISOString()); }
  function handleEventClick(arg: EventClickArg) { onEventClick(arg.event.id); }

  function selectContact(c: Contact) {
    setMeeting(m => ({ ...m, contact_id: c.id, contact_name: c.name }));
    setSearch(''); setShowNewContact(false); setStep('details'); setError('');
  }

  async function createAndSelectContact() {
    if (!newContact.name.trim()) { setError('יש להזין שם'); return; }
    setSaving(true); setError('');
    const { data, error: err } = await supabase
      .from('contacts')
      .insert([{ name: newContact.name.trim(), phone: newContact.phone.trim(), email: newContact.email.trim() }])
      .select('id, name, phone').maybeSingle();
    setSaving(false);
    if (err || !data) { setError(err?.message || 'שגיאה ביצירת איש קשר'); return; }
    selectContact(data as Contact);
    onSaved();
  }

  async function handleSave() {
    if (!meeting.contact_id) { setError('יש לבחור איש קשר'); return; }
    if (!meeting.start)      { setError('יש לבחור זמן התחלה'); return; }
    setSaving(true); setError('');
    const { error: err } = await supabase.from('appointments').insert([{
      contact_id:             meeting.contact_id,
      scheduled_at:           new Date(meeting.start).toISOString(),
      appointment_type:       meeting.appointment_type,
      status:                 'scheduled',
      notes:                  meeting.notes,
      created_by:             currentUserId,
      send_whatsapp_reminder: false,
      send_sms_reminder:      false,
      send_email_reminder:    false,
    }]);
    setSaving(false);
    if (err) { setError(err.message); return; }
    setOpen(false); onSaved();
  }

  const activeUser = SYSTEM_USERS[currentUserId] ?? SYSTEM_USERS[DEFAULT_USER_ID];

  const events = appointments.map(a => {
    const createdBy = a.extendedProps?.createdBy;
    const color = createdBy && SYSTEM_USERS[createdBy]
      ? SYSTEM_USERS[createdBy].color
      : (a.extendedProps?.status === 'completed' ? '#10b981'
        : a.extendedProps?.status === 'cancelled' ? '#ef4444'
        : '#0ea5e9');
    return { ...a, color, borderColor: 'transparent', textColor: '#fff' };
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden" dir="rtl">

      {/* ── Color legend + user indicator ───────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-b border-slate-100 bg-slate-50">
        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
          <span>מקבע כעת:</span>
          <span
            className="px-2.5 py-0.5 rounded-full text-white text-xs font-semibold"
            style={{ backgroundColor: activeUser.color }}
          >
            {activeUser.name}
          </span>
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <span className="text-xs text-slate-400 font-medium">מקרא:</span>
          {Object.values(SYSTEM_USERS).map(u => (
            <div key={u.id} className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: u.color }} />
              <span className="text-xs text-slate-600">{u.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── FullCalendar ─────────────────────────────────────────────────────── */}
      <div className="p-4">
        <style>{`
          .fc { font-family: inherit; }
          .fc .fc-toolbar-title { font-size: 1.05rem; font-weight: 700; color: #1e293b; }
          .fc .fc-button {
            background: #f1f5f9 !important; border: 1px solid #e2e8f0 !important;
            color: #475569 !important; border-radius: 0.5rem !important;
            font-size: 0.8rem !important; padding: 0.3rem 0.75rem !important; box-shadow: none !important;
          }
          .fc .fc-button:hover { background: #e2e8f0 !important; }
          .fc .fc-button-primary:not(.fc-button-active):focus { box-shadow: none !important; }
          .fc .fc-button-active, .fc .fc-today-button {
            background: #0ea5e9 !important; color: #fff !important; border-color: #0ea5e9 !important;
          }
          .fc-timegrid-slot { height: 2.2rem !important; }
          .fc-event { border-radius: 6px !important; padding: 2px 5px !important; font-size: 0.78rem !important; }
          .fc-daygrid-event { border-radius: 5px !important; font-size: 0.78rem !important; }
          .fc-col-header-cell-cushion { font-size: 0.8rem; color: #64748b; font-weight: 600; }
          .fc-daygrid-day-number { font-size: 0.82rem; color: #475569; }
          .fc .fc-timegrid-now-indicator-line { border-color: #ef4444; }
          .fc-theme-standard td, .fc-theme-standard th { border-color: #f1f5f9; }
        `}</style>
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          locale={heLocale}
          direction="rtl"
          headerToolbar={{ right: 'prev,next today', center: 'title', left: 'dayGridMonth,timeGridWeek,timeGridDay' }}
          height="calc(100vh - 320px)"
          selectable
          editable={false}
          dateClick={handleDateClick}
          eventClick={handleEventClick}
          events={events}
          nowIndicator
          slotMinTime="07:00:00"
          slotMaxTime="22:00:00"
          allDaySlot={false}
          buttonText={{ today: 'היום', month: 'חודש', week: 'שבוע', day: 'יום' }}
          eventContent={arg => (
            <div className="truncate px-0.5">
              <span className="font-semibold">{arg.event.extendedProps.contactName || arg.event.title}</span>
              {arg.event.extendedProps.appointmentType && (
                <span className="opacity-80"> · {arg.event.extendedProps.appointmentType}</span>
              )}
            </div>
          )}
        />
      </div>

      {/* ── Modal ────────────────────────────────────────────────────────────── */}
      {open && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[1000] p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-100 overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                {step === 'details' && (
                  <button onClick={() => { setStep('contact'); setError(''); }} className="text-slate-400 hover:text-slate-600 text-sm">
                    ← חזור
                  </button>
                )}
                <h2 className="text-base font-bold text-slate-800">
                  {step === 'contact' ? 'בחירת איש קשר' : 'פרטי הפגישה'}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="hidden sm:block text-xs px-2.5 py-1 rounded-full text-white font-medium"
                  style={{ backgroundColor: activeUser.color }}
                >
                  {activeUser.name}
                </span>
                <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              </div>
            </div>

            {/* Step indicator */}
            <div className="flex px-6 pt-4 gap-2 items-center">
              {(['contact', 'details'] as Step[]).map((s, i) => (
                <div key={s} className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                    i === 0 || step === s ? 'text-white' : 'bg-slate-100 text-slate-400'
                  }`} style={i === 0 || step === s ? { backgroundColor: activeUser.color } : {}}>
                    {i + 1}
                  </div>
                  <span className={`text-xs ${step === s ? 'font-medium' : 'text-slate-400'}`}
                    style={step === s ? { color: activeUser.color } : {}}>
                    {s === 'contact' ? 'איש קשר' : 'פרטים'}
                  </span>
                  {i === 0 && <div className="w-6 h-px bg-slate-200 mx-1" />}
                </div>
              ))}
            </div>

            {error && (
              <div className="mx-6 mt-3 bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600">{error}</div>
            )}

            {/* ── Step 1: Contact ── */}
            {step === 'contact' && (
              <div className="p-6 space-y-4">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text" value={search}
                    onChange={e => { setSearch(e.target.value); setShowNewContact(false); }}
                    placeholder="חפש לפי שם או מספר טלפון..."
                    className="w-full pr-10 pl-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                    autoFocus
                  />
                </div>

                <div className="max-h-52 overflow-y-auto rounded-xl border border-slate-100 divide-y divide-slate-50">
                  {filteredContacts.length === 0 && !showNewContact && (
                    <p className="text-center text-sm text-slate-400 py-6">לא נמצאו אנשי קשר</p>
                  )}
                  {filteredContacts.map(c => (
                    <button key={c.id} onClick={() => selectContact(c)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-sky-50 transition-colors text-right">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold"
                        style={{ backgroundColor: activeUser.color }}>
                        {c.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{c.name}</p>
                        {c.phone && <p className="text-xs text-slate-400 mt-0.5" dir="ltr">{c.phone}</p>}
                      </div>
                      <ChevronDown className="w-4 h-4 text-slate-300 -rotate-90 flex-shrink-0" />
                    </button>
                  ))}
                </div>

                <button onClick={() => setShowNewContact(v => !v)}
                  className="flex items-center gap-2 text-sm font-medium transition-colors w-full justify-center py-2 border border-dashed rounded-xl hover:bg-sky-50"
                  style={{ color: activeUser.color, borderColor: activeUser.color + '55' }}>
                  <UserPlus className="w-4 h-4" />
                  {showNewContact ? 'ביטול הוספה' : 'הוסף איש קשר חדש'}
                </button>

                {showNewContact && (
                  <div className="bg-slate-50 rounded-xl p-4 space-y-3 border border-slate-100">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">איש קשר חדש</p>
                    <input type="text" placeholder="שם מלא *" value={newContact.name}
                      onChange={e => setNewContact(n => ({ ...n, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white" />
                    <input type="tel" placeholder="מספר טלפון" value={newContact.phone}
                      onChange={e => setNewContact(n => ({ ...n, phone: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white" dir="ltr" />
                    <input type="email" placeholder="אימייל (אופציונלי)" value={newContact.email}
                      onChange={e => setNewContact(n => ({ ...n, email: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white" dir="ltr" />
                    <button onClick={createAndSelectContact} disabled={saving}
                      className="w-full py-2 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-60"
                      style={{ backgroundColor: activeUser.color }}>
                      {saving ? 'שומר...' : 'צור איש קשר והמשך'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ── Step 2: Details ── */}
            {step === 'details' && (
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-3 rounded-xl px-4 py-3 border"
                  style={{ backgroundColor: activeUser.color + '18', borderColor: activeUser.color + '44' }}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold"
                    style={{ backgroundColor: activeUser.color }}>
                    {meeting.contact_name.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-800">{meeting.contact_name}</p>
                    <p className="text-xs text-slate-500">איש קשר נבחר</p>
                  </div>
                  <button onClick={() => { setStep('contact'); setError(''); }}
                    className="text-xs underline text-slate-500 hover:text-slate-700">שנה</button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">סוג פגישה</label>
                  <select value={meeting.appointment_type}
                    onChange={e => setMeeting(m => ({ ...m, appointment_type: e.target.value }))}
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white">
                    {APPOINTMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">זמן התחלה</label>
                    <input type="datetime-local" value={meeting.start} dir="ltr"
                      onChange={e => setMeeting(m => ({ ...m, start: e.target.value }))}
                      className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">זמן סיום</label>
                    <input type="datetime-local" value={meeting.end} dir="ltr"
                      onChange={e => setMeeting(m => ({ ...m, end: e.target.value }))}
                      className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">הערות</label>
                  <textarea value={meeting.notes} rows={2}
                    onChange={e => setMeeting(m => ({ ...m, notes: e.target.value }))}
                    placeholder="הוסף הערות לפגישה..."
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none" />
                </div>
              </div>
            )}

            {step === 'details' && (
              <div className="px-6 pb-6 flex gap-3">
                <button onClick={handleSave} disabled={saving}
                  className="flex-1 py-2.5 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-60"
                  style={{ backgroundColor: activeUser.color }}>
                  {saving ? 'שומר...' : 'שמור ביומן'}
                </button>
                <button onClick={() => setOpen(false)}
                  className="px-5 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                  ביטול
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
