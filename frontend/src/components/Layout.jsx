import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useState } from 'react';
import {
  Camera, LayoutDashboard, Video, Bell, Settings, CreditCard,
  LogOut, Menu, X, ChevronRight,
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
    <div className="w-full h-full flex bg-ap-gray6 overflow-hidden" style={{ height: '100dvh' }}>
      {/* ── Desktop Sidebar (lg+) ────────────────────────── */}
      <aside className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:w-68 bg-white border-r border-ap-separator safe-top shadow-sm">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-ap-separator">
          <div className="w-8 h-8 bg-ap-blue rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
            <Camera size={16} className="text-white" />
          </div>
          <span className="font-bold text-base text-gray-900 tracking-tight">HK Camera</span>
        </div>

        <nav data-tour="tour-nav" className="py-2 flex flex-col gap-0.5 flex-1">
          {NAV_ITEMS.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `
                flex items-center gap-3 mx-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200
                ${isActive
                  ? 'bg-ap-blue/10 text-ap-blue'
                  : 'text-ap-gray hover:bg-ap-gray6 hover:text-gray-900'
                }
              `}
            >
              <Icon size={18} className="flex-shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-ap-separator">
          <div className="flex items-center gap-3 px-3 py-2 mb-1">
            <div className="w-9 h-9 rounded-full bg-ap-blue/10 flex items-center justify-center text-ap-blue font-bold text-sm flex-shrink-0">
              {user?.name?.[0]?.toUpperCase() ?? 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{user?.name}</p>
              <p className="text-xs text-ap-gray truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-ap-gray hover:text-ap-red hover:bg-ap-red/5 transition-colors"
          >
            <LogOut size={18} />
            Log Out
          </button>
        </div>
      </aside>

      {/* ── Mobile Sidebar ───────────────────────────────── */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-ap-separator shadow-apple-lg
        transform transition-transform duration-200 ease-in-out lg:hidden safe-top
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-ap-separator">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-ap-blue rounded-xl flex items-center justify-center shadow-sm">
              <Camera size={16} className="text-white" />
            </div>
            <span className="font-bold text-base text-gray-900">HK Camera</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="w-10 h-10 flex items-center justify-center text-ap-gray hover:text-gray-900 rounded-xl transition-colors">
            <X size={20} />
          </button>
        </div>

        <nav className="py-2 flex flex-col gap-0.5 mt-2">
          {NAV_ITEMS.map(({ to, label, Icon }) => (
            <NavLink key={to} to={to} onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => `
                flex items-center gap-3 mx-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all
                ${isActive ? 'bg-ap-blue/10 text-ap-blue' : 'text-ap-gray hover:bg-ap-gray6 hover:text-gray-900'}
              `}>
              <Icon size={18} /> {label}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 mt-auto border-t border-ap-separator">
          <div className="flex items-center gap-3 px-3 py-3 mb-2">
            <div className="w-9 h-9 rounded-full bg-ap-blue/10 flex items-center justify-center text-ap-blue font-bold text-sm flex-shrink-0">
              {user?.name?.[0]?.toUpperCase() ?? 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{user?.name}</p>
              <p className="text-xs text-ap-gray truncate">{user?.email}</p>
            </div>
          </div>
          <button onClick={() => { setSidebarOpen(false); handleLogout(); }}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm text-ap-gray hover:text-ap-red hover:bg-ap-red/5 transition-colors">
            <LogOut size={18} /> Log Out
          </button>
        </div>
      </aside>

      {sidebarOpen && <div className="fixed inset-0 z-40 bg-black/20 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* ── Main ──────────────────────────────────────────── */}
      <div className={`flex-1 flex flex-col min-w-0 overflow-hidden ${!isViewer ? 'lg:ml-68' : ''}`}>
        {!isViewer && (
          <header className="nav-bar lg:hidden flex items-center gap-2 px-3 py-1.5" style={{ zIndex: 30 }}>
            <button onClick={() => setSidebarOpen(true)} className="w-10 h-10 flex items-center justify-center text-ap-gray hover:text-gray-900 rounded-xl transition-colors flex-shrink-0">
              <Menu size={20} />
            </button>
            <div className="flex items-center gap-2">
              <Camera size={18} className="text-ap-blue flex-shrink-0" />
              <span className="font-bold text-gray-900 text-base">HK Camera</span>
            </div>
          </header>
        )}

        <main className={`flex-1 ${!isViewer ? 'overflow-y-auto' : 'overflow-hidden'}`}
          style={!isViewer ? { paddingBottom: 'calc(3.75rem + env(safe-area-inset-bottom))' } : {}}>
          <Outlet />
        </main>
      </div>

      {/* ── Mobile Tab Bar ────────────────────────────────── */}
      {!isViewer && (
        <nav data-tour="tour-nav" className="tab-bar fixed bottom-0 left-0 right-0 z-40 lg:hidden"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <div className="flex h-14">
            {NAV_ITEMS.map(({ to, label, Icon }) => {
              const isActive = location.pathname === to || (to !== '/dashboard' && location.pathname.startsWith(to));
              return (
                <NavLink key={to} to={to} className="flex-1 flex flex-col items-center justify-center gap-0.5 min-w-0 pt-1">
                  <Icon size={20} className={isActive ? 'text-ap-blue' : 'text-ap-gray'} />
                  <span className={`text-[10px] leading-tight font-semibold ${isActive ? 'text-ap-blue' : 'text-ap-gray'}`}>{label}</span>
                </NavLink>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
