import { useState, createElement } from 'react';
import { Send, Loader2, AlertTriangle, Info, AlertCircle, Bug, X } from 'lucide-react';
import adminAPI from '../../services/adminAPI';

const LEVEL_ICONS = { error: AlertCircle, warn: AlertTriangle, info: Info, debug: Bug };

export default function AdminLogAnalyzer() {
  const [query, setQuery] = useState('');
  const [answer, setAnswer] = useState(null);
  const [loading, setLoading] = useState(false);
  const [logCount, setLogCount] = useState(null);
  const [filters, setFilters] = useState({ level: '', tag: '' });
  const [timeRange, setTimeRange] = useState({ from: '', to: '' });

  async function handleAnalyze(e) {
    e.preventDefault();
    setLoading(true);
    setAnswer(null);
    try {
      const body = { query };
      if (filters.level || filters.tag) {
        body.filters = {};
        if (filters.level) body.filters.level = filters.level;
        if (filters.tag) body.filters.tag = filters.tag;
      }
      if (timeRange.from || timeRange.to) {
        body.timeRange = {};
        if (timeRange.from) body.timeRange.from = new Date(timeRange.from).toISOString();
        if (timeRange.to) body.timeRange.to = new Date(timeRange.to).toISOString();
      }
      const res = await adminAPI.analyzeLogs(body);
      setAnswer(res.data.data.answer);
      setLogCount(res.data.data.logCount);
    } catch (err) {
      setAnswer('Failed to analyze logs: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  }

  function clear() {
    setQuery('');
    setAnswer(null);
    setLogCount(null);
    setFilters({ level: '', tag: '' });
    setTimeRange({ from: '', to: '' });
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div>
        <h1 className="text-lg font-bold text-white">Log Analyzer</h1>
        <p className="text-xs text-slate-400 mt-0.5">Ask questions about application logs or get AI-powered summaries</p>
      </div>

      {/* ── Filters ──────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 bg-slate-800/30 border border-slate-700/50 rounded-lg p-3">
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
          className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-hk-500 w-28"
          value={filters.tag}
          onChange={(e) => setFilters((f) => ({ ...f, tag: e.target.value }))}
        />
        <span className="text-[10px] text-slate-600">From</span>
        <input
          type="datetime-local"
          className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-hk-500"
          value={timeRange.from}
          onChange={(e) => setTimeRange((t) => ({ ...t, from: e.target.value }))}
        />
        <span className="text-[10px] text-slate-600">To</span>
        <input
          type="datetime-local"
          className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-hk-500"
          value={timeRange.to}
          onChange={(e) => setTimeRange((t) => ({ ...t, to: e.target.value }))}
        />
      </div>

      {/* ── Query input ──────────────────────────────────────── */}
      <form onSubmit={handleAnalyze} className="flex gap-2">
        <input
          className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-hk-500"
          placeholder="e.g., Why did the viewer disconnect? Any recent errors?"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-1.5 px-4 py-2 bg-hk-600 hover:bg-hk-500 disabled:bg-slate-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          Analyze
        </button>
        {answer && (
          <button
            type="button"
            onClick={clear}
            className="flex items-center gap-1 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-lg text-sm transition-colors"
          >
            <X size={14} />
            Clear
          </button>
        )}
      </form>

      {/* ── Response ─────────────────────────────────────────── */}
      {loading && (
        <div className="bg-slate-800/30 border border-slate-700/50 rounded-lg p-6 text-center">
          <Loader2 size={24} className="animate-spin text-hk-400 mx-auto mb-2" />
          <p className="text-xs text-slate-400">Analyzing logs…</p>
        </div>
      )}

      {answer && !loading && (
        <div className="bg-slate-800/30 border border-slate-700/50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3 text-[11px] text-slate-500">
            <span>Analysis based on <strong className="text-slate-300">{logCount}</strong> log entries</span>
            {filters.level && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                {createElement(LEVEL_ICONS[filters.level] || Info, { size: 10 })}
                {filters.level}
              </span>
            )}
            {filters.tag && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono text-[10px]">
                {filters.tag}
              </span>
            )}
          </div>
          <div className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
            {answer}
          </div>
        </div>
      )}
    </div>
  );
}
