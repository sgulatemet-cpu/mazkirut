import { useRef, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import heLocale from '@fullcalendar/core/locales/he';
import type { DateClickArg } from '@fullcalendar/interaction';
import type { EventClickArg } from '@fullcalendar/core';
import { X } from 'lucide-react';
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

interface Props {
  appointments: CalendarAppointment[];
  contacts: { id: string; name: string; phone: string }[];
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

interface NewMeeting {
  contact_id: string;
  appointment_type: string;
  start: string;
  end: string;
  notes: string;
}

export default function CalendarView({ appointments, contacts, onSaved, onEventClick }: Props) {
  const calendarRef = useRef<FullCalendar>(null);
  const [modal, setModal] = useState<NewMeeting | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function handleDateClick(arg: DateClickArg) {
    const start = new Date(arg.date);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    setError('');
    setModal({
      contact_id: '',
      appointment_type: APPOINTMENT_TYPES[0],
      start: toLocalInput(start.toISOString()),
      end: toLocalInput(end.toISOString()),
      notes: '',
    });
  }

  function handleEventClick(arg: EventClickArg) {
    onEventClick(arg.event.id);
  }

  function toLocalInput(iso: string) {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  async function handleSave() {
    if (!modal) return;
    if (!modal.contact_id) { setError('יש לבחור איש קשר'); return; }
    if (!modal.start) { setError('יש לבחור זמן התחלה'); return; }

    setSaving(true);
    setError('');

    const { error: err } = await supabase.from('appointments').insert([{
      contact_id: modal.contact_id,
      scheduled_at: new Date(modal.start).toISOString(),
      appointment_type: modal.appointment_type,
      status: 'scheduled',
      notes: modal.notes,
      send_whatsapp_reminder: false,
      send_sms_reminder: false,
      send_email_reminder: false,
    }]);

    setSaving(false);
    if (err) { setError(err.message); return; }
    setModal(null);
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
          background: #f1f5f9 !important;
          border: 1px solid #e2e8f0 !important;
          color: #475569 !important;
          border-radius: 0.5rem !important;
          font-size: 0.8rem !important;
          padding: 0.3rem 0.75rem !important;
          box-shadow: none !important;
        }
        .fc .fc-button:hover { background: #e2e8f0 !important; }
        .fc .fc-button-primary:not(.fc-button-active):focus { box-shadow: none !important; }
        .fc .fc-button-active {
          background: #0ea5e9 !important;
          color: #fff !important;
          border-color: #0ea5e9 !important;
        }
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
        headerToolbar={{
          right: 'prev,next today',
          center: 'title',
          left: 'dayGridMonth,timeGridWeek,timeGridDay',
        }}
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

      {modal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[1000] p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-800">קביעת פגישה חדשה</h2>
              <button onClick={() => setModal(null)} className="p-2 rounded-xl hover:bg-slate-100 transition-colors">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600">{error}</div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">איש קשר *</label>
                <select
                  value={modal.contact_id}
                  onChange={e => setModal(m => m ? { ...m, contact_id: e.target.value } : m)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                >
                  <option value="">בחר איש קשר...</option>
                  {contacts.map(c => (
                    <option key={c.id} value={c.id}>{c.name}{c.phone ? ` — ${c.phone}` : ''}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">סוג פגישה</label>
                <select
                  value={modal.appointment_type}
                  onChange={e => setModal(m => m ? { ...m, appointment_type: e.target.value } : m)}
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
                    value={modal.start}
                    onChange={e => setModal(m => m ? { ...m, start: e.target.value } : m)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">זמן סיום</label>
                  <input
                    type="datetime-local"
                    value={modal.end}
                    onChange={e => setModal(m => m ? { ...m, end: e.target.value } : m)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                    dir="ltr"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">הערות</label>
                <textarea
                  value={modal.notes}
                  onChange={e => setModal(m => m ? { ...m, notes: e.target.value } : m)}
                  rows={2}
                  placeholder="הוסף הערות לפגישה..."
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
                />
              </div>
            </div>

            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-2.5 bg-sky-600 hover:bg-sky-700 disabled:opacity-60 text-white rounded-xl text-sm font-medium transition-colors"
              >
                {saving ? 'שומר...' : 'שמור ביומן'}
              </button>
              <button
                onClick={() => setModal(null)}
                className="px-5 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
