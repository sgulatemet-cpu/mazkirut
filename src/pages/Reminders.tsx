import { useEffect, useState } from 'react';
import { MessageCircle, Mail, Phone, Clock, CheckCircle, XCircle, Filter, ChevronDown } from 'lucide-react';
import { supabase, Reminder } from '../lib/supabase';

const typeConfig: Record<string, { icon: React.ElementType; label: string; color: string; bg: string }> = {
  whatsapp: { icon: MessageCircle, label: 'וואטסאפ', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  email: { icon: Mail, label: 'אימייל', color: 'text-sky-600', bg: 'bg-sky-50' },
  phone: { icon: Phone, label: 'טלפון', color: 'text-amber-600', bg: 'bg-amber-50' },
};

const statusConfig: Record<string, { label: string; icon: React.ElementType; cls: string }> = {
  sent: { label: 'נשלח', icon: CheckCircle, cls: 'text-emerald-600 bg-emerald-50' },
  pending: { label: 'ממתין', icon: Clock, cls: 'text-amber-600 bg-amber-50' },
  failed: { label: 'נכשל', icon: XCircle, cls: 'text-red-600 bg-red-50' },
};

export default function RemindersPage() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [filterOpen, setFilterOpen] = useState(false);

  useEffect(() => { loadReminders(); }, []);

  async function loadReminders() {
    setLoading(true);
    const { data } = await supabase
      .from('reminders')
      .select('*, appointment:appointments(title, scheduled_at), contact:contacts(name, phone, email)')
      .order('created_at', { ascending: false });
    setReminders((data || []) as Reminder[]);
    setLoading(false);
  }

  const filtered = reminders.filter(r => {
    const matchType = typeFilter === 'all' || r.reminder_type === typeFilter;
    const matchStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchType && matchStatus;
  });

  function formatDateTime(iso: string) {
    return new Date(iso).toLocaleString('he-IL', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  const stats = {
    total: reminders.length,
    sent: reminders.filter(r => r.status === 'sent').length,
    whatsapp: reminders.filter(r => r.reminder_type === 'whatsapp').length,
    email: reminders.filter(r => r.reminder_type === 'email').length,
    phone: reminders.filter(r => r.reminder_type === 'phone').length,
  };

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto animate-fadeIn">
      <div className="mb-8">
        <h1 className="text-2xl font-frank font-bold text-slate-800">תזכורות</h1>
        <p className="text-slate-500 mt-1">היסטוריית כל התזכורות שנשלחו</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'סה״כ', value: stats.total, cls: 'bg-slate-50 text-slate-700' },
          { label: 'וואטסאפ', value: stats.whatsapp, cls: 'bg-emerald-50 text-emerald-700' },
          { label: 'אימייל', value: stats.email, cls: 'bg-sky-50 text-sky-700' },
          { label: 'טלפון', value: stats.phone, cls: 'bg-amber-50 text-amber-700' },
        ].map(s => (
          <div key={s.label} className={`rounded-2xl p-4 border border-white shadow-sm ${s.cls.split(' ')[0]}`}>
            <p className={`text-2xl font-bold ${s.cls.split(' ')[1]}`}>{s.value}</p>
            <p className="text-sm mt-0.5 opacity-70">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <div className="relative">
          <button
            onClick={() => setFilterOpen(f => !f)}
            className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white text-slate-600 hover:bg-slate-50 shadow-sm"
          >
            <Filter className="w-3.5 h-3.5" />
            {typeFilter === 'all' ? 'כל הסוגים' : typeConfig[typeFilter]?.label}
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          {filterOpen && (
            <div className="absolute right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-lg z-20 min-w-40">
              {[['all', 'כל הסוגים'], ...Object.entries(typeConfig).map(([k, v]) => [k, v.label])].map(([val, label]) => (
                <button key={val} onClick={() => { setTypeFilter(val); setFilterOpen(false); }}
                  className={`w-full text-right px-4 py-2.5 text-sm hover:bg-slate-50 ${typeFilter === val ? 'text-sky-600 font-medium' : 'text-slate-700'}`}>
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-2">
          {['all', 'sent', 'pending', 'failed'].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-2 rounded-xl text-xs font-medium border transition-colors ${
                statusFilter === s ? 'bg-sky-600 text-white border-sky-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {s === 'all' ? 'הכל' : statusConfig[s]?.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-100">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <MessageCircle className="w-7 h-7 text-slate-300" />
          </div>
          <p className="text-slate-500 font-medium">אין תזכורות להצגה</p>
          <p className="text-slate-400 text-sm mt-1">תזכורות ישמרו כאן לאחר שישלחו מדף התורים</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(reminder => {
            const tc = typeConfig[reminder.reminder_type];
            const sc = statusConfig[reminder.status];
            const TypeIcon = tc?.icon || MessageCircle;
            const StatusIcon = sc?.icon || CheckCircle;
            return (
              <div key={reminder.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-xl ${tc?.bg} flex items-center justify-center flex-shrink-0`}>
                    <TypeIcon className={`w-5 h-5 ${tc?.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-slate-800">{reminder.contact?.name}</p>
                        <p className="text-sm text-slate-500 mt-0.5">{reminder.appointment?.title}</p>
                      </div>
                      <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${sc?.cls}`}>
                        <StatusIcon className="w-3 h-3" />
                        {sc?.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      <span className={`text-xs font-medium ${tc?.color}`}>{tc?.label}</span>
                      <span className="text-xs text-slate-400">
                        {reminder.sent_at ? formatDateTime(reminder.sent_at) : formatDateTime(reminder.created_at)}
                      </span>
                      {reminder.appointment?.scheduled_at && (
                        <>
                          <span className="text-slate-300">•</span>
                          <span className="text-xs text-slate-400">
                            פגישה: {new Date(reminder.appointment.scheduled_at).toLocaleDateString('he-IL', { day: 'numeric', month: 'short' })}
                          </span>
                        </>
                      )}
                    </div>

                    {reminder.message_body && (
                      <details className="mt-2">
                        <summary className="text-xs text-slate-400 cursor-pointer hover:text-slate-600">הצג הודעה</summary>
                        <p className="text-xs text-slate-500 bg-slate-50 rounded-lg p-3 mt-1.5 whitespace-pre-wrap leading-relaxed">{reminder.message_body}</p>
                      </details>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
