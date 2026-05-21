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
      if (filters.level || filters.tag) { body.filters = {}; if (filters.level) body.filters.level = filters.level; if (filters.tag) body.filters.tag = filters.tag; }
      if (timeRange.from || timeRange.to) { body.timeRange = {}; if (timeRange.from) body.timeRange.from = new Date(timeRange.from).toISOString(); if (timeRange.to) body.timeRange.to = new Date(timeRange.to).toISOString(); }
      const res = await adminAPI.analyzeLogs(body);
      setAnswer(res.data.data.answer); setLogCount(res.data.data.logCount);
    } catch (err) { setAnswer('Failed to analyze logs: ' + (err.response?.data?.message || err.message)); }
    finally { setLoading(false); }
  }

  function clear() { setQuery(''); setAnswer(null); setLogCount(null); setFilters({ level: '', tag: '' }); setTimeRange({ from: '', to: '' }); }

  return (
    <div className="max-w-4xl mx-auto space-y-4 animate-fade-in">
      <div><h1 className="text-lg font-bold text-text-primary">Log Analyzer</h1><p className="text-xs text-ap-gray mt-0.5">Ask questions about application logs or get AI-powered summaries</p></div>

      <div className="card p-3 flex flex-wrap items-center gap-2 shadow-apple-sm">
        <select value={filters.level} onChange={(e) => setFilters((f) => ({ ...f, level: e.target.value }))} className="input py-1.5 text-xs w-28">
          <option value="">All levels</option><option value="error">Error</option><option value="warn">Warn</option><option value="info">Info</option><option value="debug">Debug</option>
        </select>
        <input placeholder="Tag filter\u2026" value={filters.tag} onChange={(e) => setFilters((f) => ({ ...f, tag: e.target.value }))} className="input py-1.5 text-xs w-28" />
        <span className="text-[10px] text-ap-gray2">From</span>
        <input type="datetime-local" value={timeRange.from} onChange={(e) => setTimeRange((t) => ({ ...t, from: e.target.value }))} className="input py-1.5 text-xs w-44" />
        <span className="text-[10px] text-ap-gray2">To</span>
        <input type="datetime-local" value={timeRange.to} onChange={(e) => setTimeRange((t) => ({ ...t, to: e.target.value }))} className="input py-1.5 text-xs w-44" />
      </div>

      <form onSubmit={handleAnalyze} className="flex gap-2">
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="e.g., Why did the viewer disconnect? Any recent errors?" className="input flex-1" />
        <button type="submit" disabled={loading} className="btn-primary text-sm px-4">
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Analyze
        </button>
        {answer && <button type="button" onClick={clear} className="btn-secondary text-sm px-3"><X size={14} /> Clear</button>}
      </form>

      {loading && (
        <div className="card p-6 text-center shadow-apple-sm">
          <Loader2 size={24} className="animate-spin text-ap-blue mx-auto mb-2" />
          <p className="text-xs text-text-secondary">Analyzing logs\u2026</p>
        </div>
      )}

      {answer && !loading && (
        <div className="card p-4 shadow-apple-sm">
          <div className="flex items-center gap-2 mb-3 text-[11px] text-text-secondary">
            <span>Analysis based on <strong className="text-text-primary">{logCount}</strong> log entries</span>
            {filters.level && <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-page text-text-secondary font-semibold">{createElement(LEVEL_ICONS[filters.level] || Info, { size: 10 })} {filters.level}</span>}
            {filters.tag && <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-page text-text-secondary font-mono text-[10px]">{filters.tag}</span>}
          </div>
          <div className="text-sm text-text-primary leading-relaxed whitespace-pre-wrap">{answer}</div>
        </div>
      )}
    </div>
  );
}
