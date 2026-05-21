import { Outlet, NavLink } from 'react-router-dom';
import { Activity, FileText, MessageSquare, ArrowLeft, Camera } from 'lucide-react';

const links = [
  { to: '/admin',          icon: Activity,     label: 'Dashboard', end: true },
  { to: '/admin/logs',     icon: FileText,     label: 'Logs',      end: false },
  { to: '/admin/analyze',  icon: MessageSquare, label: 'Analyze',  end: false },
];

export default function AdminLayout() {
  return (
    <div className="min-h-dvh bg-page flex">
      <aside className="w-56 bg-card border-r border-ap-separator flex flex-col flex-shrink-0 shadow-sm">
        <div className="p-4 border-b border-ap-separator">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-ap-blue rounded-lg flex items-center justify-center">
              <Camera size={12} className="text-white" />
            </div>
            <NavLink to="/admin" className="text-sm font-bold text-text-primary tracking-tight">Admin</NavLink>
          </div>
          <p className="text-[10px] text-text-secondary mt-1">Production Support</p>
        </div>
        <nav className="flex-1 p-2 space-y-0.5">
          {links.map(({ to, icon: Icon, label, end }) => (
            <NavLink key={to} to={to} end={end}
              className={({ isActive }) =>
                `flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                  isActive ? 'bg-ap-blue/10 text-ap-blue' : 'text-text-secondary hover:text-text-primary hover:bg-card-hover'
                }`
              }>
              <Icon size={14} /> {label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-ap-separator">
          <NavLink to="/dashboard" className="flex items-center gap-2 text-[11px] text-text-secondary hover:text-text-primary transition-colors">
            <ArrowLeft size={12} /> Back to app
          </NavLink>
        </div>
      </aside>
      <main className="flex-1 overflow-auto p-4 sm:p-6"><Outlet /></main>
    </div>
  );
}
