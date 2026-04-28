import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useState } from 'react';
import {
  Camera, LayoutDashboard, Video, Bell, Settings,
  LogOut, Menu, X,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const NAV_ITEMS = [
  { to: '/dashboard',  label: 'Dashboard',  Icon: LayoutDashboard },
  { to: '/recordings', label: 'Recordings', Icon: Video },
  { to: '/alerts',     label: 'Alerts',     Icon: Bell },
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
      <aside className={`
        hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:w-64
        bg-slate-800 border-r border-slate-700
      `} style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-700">
          <div className="w-8 h-8 bg-hk-500 rounded-lg flex items-center justify-center">
            <Camera size={16} className="text-white" />
          </div>
          <span className="font-bold text-lg text-white">HK Camera</span>
        </div>

        {/* Nav */}
        <nav className="p-4 flex flex-col gap-1 flex-1">
          {NAV_ITEMS.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `
                flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors
                ${isActive
                  ? 'bg-hk-500/20 text-hk-400'
                  : 'text-slate-400 hover:bg-slate-700 hover:text-white'}
              `}
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User footer */}
        <div className="p-4 border-t border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-hk-500/30 flex items-center justify-center text-hk-400 font-semibold text-sm flex-shrink-0">
              {user?.name?.[0]?.toUpperCase() ?? 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.name}</p>
              <p className="text-xs text-slate-400 truncate">{user?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="w-11 h-11 flex items-center justify-center text-slate-400 hover:text-red-400 hover:bg-slate-700/50 rounded-lg transition-colors flex-shrink-0"
              title="Log out"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Mobile Sidebar Drawer ────────────────────────── */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-slate-800 border-r border-slate-700
        transform transition-transform duration-200 ease-in-out lg:hidden
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `} style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        {/* Logo + Close */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-700">
          <div className="w-8 h-8 bg-hk-500 rounded-lg flex items-center justify-center">
            <Camera size={16} className="text-white" />
          </div>
          <span className="font-bold text-lg text-white">HK Camera</span>
          <button
            onClick={() => setSidebarOpen(false)}
            className="w-11 h-11 ml-auto flex items-center justify-center text-slate-400 hover:text-white rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* User Info */}
        <div className="px-6 py-4 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-hk-500/30 flex items-center justify-center text-hk-400 font-semibold">
              {user?.name?.[0]?.toUpperCase() ?? 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.name}</p>
              <p className="text-xs text-slate-400 truncate">{user?.email}</p>
            </div>
          </div>
        </div>

        {/* Logout Button */}
        <div className="px-4 py-4 border-b border-slate-700">
          <button
            onClick={() => {
              setSidebarOpen(false);
              handleLogout();
            }}
            className="w-full flex items-center gap-2 px-4 py-3 bg-slate-700/50 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors font-medium text-sm"
          >
            <LogOut size={16} />
            Log Out
          </button>
        </div>
      </aside>

      {/* ── Overlay (mobile sidebar) ──────────────────────── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Main content ──────────────────────────────────── */}
      <div className={`flex-1 flex flex-col min-w-0 overflow-hidden ${!isViewer ? 'lg:ml-64' : ''}`} style={!isViewer ? { paddingTop: 'clamp(0.5rem, 2vw, 3rem)' } : {}}>
        {/* Mobile header (< lg) */}
        {!isViewer && (
          <header className="lg:hidden flex items-center gap-3 px-3 sm:px-4 py-2 bg-slate-800 border-b border-slate-700">
            <button
              onClick={() => setSidebarOpen(true)}
              className="w-11 h-11 flex items-center justify-center text-slate-400 hover:text-white rounded-lg transition-colors"
            >
              <Menu size={20} />
            </button>
            <div className="flex items-center gap-2">
              <Camera size={18} className="text-hk-500" />
              <span className="font-semibold text-white">HK Camera</span>
            </div>
          </header>
        )}

        {/* Main content area */}
        <main
          className={`flex-1 ${!isViewer ? 'overflow-y-auto' : 'overflow-hidden'} ${!isViewer ? 'px-2 sm:px-3 md:px-4' : ''}`}
          style={!isViewer ? {
            paddingBottom: 'calc(3.5rem + env(safe-area-inset-bottom) + 0.5rem)'
          } : {}}
        >
          <Outlet />
        </main>
      </div>

{/* ── Mobile Bottom Tab Bar (Adaptive) ──────────────── */}
      <nav className={`
        fixed bottom-0 left-0 right-0 z-40 lg:hidden
        bg-slate-800/95 backdrop-blur-md border-t border-slate-700/60
      `} style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="flex h-14">
          {NAV_ITEMS.map(({ to, label, Icon }) => {
            const isActive = location.pathname.startsWith(to);
            return (
              <NavLink
                key={to}
                to={to}
                className="flex-1 flex flex-col items-center justify-center gap-1 transition-colors min-w-0"
              >
                <Icon
                  size={22}
                  className={isActive ? 'text-hk-400' : 'text-slate-500'}
                />
                <span
                  className={`font-medium text-center break-words text-[11px] ${isActive ? 'text-hk-400' : 'text-slate-500'}`}
                >
                  {label}
                </span>
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
