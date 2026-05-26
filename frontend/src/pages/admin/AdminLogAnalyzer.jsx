import { useState, useRef, useEffect, createElement } from 'react';
import { Send, Loader2, AlertTriangle, Info, AlertCircle, Bug, RotateCcw } from 'lucide-react';
import adminAPI from '../../services/adminAPI';

const LEVEL_ICONS = { error: AlertCircle, warn: AlertTriangle, info: Info, debug: Bug };

export default function AdminLogAnalyzer() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ level: '', tag: '' });
  const [timeRange, setTimeRange] = useState({ from: '', to: '' });
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend(e) {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = { role: 'user', content: input.trim() };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput('');
    setLoading(true);

    try {
      const body = {
        query: input.trim(),
        messages: updated,
      };
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
      setMessages((prev) => [...prev, { role: 'assistant', content: res.data.data.answer, logCount: res.data.data.logCount }]);
    } catch (err) {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Error: ' + (err.response?.data?.message || err.message) }]);
    } finally {
      setLoading(false);
    }
  }

  function startNew() {
    setMessages([]);
    setInput('');
  }

  return (
    <div className="max-w-4xl mx-auto flex flex-col animate-fade-in" style={{ height: 'calc(100dvh - 7rem)' }}>
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <div>
          <h1 className="text-lg font-bold text-text-primary">Log Analysis</h1>
          <p className="text-xs text-ap-gray mt-0.5">Chat with your logs</p>
        </div>
        {messages.length > 0 && (
          <button onClick={startNew} className="btn-secondary text-xs">
            <RotateCcw size={12} /> New conversation
          </button>
        )}
      </div>

      <div className="card p-3 flex flex-wrap items-center gap-2 shadow-apple-sm mb-3 flex-shrink-0">
        <select value={filters.level} onChange={(e) => setFilters((f) => ({ ...f, level: e.target.value }))} className="input py-1.5 text-xs w-28">
          <option value="">All levels</option><option value="error">Error</option><option value="warn">Warn</option><option value="info">Info</option><option value="debug">Debug</option>
        </select>
        <input placeholder="Tag\u2026" value={filters.tag} onChange={(e) => setFilters((f) => ({ ...f, tag: e.target.value }))} className="input py-1.5 text-xs w-28" />
        <span className="text-[10px] text-ap-gray2">From</span>
        <input type="datetime-local" value={timeRange.from} onChange={(e) => setTimeRange((t) => ({ ...t, from: e.target.value }))} className="input py-1.5 text-xs w-44" />
        <span className="text-[10px] text-ap-gray2">To</span>
        <input type="datetime-local" value={timeRange.to} onChange={(e) => setTimeRange((t) => ({ ...t, to: e.target.value }))} className="input py-1.5 text-xs w-44" />
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {messages.length === 0 && (
          <div className="card p-8 text-center">
            <p className="text-sm text-text-secondary">Ask a question about your logs to get started.</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-3 rounded-2xl text-sm leading-relaxed ${
              msg.role === 'user'
                ? 'bg-ap-blue text-white rounded-br-md'
                : 'card shadow-apple-sm rounded-bl-md'
            }`}>
              {msg.role === 'assistant' && msg.logCount !== undefined && (
                <div className="flex items-center gap-1.5 mb-2 text-[10px] text-text-secondary">
                  <span>Based on <strong>{msg.logCount}</strong> log entries</span>
                  {filters.level && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-page text-text-secondary font-semibold">
                      {createElement(LEVEL_ICONS[filters.level] || Info, { size: 10 })} {filters.level}
                    </span>
                  )}
                  {filters.tag && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-page text-text-secondary font-mono text-[10px]">{filters.tag}</span>
                  )}
                </div>
              )}
              <div className="whitespace-pre-wrap break-words">{msg.content}</div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="card p-3 rounded-2xl rounded-bl-md shadow-apple-sm">
              <Loader2 size={16} className="animate-spin text-ap-blue" />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="flex gap-2 mt-3 flex-shrink-0">
        <input value={input} onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about your logs\u2026" className="input flex-1 text-sm" disabled={loading} />
        <button type="submit" disabled={loading || !input.trim()} className="btn-primary text-sm px-4">
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
        </button>
      </form>
    </div>
  );
}
