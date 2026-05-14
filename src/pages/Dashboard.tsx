import { useEffect, useState } from 'react';
import { Calendar, Users, Clock, CheckCircle, AlertCircle, ArrowLeft, Bell } from 'lucide-react';
import { supabase, Appointment, Contact } from '../lib/supabase';

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

function statusLabel(s: string) {
  const map: Record<string, string> = {
    scheduled: 'מתוכנן', completed: 'הושלם', cancelled: 'בוטל', no_show: 'לא הגיע'
  };
  return map[s] || s;
}

function statusColor(s: string) {
  const map: Record<string, string> = {
    scheduled: 'bg-sky-100 text-sky-700',
    completed: 'bg-emerald-100 text-emerald-700',
    cancelled: 'bg-red-100 text-red-700',
    no_show: 'bg-orange-100 text-orange-700',
  };
  return map[s] || 'bg-slate-100 text-slate-600';
}

export default function Dashboard({ onNavigate }: DashboardProps) {
  const [upcoming, setUpcoming] = useState<Appointment[]>([]);
  const [stats, setStats] = useState({ total: 0, today: 0, contacts: 0, completed: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const now = new Date().toISOString();
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);

    const [upcomingRes, totalRes, todayRes, contactsRes, completedRes] = await Promise.all([
      supabase.from('appointments').select('*, contact:contacts(*)').gte('scheduled_at', now).eq('status', 'scheduled').order('scheduled_at').limit(8),
      supabase.from('appointments').select('id', { count: 'exact', head: true }),
      supabase.from('appointments').select('id', { count: 'exact', head: true }).gte('scheduled_at', todayStart.toISOString()).lte('scheduled_at', todayEnd.toISOString()),
      supabase.from('contacts').select('id', { count: 'exact', head: true }),
      supabase.from('appointments').select('id', { count: 'exact', head: true }).eq('status', 'completed'),
    ]);

    setUpcoming((upcomingRes.data || []) as Appointment[]);
    setStats({
      total: totalRes.count || 0,
      today: todayRes.count || 0,
      contacts: contactsRes.count || 0,
      completed: completedRes.count || 0,
    });
    setLoading(false);
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' });
  }

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
  }

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
    <div className="p-6 lg:p-8 max-w-7xl mx-auto animate-fadeIn">
      <div className="mb-8">
        <h1 className="text-2xl font-frank font-bold text-slate-800">שלום, הרב!</h1>
        <p className="text-slate-500 mt-1">
          {new Date().toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Calendar} label="סה״כ תורים" value={stats.total} color="text-sky-600" bg="bg-sky-50" />
        <StatCard icon={Clock} label="תורים היום" value={stats.today} color="text-amber-600" bg="bg-amber-50" />
        <StatCard icon={Users} label="אנשי קשר" value={stats.contacts} color="text-emerald-600" bg="bg-emerald-50" />
        <StatCard icon={CheckCircle} label="פגישות הושלמו" value={stats.completed} color="text-teal-600" bg="bg-teal-50" />
      </div>

      {/* Upcoming Appointments */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-slate-800 text-lg">תורים קרובים</h2>
            <p className="text-sm text-slate-400 mt-0.5">הפגישות המתוכננות הבאות</p>
          </div>
          <button
            onClick={() => onNavigate('appointments')}
            className="flex items-center gap-2 text-sm text-sky-600 hover:text-sky-700 font-medium transition-colors"
          >
            כל התורים
            <ArrowLeft className="w-4 h-4" />
          </button>
        </div>

        {upcoming.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-8 h-8 text-slate-300" />
            </div>
            <p className="text-slate-500 font-medium">אין תורים קרובים</p>
            <p className="text-slate-400 text-sm mt-1">לחץ כדי לקבוע תור חדש</p>
            <button
              onClick={() => onNavigate('appointments')}
              className="mt-4 px-5 py-2 bg-sky-600 text-white rounded-xl text-sm font-medium hover:bg-sky-700 transition-colors"
            >
              קבע תור חדש
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {upcoming.map((appt) => (
              <div key={appt.id} className="p-5 hover:bg-slate-50 transition-colors flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-sky-50 border border-sky-100 flex flex-col items-center justify-center flex-shrink-0">
                  <span className="text-xs font-semibold text-sky-700 leading-tight">
                    {new Date(appt.scheduled_at).getDate()}
                  </span>
                  <span className="text-xs text-sky-500">
                    {new Date(appt.scheduled_at).toLocaleDateString('he-IL', { month: 'short' })}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-800 truncate">{appt.title}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-sm text-slate-500">{appt.contact?.name}</span>
                    <span className="text-slate-300">•</span>
                    <span className="text-sm text-slate-400">{formatDate(appt.scheduled_at)} בשעה {formatTime(appt.scheduled_at)}</span>
                  </div>
                </div>
                <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${statusColor(appt.status)}`}>
                  {statusLabel(appt.status)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
