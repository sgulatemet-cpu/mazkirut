import { useEffect, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import heLocale from '@fullcalendar/core/locales/he';
import type { DateClickArg } from '@fullcalendar/interaction';
import type { EventClickArg } from '@fullcalendar/core';

interface CalendarAppointment {
  id: string;
  title: string;
  start: string;
  end?: string;
  color?: string;
  extendedProps?: {
    status: string;
    contactName: string;
    appointmentType: string;
    notes: string;
  };
}

interface Props {
  appointments: CalendarAppointment[];
  onDateClick: (dateStr: string) => void;
  onEventClick: (id: string) => void;
}

const STATUS_COLORS: Record<string, string> = {
  scheduled: '#0ea5e9',
  completed: '#10b981',
  cancelled: '#ef4444',
  no_show: '#f59e0b',
};

export default function CalendarView({ appointments, onDateClick, onEventClick }: Props) {
  const calendarRef = useRef<FullCalendar>(null);

  useEffect(() => {
    // force re-render when appointments change
    calendarRef.current?.getApi().refetchEvents();
  }, [appointments]);

  function handleDateClick(arg: DateClickArg) {
    onDateClick(arg.dateStr);
  }

  function handleEventClick(arg: EventClickArg) {
    onEventClick(arg.event.id);
  }

  const events = appointments.map(a => ({
    ...a,
    color: a.extendedProps?.status ? STATUS_COLORS[a.extendedProps.status] ?? '#0ea5e9' : '#0ea5e9',
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
        .fc-scrollgrid { border-radius: 0.5rem; overflow: hidden; }
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
        buttonText={{
          today: 'היום',
          month: 'חודש',
          week: 'שבוע',
          day: 'יום',
        }}
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
  );
}
