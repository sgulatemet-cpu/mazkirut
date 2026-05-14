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
  onSaved: () => void;
  onEventClick: (id: string) => void;
}

const STATUS_COLORS: Record<string, string> = {
  scheduled: '#0ea5e9',
  completed: '#10b981',
  cancelled: '#ef4444',
  no_show: '#f59e0b',
};

const APPOINTMENT_TYPES = [
  'ייעוץ אישי / ברכה',
  'שלום בית',
  'ייעוץ עסקי ומשפטי',
  'בדיקת תפילין ומזוזות',
];

type Step = 'contact' | 'details';

interface NewContactForm {
  name: string;
  phone: string;
  email: string;
}

interface MeetingForm {
  contact_id: string;
  contact_name: string;
  appointment_type: string;
  start: string;
  end: string;
  notes: string;
}

function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function CalendarView({ appointments, contacts, onSaved, onEventClick }: Props) {
  const calendarRef = useRef<FullCalendar>(null);

  // modal state
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>('contact');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // contact search
  const [search, setSearch] = useState('');
  const [showNewContact, setShowNewContact] = useState(false);
  const [newContact, setNewContact] = useState<NewContactForm>({ name: '', phone: '', email: '' });

  // meeting form
  const [meeting, setMeeting] = useState<MeetingForm>({
    contact_id: '',
    contact_name: '',
    appointment_type: APPOINTMENT_TYPES[0],
    start: '',
    end: '',
    notes: '',
  });

  const filteredContacts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter(c =>
      c.name.toLowerCase().includes(q) || (c.phone || '').replace(/\D/g, '').includes(q.replace(/\D/g, ''))
    );
  }, [contacts, search]);

  function openModal(dateStr: string) {
    const start = new Date(dateStr);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    setError('');
    setSearch('');
    setShowNewContact(false);
    setNewContact({ name: '', phone: '', email: '' });
    setStep('contact');
    setMeeting({
      contact_id: '',
      contact_name: '',
      appointment_type: APPOINTMENT_TYPES[0],
      start: toLocalInput(start.toISOString()),
      end: toLocalInput(end.toISOString()),
      notes: '',
    });
    setOpen(true);
  }

  function handleDateClick(arg: DateClickArg) {
    openModal(arg.date.toISOString());
  }

  function handleEventClick(arg: EventClickArg) {
    onEventClick(arg.event.id);
  }

  function selectContact(c: Contact) {
    setMeeting(m => ({ ...m, contact_id: c.id, contact_name: c.name }));
    setSearch('');
    setShowNewContact(false);
    setStep('details');
    setError('');
  }

  async function createAndSelectContact() {
    if (!newContact.name.trim()) { setError('יש להזין שם'); return; }
    setSaving(true);
    setError('');
    const { data, error: err } = await supabase.from('contacts').insert([{
      name: newContact.name.trim(),
      phone: newContact.phone.trim(),
      email: newContact.email.trim(),
    }]).select('id, name, phone').maybeSingle();
    setSaving(false);
    if (err || !data) { setError(err?.message || 'שגיאה ביצירת איש קשר'); return; }
    selectContact(data as Contact);
    onSaved(); // refresh contacts list in parent
  }

  async function handleSave() {
    if (!meeting.contact_id) { setError('יש לבחור איש קשר'); return; }
    if (!meeting.start) { setError('יש לבחור זמן התחלה'); return; }
    setSaving(true);
    setError('');
    const { error: err } = await supabase.from('appointments').insert([{
      contact_id: meeting.contact_id,
      scheduled_at: new Date(meeting.start).toISOString(),
      appointment_type: meeting.appointment_type,
      status: 'scheduled',
      notes: meeting.notes,
      send_whatsapp_reminder: false,
      send_sms_reminder: false,
      send_email_reminder: false,
    }]);
    setSaving(false);
    if (err) { setError(err.message); return; }
    setOpen(false);
    onSaved();
  }

  const events = appointments.map(a => ({
    ...a,
    color: a.extendedProps?.status ? (STATUS_COLORS[a.extendedProps.status] ?? '#0ea5e9') : '#0ea5e9',
    borderColor: 'transparent',
    textColor: '#fff',
  }));

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 h-full" dir="rtl">
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
        .fc .fc-button-active { background: #0ea5e9 !important; color: #fff !important; border-color: #0ea5e9 !important; }
        .fc .fc-today-button { background: #0ea5e9 !important; color: #fff !important; border-color: #0ea5e9 !important; }
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
        height="calc(100vh - 280px)"
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

      {open && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[1000] p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-100 overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                {step === 'details' && (
                  <button
                    onClick={() => { setStep('contact'); setError(''); }}
                    className="text-slate-400 hover:text-slate-600 transition-colors text-sm"
                  >
                    ← חזור
                  </button>
                )}
                <h2 className="text-base font-bold text-slate-800">
                  {step === 'contact' ? 'בחירת איש קשר' : 'פרטי הפגישה'}
                </h2>
              </div>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            {/* Step indicator */}
            <div className="flex px-6 pt-4 gap-2">
              {(['contact', 'details'] as Step[]).map((s, i) => (
                <div key={s} className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${step === s || (i === 0 && step === 'details') ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                    {i + 1}
                  </div>
                  <span className={`text-xs ${step === s ? 'text-sky-600 font-medium' : 'text-slate-400'}`}>
                    {s === 'contact' ? 'איש קשר' : 'פרטים'}
                  </span>
                  {i === 0 && <div className="w-6 h-px bg-slate-200 mx-1" />}
                </div>
              ))}
            </div>

            {error && (
              <div className="mx-6 mt-3 bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600">{error}</div>
            )}

            {/* ── STEP 1: Contact ── */}
            {step === 'contact' && (
              <div className="p-6 space-y-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={e => { setSearch(e.target.value); setShowNewContact(false); }}
                    placeholder="חפש לפי שם או מספר טלפון..."
                    className="w-full pr-10 pl-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                    autoFocus
                  />
                </div>

                {/* Contact list */}
                <div className="max-h-52 overflow-y-auto rounded-xl border border-slate-100 divide-y divide-slate-50">
                  {filteredContacts.length === 0 && !showNewContact && (
                    <p className="text-center text-sm text-slate-400 py-6">לא נמצאו אנשי קשר</p>
                  )}
                  {filteredContacts.map(c => (
                    <button
                      key={c.id}
                      onClick={() => selectContact(c)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-sky-50 transition-colors text-right"
                    >
                      <div className="w-8 h-8 rounded-full bg-sky-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-sky-700 text-xs font-bold">{c.name.charAt(0)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{c.name}</p>
                        {c.phone && <p className="text-xs text-slate-400 mt-0.5" dir="ltr">{c.phone}</p>}
                      </div>
                      <ChevronDown className="w-4 h-4 text-slate-300 -rotate-90 flex-shrink-0" />
                    </button>
                  ))}
                </div>

                {/* Add new contact toggle */}
                <button
                  onClick={() => setShowNewContact(v => !v)}
                  className="flex items-center gap-2 text-sm text-sky-600 hover:text-sky-700 font-medium transition-colors w-full justify-center py-2 border border-dashed border-sky-200 rounded-xl hover:bg-sky-50"
                >
                  <UserPlus className="w-4 h-4" />
                  {showNewContact ? 'ביטול הוספה' : 'הוסף איש קשר חדש'}
                </button>

                {/* New contact form */}
                {showNewContact && (
                  <div className="bg-slate-50 rounded-xl p-4 space-y-3 border border-slate-100">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">איש קשר חדש</p>
                    <input
                      type="text"
                      placeholder="שם מלא *"
                      value={newContact.name}
                      onChange={e => setNewContact(n => ({ ...n, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                    />
                    <input
                      type="tel"
                      placeholder="מספר טלפון"
                      value={newContact.phone}
                      onChange={e => setNewContact(n => ({ ...n, phone: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                      dir="ltr"
                    />
                    <input
                      type="email"
                      placeholder="אימייל (אופציונלי)"
                      value={newContact.email}
                      onChange={e => setNewContact(n => ({ ...n, email: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                      dir="ltr"
                    />
                    <button
                      onClick={createAndSelectContact}
                      disabled={saving}
                      className="w-full py-2 bg-sky-600 hover:bg-sky-700 disabled:opacity-60 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      {saving ? 'שומר...' : 'צור איש קשר והמשך'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ── STEP 2: Details ── */}
            {step === 'details' && (
              <div className="p-6 space-y-4">
                {/* Selected contact badge */}
                <div className="flex items-center gap-3 bg-sky-50 border border-sky-100 rounded-xl px-4 py-3">
                  <div className="w-8 h-8 rounded-full bg-sky-200 flex items-center justify-center flex-shrink-0">
                    <span className="text-sky-800 text-xs font-bold">{meeting.contact_name.charAt(0)}</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-sky-900">{meeting.contact_name}</p>
                    <p className="text-xs text-sky-500">איש קשר נבחר</p>
                  </div>
                  <button
                    onClick={() => { setStep('contact'); setError(''); }}
                    className="text-xs text-sky-500 hover:text-sky-700 underline"
                  >
                    שנה
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">סוג פגישה</label>
                  <select
                    value={meeting.appointment_type}
                    onChange={e => setMeeting(m => ({ ...m, appointment_type: e.target.value }))}
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                  >
                    {APPOINTMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">זמן התחלה</label>
                    <input
                      type="datetime-local"
                      value={meeting.start}
                      onChange={e => setMeeting(m => ({ ...m, start: e.target.value }))}
                      className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">זמן סיום</label>
                    <input
                      type="datetime-local"
                      value={meeting.end}
                      onChange={e => setMeeting(m => ({ ...m, end: e.target.value }))}
                      className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                      dir="ltr"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">הערות</label>
                  <textarea
                    value={meeting.notes}
                    onChange={e => setMeeting(m => ({ ...m, notes: e.target.value }))}
                    rows={2}
                    placeholder="הוסף הערות לפגישה..."
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
                  />
                </div>
              </div>
            )}

            {/* Footer */}
            {step === 'details' && (
              <div className="px-6 pb-6 flex gap-3">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 py-2.5 bg-sky-600 hover:bg-sky-700 disabled:opacity-60 text-white rounded-xl text-sm font-medium transition-colors"
                >
                  {saving ? 'שומר...' : 'שמור ביומן'}
                </button>
                <button
                  onClick={() => setOpen(false)}
                  className="px-5 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                >
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


export default CalendarView