import { useState, useEffect, useCallback, useRef, createElement } from 'react';
import {
  AlertTriangle, Info, AlertCircle, Bug, RefreshCw,
  MessageSquare, Send, Loader2, CheckSquare, Square,
} from 'lucide-react';
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

  const [analyzeMode, setAnalyzeMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const chatRef = useRef(null);

  useEffect(() => {
    chatRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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

  useEffect(() => {
    if (!analyzeMode) setSelectedIds(new Set());
  }, [filters, analyzeMode]);

  const allSelected = logs.length > 0 && selectedIds.size === logs.length;
  const someSelected = selectedIds.size > 0 && !allSelected;

  function toggleAll() {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(logs.map((l) => l.id)));
    }
  }

  function toggleOne(id) {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  }

  async function handleSend(e) {
    e.preventDefault();
    if (!input.trim() || analyzing) return;

    const userMsg = { role: 'user', content: input.trim() };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput('');
    setAnalyzing(true);

    try {
      const body = {
        query: input.trim(),
        messages: updated,
        logIds: Array.from(selectedIds),
      };

      const res = await adminAPI.analyzeLogs(body);
      setMessages((prev) => [...prev, { role: 'assistant', content: res.data.data.answer, logCount: res.data.data.logCount }]);
    } catch (err) {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Error: ' + (err.response?.data?.message || err.message) }]);
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <>
      {loading && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/10 backdrop-blur-sm" style={{ height: '100dvh' }}>
          <div className="w-10 h-10 border-[3px] border-ap-blue border-t-transparent rounded-full animate-spin" />
          <LoadingHint />
        </div>
      )}
      <div className="max-w-6xl mx-auto space-y-4 animate-fade-in">
      {/* ── Header ─────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div><h1 className="text-lg font-bold text-text-primary">Dashboard</h1><p className="text-xs text-text-secondary mt-0.5">Recent activity</p></div>
        <button onClick={fetchLogs} className="btn-ghost text-xs">
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* ── Meta cards ─────────────────────────── */}
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

      {/* ── Filters ────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        <select value={filters.level} onChange={(e) => setFilters((f) => ({ ...f, level: e.target.value }))}
          className="input py-1.5 text-xs w-28">
          <option value="">All</option><option value="error">Error</option><option value="warn">Warn</option><option value="info">Info</option><option value="debug">Debug</option>
        </select>
        <input placeholder="Filter by tag\u2026" value={filters.tag} onChange={(e) => setFilters((f) => ({ ...f, tag: e.target.value }))} className="input py-1.5 text-xs w-28" />
        <select value={filters.limit} onChange={(e) => setFilters((f) => ({ ...f, limit: e.target.value }))} className="input py-1.5 text-xs w-20">
          <option value="50">50</option><option value="100">100</option><option value="200">200</option>
        </select>
        {meta && (
          <select value={filters.tag} onChange={(e) => setFilters((f) => ({ ...f, tag: e.target.value }))} className="input py-1.5 text-xs flex-1 sm:flex-none sm:w-40">
            <option value="">All tags</option>
            {meta.tags?.map((t) => <option key={t.tag} value={t.tag}>{t.tag} ({t.count})</option>)}
          </select>
        )}
        <div className="w-px h-5 bg-ap-separator" />
        <button onClick={() => { setAnalyzeMode(!analyzeMode); setMessages([]); }}
          className={`btn-ghost text-xs ${analyzeMode ? 'text-ap-blue bg-ap-blue/10' : ''}`}>
          <MessageSquare size={12} /> Smart Analyze
        </button>
      </div>

      {/* ── Logs table ─────────────────────────── */}
      <div className="card overflow-hidden shadow-apple-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-ap-separator text-text-secondary">
                {analyzeMode && (
                  <th className="py-2.5 px-3 w-10">
                    <button onClick={toggleAll} className="text-text-secondary hover:text-text-primary transition-colors">
                      {allSelected ? <CheckSquare size={14} /> : <Square size={14} />}
                    </button>
                  </th>
                )}
                <th className="text-left py-2.5 px-3 font-semibold">Time</th>
                <th className="text-left py-2.5 px-3 font-semibold">Level</th>
                <th className="text-left py-2.5 px-3 font-semibold">Tag</th>
                <th className="text-left py-2.5 px-3 font-semibold">Message</th>
                <th className="text-left py-2.5 px-3 font-semibold">Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 && <tr><td colSpan={analyzeMode ? 6 : 5} className="py-8 text-center text-text-secondary">No logs yet</td></tr>}
              {logs.map((log) => {
                const Icon = LEVEL_ICONS[log.level] || Info;
                return (
                  <tr key={log.id} className="border-b border-ap-separator hover:bg-card-hover/50 transition-colors">
                    {analyzeMode && (
                      <td className="py-2.5 px-3">
                        <button onClick={() => toggleOne(log.id)} className="text-text-secondary hover:text-text-primary transition-colors">
                          {selectedIds.has(log.id) ? <CheckSquare size={14} className="text-ap-blue" /> : <Square size={14} />}
                        </button>
                      </td>
                    )}
                    <td className="py-2.5 px-3 text-text-secondary whitespace-nowrap font-mono text-[10px]">{new Date(log.createdAt).toLocaleString()}</td>
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

      {/* ── Analyze section ────────────────────── */}
      {analyzeMode && (
        <div className="card p-4 shadow-apple-sm space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-text-secondary">
              {selectedIds.size === 0
                ? 'Select logs above to analyze'
                : `${selectedIds.size} log${selectedIds.size !== 1 ? 's' : ''} selected`
              }
            </p>
            {messages.length > 0 && (
              <button onClick={() => setMessages([])} className="text-[10px] text-text-secondary hover:text-text-primary transition-colors">
                Clear chat
              </button>
            )}
          </div>

          {messages.length > 0 && (
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-3 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-ap-blue text-white rounded-br-md'
                      : 'bg-page rounded-bl-md'
                  }`}>
                    {msg.role === 'assistant' && msg.logCount !== undefined && (
                      <div className="text-[10px] text-text-secondary mb-1">
                        Based on <strong>{msg.logCount}</strong> entries
                      </div>
                    )}
                    <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                  </div>
                </div>
              ))}
              {analyzing && (
                <div className="flex justify-start">
                  <div className="bg-page p-3 rounded-2xl rounded-bl-md">
                    <Loader2 size={16} className="animate-spin text-ap-blue" />
                  </div>
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleSend} className="flex gap-2">
            <input value={input} onChange={(e) => setInput(e.target.value)}
              placeholder={selectedIds.size === 0 ? 'Select some logs first\u2026' : 'Ask about selected logs\u2026'}
              className="input flex-1 text-sm" disabled={analyzing || selectedIds.size === 0} />
            <button type="submit" disabled={analyzing || !input.trim() || selectedIds.size === 0} className="btn-primary text-sm px-4">
              {analyzing ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            </button>
          </form>
          <div ref={chatRef} />
        </div>
      )}
        </div>
      </>
  );
}

function LoadingHint() {
  const [hint, setHint] = useState('');

  useEffect(() => {
    const t1 = setTimeout(() => setHint('Loading\u2026'), 2000);
    const t2 = setTimeout(() => setHint('Server is starting up\u2026'), 5000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  if (!hint) return null;
  return <p className="text-sm text-text-secondary animate-pulse mt-3">{hint}</p>;
}
