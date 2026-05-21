import { Outlet, NavLink } from 'react-router-dom';
import { Activity, FileText, MessageSquare, ArrowLeft, Camera } from 'lucide-react';

const links = [
  { to: '/admin',          icon: Activity,     label: 'Dashboard', end: true },
  { to: '/admin/logs',     icon: FileText,     label: 'Logs',      end: false },
  { to: '/admin/analyze',  icon: MessageSquare, label: 'Analyze',  end: false },
];

export default function AdminLayout() {
  return (
    <div className="min-h-dvh bg-slate-900 flex">
      <aside className="w-56 bg-slate-950 border-r border-slate-800 flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-hk-500 rounded-lg flex items-center justify-center">
              <Camera size={12} className="text-white" />
            </div>
            <NavLink to="/admin" className="text-sm font-bold text-white tracking-tight">Admin</NavLink>
          </div>
          <p className="text-[10px] text-slate-500 mt-1">Production Support</p>
        </div>
        <nav className="flex-1 p-2 space-y-0.5">
          {links.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium transition-colors ${
                  isActive ? 'bg-hk-500/15 text-hk-400' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`
              }
            >
              <Icon size={14} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-slate-800">
          <NavLink to="/dashboard" className="flex items-center gap-2 text-[11px] text-slate-500 hover:text-slate-300 transition-colors">
            <ArrowLeft size={12} /> Back to app
          </NavLink>
        </div>
      </aside>
      <main className="flex-1 overflow-auto p-4 sm:p-6">
        <Outlet />
      </main>
    </div>
  );
}
