import { useEffect, useState } from 'react';
import { Calendar, Users, Clock, CheckCircle, ArrowLeft } from 'lucide-react';
import { supabase, Appointment } from '../lib/supabase';
import CalendarView from '../components/CalendarView';

interface DashboardProps {
  onNavigate: (page: string) => void;
}

function StatCard({ icon: Icon, label, value, color, bg }: {
  icon: React.ElementType; label: string; value: number | string; color: string; bg: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
      </div>
      <p className="text-2xl font-bold text-slate-800">{value}</p>
      <p className="text-sm text-slate-500 mt-1">{label}</p>
    </div>
  );
}

export default function Dashboard({ onNavigate }: DashboardProps) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [contacts, setContacts] = useState<{ id: string; name: string; phone: string }[]>([]);
  const [stats, setStats] = useState({ total: 0, today: 0, contacts: 0, completed: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);

    const [apptRes, totalRes, todayRes, contactsRes, completedRes] = await Promise.all([
      supabase.from('appointments').select('*, contacts(name, phone)').order('scheduled_at'),
      supabase.from('appointments').select('id', { count: 'exact', head: true }),
      supabase.from('appointments').select('id', { count: 'exact', head: true }).gte('scheduled_at', todayStart.toISOString()).lte('scheduled_at', todayEnd.toISOString()),
      supabase.from('contacts').select('id, name, phone').order('name'),
      supabase.from('appointments').select('id', { count: 'exact', head: true }).eq('status', 'completed'),
    ]);

    setAppointments((apptRes.data || []) as Appointment[]);
    setContacts((contactsRes.data || []) as { id: string; name: string; phone: string }[]);
    setStats({
      total: totalRes.count || 0,
      today: todayRes.count || 0,
      contacts: contactsRes.count || 0,
      completed: completedRes.count || 0,
    });
    setLoading(false);
  }

  const calendarEvents = appointments.map(a => ({
    id: a.id,
    title: (a as any).contacts?.name || a.title || 'פגישה',
    start: a.scheduled_at,
    extendedProps: {
      status: a.status,
      contactName: (a as any).contacts?.name || '',
      appointmentType: (a as any).appointment_type || '',
      notes: a.notes || '',
    },
  }));

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-slate-500 text-sm">טוען נתונים...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto animate-fadeIn" style={{ direction: 'rtl' }}>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">שלום, הרב!</h1>
          <p className="text-slate-500 mt-1 text-sm">
            {new Date().toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <button
          onClick={() => onNavigate('appointments')}
          className="flex items-center gap-2 text-sm text-sky-600 hover:text-sky-700 font-medium transition-colors bg-sky-50 hover:bg-sky-100 px-4 py-2 rounded-xl"
        >
          <Calendar className="w-4 h-4" />
          לכל התורים
          <ArrowLeft className="w-4 h-4" />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Calendar} label="סה״כ תורים" value={stats.total} color="text-sky-600" bg="bg-sky-50" />
        <StatCard icon={Clock} label="תורים היום" value={stats.today} color="text-amber-600" bg="bg-amber-50" />
        <StatCard icon={Users} label="אנשי קשר" value={stats.contacts} color="text-emerald-600" bg="bg-emerald-50" />
        <StatCard icon={CheckCircle} label="פגישות הושלמו" value={stats.completed} color="text-teal-600" bg="bg-teal-50" />
      </div>

      {/* Calendar */}
      <CalendarView
        appointments={calendarEvents}
        contacts={contacts}
        onSaved={loadData}
        onEventClick={() => onNavigate('appointments')}
      />
    </div>
  );
}
