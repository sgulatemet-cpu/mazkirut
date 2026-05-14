import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import Layout from './components/Layout';
import AuthPage from './pages/Auth';
import Dashboard from './pages/Dashboard';
import ContactsPage from './pages/Contacts';
import AppointmentsPage from './pages/Appointments';
import RemindersPage from './pages/Reminders';

type Page = 'dashboard' | 'contacts' | 'appointments' | 'reminders';

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState<Page>('dashboard');
  const [preselectContactId, setPreselectContactId] = useState<string | undefined>();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  function handleNewAppointmentForContact(contactId: string) {
    setPreselectContactId(contactId);
    setPage('appointments');
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-slate-400 text-sm">טוען...</p>
        </div>
      </div>
    );
  }

  // Auth temporarily disabled
  // if (!session) {
  //   return <AuthPage onAuth={() => {}} />;
  // }

  return (
    <Layout currentPage={page} onNavigate={setPage}>
      {page === 'dashboard' && <Dashboard onNavigate={setPage} />}
      {page === 'contacts' && <ContactsPage onNewAppointment={handleNewAppointmentForContact} />}
      {page === 'appointments' && (
        <AppointmentsPage
          preselectedContactId={preselectContactId}
          onClearPreselect={() => setPreselectContactId(undefined)}
        />
      )}
      {page === 'reminders' && <RemindersPage />}
    </Layout>
  );
}
