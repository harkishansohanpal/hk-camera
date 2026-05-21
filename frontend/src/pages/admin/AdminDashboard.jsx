import { useState, useEffect, useCallback, createElement } from 'react';
import { AlertTriangle, Info, AlertCircle, Bug, RefreshCw } from 'lucide-react';
import adminAPI from '../../services/adminAPI';

const LEVEL_ICONS = { error: AlertCircle, warn: AlertTriangle, info: Info, debug: Bug };
const LEVEL_COLORS = {
  error: 'text-ap-red bg-ap-red/10 border-ap-red/20',
  warn:  'text-ap-orange bg-ap-orange/10 border-ap-orange/20',
  info:  'text-ap-blue bg-ap-blue/10 border-ap-blue/20',
  debug: 'text-text-secondary bg-ap-gray/10 border-ap-gray/20',
};

export default function AdminDashboard() {
  const [logs, setLogs] = useState([]);
  const [meta, setMeta] = useState(null);
  const [filters, setFilters] = useState({ level: '', tag: '', limit: '100' });
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.level) params.level = filters.level;
      if (filters.tag) params.tag = filters.tag;
      params.limit = filters.limit || '100';
      const [logRes, metaRes] = await Promise.all([adminAPI.getLogs(params), adminAPI.getLogMeta()]);
      setLogs(logRes.data?.data || []);
      setMeta(metaRes.data?.data || null);
    } catch (err) { console.error('Failed to fetch logs:', err); }
    finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  return (
    <div className="max-w-6xl mx-auto space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div><h1 className="text-lg font-bold text-text-primary">Dashboard</h1><p className="text-xs text-text-secondary mt-0.5">Recent logs and system activity</p></div>
        <button onClick={fetchLogs} className="btn-ghost text-xs">
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {meta && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {meta.levels?.map((l) => (
            <div key={l.level} className="card p-3 shadow-apple-sm">
              <div className="flex items-center gap-1.5 text-[11px] text-text-secondary mb-1">
                {createElement(LEVEL_ICONS[l.level] || Info, { size: 12 })} {l.level.toUpperCase()}
              </div>
              <p className="text-xl font-bold text-text-primary">{l.count}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <select value={filters.level} onChange={(e) => setFilters((f) => ({ ...f, level: e.target.value }))}
          className="input py-1.5 text-xs w-28">
          <option value="">All levels</option><option value="error">Error</option><option value="warn">Warn</option><option value="info">Info</option><option value="debug">Debug</option>
        </select>
        <input placeholder="Tag filter\u2026" value={filters.tag} onChange={(e) => setFilters((f) => ({ ...f, tag: e.target.value }))} className="input py-1.5 text-xs w-28" />
        <select value={filters.limit} onChange={(e) => setFilters((f) => ({ ...f, limit: e.target.value }))} className="input py-1.5 text-xs w-20">
          <option value="50">50</option><option value="100">100</option><option value="200">200</option>
        </select>
        {meta && (
          <select value={filters.tag} onChange={(e) => setFilters((f) => ({ ...f, tag: e.target.value }))} className="input py-1.5 text-xs flex-1 sm:flex-none sm:w-40">
            <option value="">All tags</option>
            {meta.tags?.map((t) => <option key={t.tag} value={t.tag}>{t.tag} ({t.count})</option>)}
          </select>
        )}
      </div>

      <div className="card overflow-hidden shadow-apple-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-ap-separator text-text-secondary">
                <th className="text-left py-2.5 px-3 font-semibold">Time</th>
                <th className="text-left py-2.5 px-3 font-semibold">Level</th>
                <th className="text-left py-2.5 px-3 font-semibold">Tag</th>
                <th className="text-left py-2.5 px-3 font-semibold">Message</th>
                <th className="text-left py-2.5 px-3 font-semibold">Meta</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-text-secondary">No logs found</td></tr>}
              {logs.map((log) => {
                const Icon = LEVEL_ICONS[log.level] || Info;
                return (
                  <tr key={log.id} className="border-b border-ap-separator hover:bg-card-hover/50 transition-colors">
                    <td className="py-2.5 px-3 text-text-secondary whitespace-nowrap font-mono text-[10px]">{new Date(log.createdAt).toLocaleTimeString()}</td>
                    <td className="py-2.5 px-3">
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border ${LEVEL_COLORS[log.level] || LEVEL_COLORS.info}`}>
                        <Icon size={10} /> {log.level.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-2.5 px-3"><span className="text-text-primary font-mono">{log.tag}</span></td>
                    <td className="py-2.5 px-3 text-text-primary max-w-xs truncate">{log.message}</td>
                    <td className="py-2.5 px-3 text-text-secondary font-mono text-[10px] max-w-[200px] truncate">{log.meta ? JSON.stringify(log.meta) : '\u2014'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
