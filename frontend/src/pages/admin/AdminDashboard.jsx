import { useState, useEffect, useCallback, createElement } from 'react';
import { AlertTriangle, Info, AlertCircle, Bug, RefreshCw } from 'lucide-react';
import adminAPI from '../../services/adminAPI';

const LEVEL_ICONS = { error: AlertCircle, warn: AlertTriangle, info: Info, debug: Bug };
const LEVEL_COLORS = {
  error: 'text-red-400 bg-red-500/10 border-red-500/20',
  warn:  'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  info:  'text-blue-400 bg-blue-500/10 border-blue-500/20',
  debug: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
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

      const [logRes, metaRes] = await Promise.all([
        adminAPI.getLogs(params),
        adminAPI.getLogMeta(),
      ]);
      setLogs(logRes.data?.data || []);
      setMeta(metaRes.data?.data || null);
    } catch (err) {
      console.error('Failed to fetch logs:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      {/* ── Header ───────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-white">Dashboard</h1>
          <p className="text-xs text-slate-400 mt-0.5">Recent logs and system activity</p>
        </div>
        <button
          onClick={fetchLogs}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition-colors"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* ── Quick stats ──────────────────────────────────────── */}
      {meta && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {meta.levels?.map((l) => (
            <div key={l.level} className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-1">
                {React.createElement(LEVEL_ICONS[l.level] || Info, { size: 12 })}
                {l.level.toUpperCase()}
              </div>
              <p className="text-xl font-bold text-white">{l.count}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Filters ──────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        <select
          className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-hk-500"
          value={filters.level}
          onChange={(e) => setFilters((f) => ({ ...f, level: e.target.value }))}
        >
          <option value="">All levels</option>
          <option value="error">Error</option>
          <option value="warn">Warn</option>
          <option value="info">Info</option>
          <option value="debug">Debug</option>
        </select>
        <input
          placeholder="Tag filter…"
          className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-hk-500 w-32"
          value={filters.tag}
          onChange={(e) => setFilters((f) => ({ ...f, tag: e.target.value }))}
        />
        <select
          className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-hk-500"
          value={filters.limit}
          onChange={(e) => setFilters((f) => ({ ...f, limit: e.target.value }))}
        >
          <option value="50">50</option>
          <option value="100">100</option>
          <option value="200">200</option>
        </select>
        {meta && (
          <select
            className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-hk-500"
            value={filters.tag}
            onChange={(e) => setFilters((f) => ({ ...f, tag: e.target.value }))}
          >
            <option value="">All tags</option>
            {meta.tags?.map((t) => (
              <option key={t.tag} value={t.tag}>{t.tag} ({t.count})</option>
            ))}
          </select>
        )}
      </div>

      {/* ── Log table ────────────────────────────────────────── */}
      <div className="bg-slate-800/30 border border-slate-700/50 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-700/50 text-slate-500">
                <th className="text-left py-2 px-3 font-medium">Time</th>
                <th className="text-left py-2 px-3 font-medium">Level</th>
                <th className="text-left py-2 px-3 font-medium">Tag</th>
                <th className="text-left py-2 px-3 font-medium">Message</th>
                <th className="text-left py-2 px-3 font-medium">Meta</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 && (
                <tr><td colSpan={5} className="py-8 text-center text-slate-500">No logs found</td></tr>
              )}
              {logs.map((log) => {
                const Icon = LEVEL_ICONS[log.level] || Info;
                return (
                  <tr key={log.id} className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors">
                    <td className="py-2 px-3 text-slate-400 whitespace-nowrap font-mono text-[10px]">
                      {new Date(log.createdAt).toLocaleTimeString()}
                    </td>
                    <td className="py-2 px-3">
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border ${LEVEL_COLORS[log.level] || LEVEL_COLORS.info}`}>
                        <Icon size={10} />
                        {log.level.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      <span className="text-slate-300 font-mono">{log.tag}</span>
                    </td>
                    <td className="py-2 px-3 text-slate-200 max-w-xs truncate">{log.message}</td>
                    <td className="py-2 px-3 text-slate-500 font-mono text-[10px] max-w-[200px] truncate">
                      {log.meta ? JSON.stringify(log.meta) : '—'}
                    </td>
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
