import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useState } from 'react';
import {
  Camera, LayoutDashboard, Video, Bell, Settings, CreditCard,
  LogOut, Menu, X, Sun, Moon, HelpCircle, Shield,
  Activity, FileText, MessageSquare, Users,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useTour } from '../contexts/TourContext';
import toast from 'react-hot-toast';

const NAV_ITEMS = [
  { to: '/dashboard',  label: 'Dashboard',  Icon: LayoutDashboard },
  { to: '/recordings', label: 'Recordings', Icon: Video },
  { to: '/alerts',     label: 'Alerts',     Icon: Bell },
  { to: '/billing',    label: 'Billing',    Icon: CreditCard },
  { to: '/settings',   label: 'Settings',   Icon: Settings },
];

const ADMIN_ITEMS = [
  { to: '/admin',          label: 'Dashboard', Icon: Activity },
  { to: '/admin/logs',     label: 'Logs',      Icon: FileText },
  { to: '/admin/users',    label: 'Users',     Icon: Users },
  { to: '/admin/analyze',  label: 'Analyze',   Icon: MessageSquare },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const tour = useTour();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const isViewer = location.pathname.startsWith('/viewer');
  const isCameraView = location.pathname.startsWith('/cameras/');

  async function handleLogout() {
    await logout();
    toast.success('Logged out');
    navigate('/login');
  }

  return (
    <div className="w-full h-full flex bg-page overflow-hidden" style={{ height: '100dvh' }}>
      {/* ── Desktop Sidebar (lg+) ────────────────────────── */}
      <aside className={`hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 ${sidebarCollapsed ? 'lg:w-16' : 'lg:w-68'} bg-card border-r transition-all duration-200 safe-top shadow-sm`}
        style={{ borderColor: 'var(--color-separator)' }}>
        <div className="flex items-center justify-between px-4 py-4 border-b" style={{ borderColor: 'var(--color-separator)' }}>
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm"
              style={{ backgroundColor: 'var(--ap-blue)' }}>
              <Camera size={16} className="text-white" />
            </div>
            {!sidebarCollapsed && (
              <span className="font-bold text-base text-text-primary tracking-tight whitespace-nowrap">HK Camera</span>
            )}
          </div>
          <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="w-8 h-8 flex items-center justify-center text-text-secondary hover:text-text-primary rounded-xl hover:bg-card-hover transition-colors flex-shrink-0">
            {sidebarCollapsed ? <Menu size={18} /> : <X size={18} />}
          </button>
        </div>

        <nav data-tour="tour-nav" className="py-2 flex flex-col gap-0.5 flex-1 overflow-y-auto">
          {NAV_ITEMS.map(({ to, label, Icon }) => (
            <NavLink key={to} to={to}
              className={({ isActive }) => `
                flex items-center ${sidebarCollapsed ? 'justify-center mx-1 px-1' : 'gap-3 mx-2 px-4'} py-2.5 rounded-xl text-sm font-semibold transition-all duration-200
                ${isActive
                  ? 'text-ap-blue'
                  : 'text-text-secondary hover:bg-card-hover hover:text-text-primary'
                }
              `}
              style={({ isActive }) => isActive ? { backgroundColor: 'color-mix(in srgb, var(--ap-blue) 10%, transparent)' } : {}}>
              <Icon size={18} className="flex-shrink-0" />
              {!sidebarCollapsed && label}
            </NavLink>
          ))}

          {user?.role === 'ADMIN' && (
            <>
              <div className="mx-5 my-2 h-px" style={{ backgroundColor: 'var(--color-separator)' }} />
              {!sidebarCollapsed && (
                <div className="flex items-center gap-2 mx-5 mt-1 mb-1">
                  <Shield size={12} className="text-text-secondary" />
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-text-secondary">Admin</span>
                </div>
              )}
              {ADMIN_ITEMS.map(({ to, label, Icon }) => (
                <NavLink key={to} to={to}
                  className={({ isActive }) => `
                    flex items-center ${sidebarCollapsed ? 'justify-center mx-1 px-1' : 'gap-3 mx-2 px-4'} py-2.5 rounded-xl text-sm font-semibold transition-all duration-200
                    ${isActive
                      ? 'text-ap-blue'
                      : 'text-text-secondary hover:bg-card-hover hover:text-text-primary'
                    }
                  `}
                  style={({ isActive }) => isActive ? { backgroundColor: 'color-mix(in srgb, var(--ap-blue) 10%, transparent)' } : {}}>
                  <Icon size={18} className="flex-shrink-0" />
                  {!sidebarCollapsed && label}
                </NavLink>
              ))}
            </>
          )}
        </nav>

        <div className="p-3 border-t" style={{ borderColor: 'var(--color-separator)' }}>
          <div className={`flex items-center ${sidebarCollapsed ? 'justify-center px-1' : 'gap-3 px-3'} py-2 mb-1`}>
            <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
              style={{ backgroundColor: 'color-mix(in srgb, var(--ap-blue) 10%, transparent)', color: 'var(--ap-blue)' }}>
              {user?.name?.[0]?.toUpperCase() ?? 'U'}
            </div>
            {!sidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-text-primary truncate">{user?.name}</p>
                <p className="text-xs text-text-secondary truncate">{user?.email}</p>
              </div>
            )}
          </div>
          <button onClick={toggleTheme}
            className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center px-1' : 'gap-3 px-3'} py-2.5 rounded-xl text-sm text-text-secondary hover:text-text-primary hover:bg-card-hover transition-colors mb-0.5`}>
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            {!sidebarCollapsed && (theme === 'dark' ? 'Light' : 'Dark')}
          </button>
          {tour.dismissed && (
            <button onClick={() => { tour.reset(); tour.start(); }}
              className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center px-1' : 'gap-3 px-3'} py-2.5 rounded-xl text-sm text-text-secondary hover:text-text-primary hover:bg-card-hover transition-colors mb-0.5`}>
              <HelpCircle size={18} />
              {!sidebarCollapsed && 'Guide'}
            </button>
          )}
          <button onClick={handleLogout}
            className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center px-1' : 'gap-3 px-3'} py-2.5 rounded-xl text-sm text-text-secondary hover:text-ap-red transition-colors`}>
            <LogOut size={18} />
            {!sidebarCollapsed && 'Log Out'}
          </button>
        </div>
      </aside>

      {/* ── Mobile Sidebar ───────────────────────────────── */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-72 bg-card border-r shadow-apple-lg
        transform transition-transform duration-200 ease-in-out lg:hidden safe-top
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `} style={{ borderColor: 'var(--color-separator)' }}>
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--color-separator)' }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shadow-sm"
              style={{ backgroundColor: 'var(--ap-blue)' }}>
              <Camera size={16} className="text-white" />
            </div>
            <span className="font-bold text-base text-text-primary">HK Camera</span>
          </div>
          <button onClick={() => setSidebarOpen(false)}
            className="w-10 h-10 flex items-center justify-center text-text-secondary hover:text-text-primary rounded-xl transition-colors">
            <X size={20} />
          </button>
        </div>

        <nav className="py-2 flex flex-col gap-0.5 mt-2">
          {NAV_ITEMS.map(({ to, label, Icon }) => (
            <NavLink key={to} to={to} onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => `
                flex items-center gap-3 mx-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all
                ${isActive ? 'text-ap-blue' : 'text-text-secondary hover:bg-card-hover hover:text-text-primary'}
              `}
              style={({ isActive }) => isActive ? { backgroundColor: 'color-mix(in srgb, var(--ap-blue) 10%, transparent)' } : {}}>
              <Icon size={18} /> {label}
            </NavLink>
          ))}

          {user?.role === 'ADMIN' && (
            <>
              <div className="mx-5 my-2 h-px" style={{ backgroundColor: 'var(--color-separator)' }} />
              <div className="flex items-center gap-2 mx-5 mt-1 mb-1">
                <Shield size={12} className="text-text-secondary" />
                <span className="text-[10px] font-semibold uppercase tracking-widest text-text-secondary">Admin</span>
              </div>
              {ADMIN_ITEMS.map(({ to, label, Icon }) => (
                <NavLink key={to} to={to} onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) => `
                    flex items-center gap-3 mx-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all
                    ${isActive ? 'text-ap-blue' : 'text-text-secondary hover:bg-card-hover hover:text-text-primary'}
                  `}
                  style={({ isActive }) => isActive ? { backgroundColor: 'color-mix(in srgb, var(--ap-blue) 10%, transparent)' } : {}}>
                  <Icon size={18} /> {label}
                </NavLink>
              ))}
            </>
          )}
        </nav>

        <div className="p-3 mt-auto border-t" style={{ borderColor: 'var(--color-separator)' }}>
          <div className="flex items-center gap-3 px-3 py-3 mb-2">
            <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
              style={{ backgroundColor: 'color-mix(in srgb, var(--ap-blue) 10%, transparent)', color: 'var(--ap-blue)' }}>
              {user?.name?.[0]?.toUpperCase() ?? 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-text-primary truncate">{user?.name}</p>
              <p className="text-xs text-text-secondary truncate">{user?.email}</p>
            </div>
          </div>
          <button onClick={() => { setSidebarOpen(false); toggleTheme(); }}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm text-text-secondary hover:text-text-primary hover:bg-card-hover transition-colors mb-0.5">
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            {theme === 'dark' ? 'Light' : 'Dark'}
          </button>
          <button onClick={() => { setSidebarOpen(false); handleLogout(); }}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm text-text-secondary hover:text-ap-red transition-colors">
            <LogOut size={18} /> Log Out
          </button>
        </div>
      </aside>

      {sidebarOpen && <div className="fixed inset-0 z-40 bg-black/20 dark:bg-black/40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* ── Main ──────────────────────────────────────────── */}
      <div className={`flex-1 flex flex-col min-w-0 overflow-hidden transition-all duration-200 ${!isViewer && !isCameraView ? (sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-68') : ''}`}>
        {!isViewer && !isCameraView && (
          <header className="nav-bar lg:hidden flex items-center gap-2 px-3 py-1.5" style={{ zIndex: 30 }}>
            <button onClick={() => setSidebarOpen(true)} data-tour="tour-nav"
              className="w-10 h-10 flex items-center justify-center text-text-secondary hover:text-text-primary rounded-xl transition-colors flex-shrink-0">
              <Menu size={20} />
            </button>
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Camera size={18} className="flex-shrink-0" style={{ color: 'var(--ap-blue)' }} />
              <span className="font-bold text-text-primary text-base">HK Camera</span>
            </div>
            {tour.dismissed && (
              <button onClick={() => { tour.reset(); tour.start(); }}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-card border border-ap-separator text-text-secondary hover:text-text-primary rounded-xl text-xs font-semibold transition-colors flex-shrink-0">
                <HelpCircle size={12} /> Guide
              </button>
            )}
          </header>
        )}

        <main className={`flex-1 ${!isViewer && !isCameraView ? 'overflow-y-auto' : 'overflow-hidden'}`}
          style={!isViewer && !isCameraView ? { paddingBottom: 'calc(3.75rem + env(safe-area-inset-bottom))' } : {}}>
          <Outlet />
        </main>
      </div>

      {/* ── Mobile Tab Bar ────────────────────────────────── */}
      {!isViewer && !isCameraView && (
        <nav data-tour="tour-nav" className="tab-bar fixed bottom-0 left-0 right-0 z-40 lg:hidden"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <div className="flex h-14">
            {NAV_ITEMS.map(({ to, label, Icon }) => {
              const isActive = location.pathname === to || (to !== '/dashboard' && location.pathname.startsWith(to));
              return (
                <NavLink key={to} to={to} className="flex-1 flex flex-col items-center justify-center gap-0.5 min-w-0 pt-1">
                  <Icon size={20} className={isActive ? 'text-ap-blue' : 'text-text-secondary'} />
                  <span className={`text-[10px] leading-tight font-semibold ${isActive ? 'text-ap-blue' : 'text-text-secondary'}`}>{label}</span>
                </NavLink>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
