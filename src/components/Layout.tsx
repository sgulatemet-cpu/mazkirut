import { ReactNode, useState } from 'react';
import { LayoutDashboard, Users, Calendar, Bell, Menu, X, BookOpen } from 'lucide-react';

type Page = 'dashboard' | 'contacts' | 'appointments' | 'reminders';

interface LayoutProps {
  children: ReactNode;
  currentPage: Page;
  onNavigate: (page: Page) => void;
}

const navItems = [
  { id: 'dashboard' as Page, label: 'לוח בקרה', icon: LayoutDashboard },
  { id: 'appointments' as Page, label: 'תורים', icon: Calendar },
  { id: 'contacts' as Page, label: 'אנשי קשר', icon: Users },
  { id: 'reminders' as Page, label: 'תזכורות', icon: Bell },
];

export default function Layout({ children, currentPage, onNavigate }: LayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-l border-slate-200 shadow-sm fixed top-0 bottom-0 right-0 z-30">
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-600 flex items-center justify-center shadow-md">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-frank text-slate-800 font-bold text-lg leading-tight">מזכירות הרב</h1>
              <p className="text-xs text-slate-400 font-light">ניהול פגישות ותורים</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                  active
                    ? 'bg-sky-50 text-sky-700 shadow-sm border border-sky-100'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                }`}
              >
                <Icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-sky-600' : ''}`} />
                {item.label}
                {active && <div className="mr-auto w-1.5 h-1.5 rounded-full bg-sky-500" />}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <div className="bg-amber-50 rounded-xl p-3 border border-amber-100">
            <p className="text-xs text-amber-700 font-medium">גרסה 1.0</p>
            <p className="text-xs text-amber-500 mt-0.5">מערכת ניהול פגישות</p>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <button onClick={() => setMobileOpen(true)} className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
          <Menu className="w-5 h-5 text-slate-600" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-sky-600 flex items-center justify-center">
            <BookOpen className="w-4 h-4 text-white" />
          </div>
          <span className="font-frank font-bold text-slate-800">מזכירות הרב</span>
        </div>
        <div className="w-9" />
      </div>

      {/* Mobile Sidebar */}
      {mobileOpen && (
        <>
          <div className="lg:hidden fixed inset-0 bg-black/40 z-40" onClick={() => setMobileOpen(false)} />
          <aside className="lg:hidden fixed top-0 right-0 bottom-0 w-64 bg-white z-50 shadow-2xl animate-slideIn">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-600 flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-white" />
                </div>
                <span className="font-frank font-bold text-slate-800">מזכירות הרב</span>
              </div>
              <button onClick={() => setMobileOpen(false)} className="p-1.5 rounded-lg hover:bg-slate-100">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>
            <nav className="p-4 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = currentPage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => { onNavigate(item.id); setMobileOpen(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                      active ? 'bg-sky-50 text-sky-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </aside>
        </>
      )}

      {/* Main Content */}
      <main className="flex-1 lg:mr-64 pt-0 lg:pt-0">
        <div className="lg:hidden h-14" />
        {children}
      </main>
    </div>
  );
}
