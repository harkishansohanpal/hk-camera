import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useState } from 'react';
import {
  Camera, LayoutDashboard, Video, Bell, Settings, CreditCard,
  LogOut, Menu, X,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const NAV_ITEMS = [
  { to: '/dashboard',  label: 'Dashboard',  Icon: LayoutDashboard },
  { to: '/recordings', label: 'Recordings', Icon: Video },
  { to: '/alerts',     label: 'Alerts',     Icon: Bell },
  { to: '/billing',    label: 'Billing',    Icon: CreditCard },
  { to: '/settings',   label: 'Settings',   Icon: Settings },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isViewer = location.pathname.startsWith('/viewer');

  async function handleLogout() {
    await logout();
    toast.success('Logged out');
    navigate('/login');
  }

  return (
    <div className="w-full h-full flex bg-slate-900 overflow-hidden" style={{ height: '100dvh' }}>
      {/* ── Desktop Sidebar (lg+) ────────────────────────── */}
      <aside className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:w-68 bg-slate-800/80 border-r border-slate-700/30 backdrop-blur-xl safe-top">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-700/30">
          <div className="w-8 h-8 bg-hk-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <Camera size={16} className="text-white" />
          </div>
          <span className="font-semibold text-base text-white tracking-tight">HK Camera</span>
        </div>

        <nav data-tour="tour-nav" className="p-2 flex flex-col gap-0.5 flex-1">
          {NAV_ITEMS.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `
                flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                ${isActive
                  ? 'bg-hk-500/15 text-hk-400'
                  : 'text-slate-400 hover:bg-slate-700/40 hover:text-white active:bg-slate-700/60'
                }
              `}
            >
              <Icon size={18} className="flex-shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-slate-700/30">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-400 hover:text-red-400 hover:bg-red-500/5 transition-colors"
          >
            <LogOut size={18} />
            Log Out
          </button>
        </div>
      </aside>

      {/* ── Mobile Sidebar Drawer ────────────────────────── */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-72 bg-slate-800/95 border-r border-slate-700/30 backdrop-blur-xl
        transform transition-transform duration-200 ease-in-out lg:hidden safe-top
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/30">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-hk-500 rounded-lg flex items-center justify-center">
              <Camera size={16} className="text-white" />
            </div>
            <span className="font-semibold text-base text-white">HK Camera</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-white rounded-xl transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="p-2 flex flex-col gap-0.5 mt-2">
          {NAV_ITEMS.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => `
                flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200
                ${isActive ? 'bg-hk-500/15 text-hk-400' : 'text-slate-400 hover:bg-slate-700/40 hover:text-white'}
              `}
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 mt-auto border-t border-slate-700/30">
          <div className="flex items-center gap-3 px-3 py-3 mb-2">
            <div className="w-9 h-9 rounded-full bg-hk-500/20 flex items-center justify-center text-hk-400 font-semibold text-sm flex-shrink-0">
              {user?.name?.[0]?.toUpperCase() ?? 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.name}</p>
              <p className="text-xs text-slate-500 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={() => { setSidebarOpen(false); handleLogout(); }}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm text-slate-400 hover:text-red-400 hover:bg-red-500/5 transition-colors"
          >
            <LogOut size={18} />
            Log Out
          </button>
        </div>
      </aside>

      {/* ── Overlay (mobile sidebar) ──────────────────────── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Main content area ────────────────────────────── */}
      <div className={`flex-1 flex flex-col min-w-0 overflow-hidden ${!isViewer ? 'lg:ml-68' : ''}`}>
        {/* Mobile header (< lg) */}
        {!isViewer && (
          <header className="lg:hidden flex items-center gap-2 px-3 py-1.5 bg-slate-800/80 border-b border-slate-700/30 safe-top" style={{ zIndex: 30 }}>
            <button
              onClick={() => setSidebarOpen(true)}
              className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-white rounded-xl transition-colors flex-shrink-0"
            >
              <Menu size={20} />
            </button>
            <div className="flex items-center gap-2">
              <Camera size={18} className="text-hk-500 flex-shrink-0" />
              <span className="font-semibold text-white text-base">HK Camera</span>
            </div>
          </header>
        )}

        {/* Page content */}
        <main
          className={`flex-1 ${!isViewer ? 'overflow-y-auto' : 'overflow-hidden'}`}
          style={!isViewer ? {
            paddingBottom: 'calc(3.75rem + env(safe-area-inset-bottom))'
          } : {}}
        >
          <Outlet />
        </main>
      </div>

      {/* ── Mobile Bottom Tab Bar ────────────────────────── */}
      {!isViewer && (
        <nav data-tour="tour-nav" className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-slate-800/90 backdrop-blur-xl border-t border-slate-700/30"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <div className="flex h-14">
            {NAV_ITEMS.map(({ to, label, Icon }) => {
              const isActive = location.pathname === to || (to !== '/dashboard' && location.pathname.startsWith(to));
              return (
                <NavLink
                  key={to}
                  to={to}
                  className="flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors min-w-0"
                >
                  <Icon
                    size={20}
                    className={isActive ? 'text-hk-400' : 'text-slate-500'}
                  />
                  <span className={`text-[10px] leading-tight font-medium ${isActive ? 'text-hk-400' : 'text-slate-500'}`}>
                    {label}
                  </span>
                </NavLink>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
