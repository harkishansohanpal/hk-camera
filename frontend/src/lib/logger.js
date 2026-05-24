const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
const CURRENT_LEVEL = LOG_LEVELS[import.meta.env.VITE_LOG_LEVEL] ?? LOG_LEVELS.info;

const SEP = '──────────────────────────────────────────────────';
const SEND_INTERVAL_MS = 10000;
const MAX_BATCH = 50;

// In-memory log buffer
let _buffer = [];
let _sessionId = null;
let _intervalId = null;

function getSessionId() {
  if (!_sessionId) {
    const arr = new Uint32Array(2);
    crypto.getRandomValues(arr);
    _sessionId = `${Date.now()}-${arr[0].toString(36)}${arr[1].toString(36)}`;
  }
  return _sessionId;
}

function sendBatch() {
  if (_buffer.length === 0) return;
  const batch = _buffer.splice(0, MAX_BATCH);
  const token = localStorage.getItem('accessToken');
  if (!token) {
    console.warn('[logger] No accessToken found, dropping log batch');
    return;
  }
  const baseUrl = import.meta.env.VITE_API_URL || '';
  fetch(`${baseUrl}/api/logs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ logs: batch }),
  }).then(r => {
    if (!r.ok) console.warn('[logger] POST /api/logs failed', r.status, r.statusText);
  }).catch(e => console.warn('[logger] POST /api/logs error', e));
}

function scheduleSend() {
  if (_intervalId) return;
  _intervalId = setInterval(sendBatch, SEND_INTERVAL_MS);
  if (_intervalId.unref) _intervalId.unref();
}

function log(level, tag, message, meta) {
  if (LOG_LEVELS[level] < CURRENT_LEVEL) return;
  const ts = new Date().toISOString();
  const prefix = `${ts} [${level.toUpperCase()}] [${tag}]`;
  const rest = meta ? [message, meta] : [message];
  if (level === 'error') {
    console.error(prefix, ...rest);
  } else if (level === 'warn') {
    console.warn(prefix, ...rest);
  } else if (level === 'debug') {
    console.debug(prefix, ...rest);
  } else {
    console.log(prefix, ...rest);
  }

  // Buffer for backend ingestion
  const entry = { level, tag, message, sessionId: getSessionId(), meta: meta || undefined };
  _buffer.push(entry);
  if (_buffer.length >= MAX_BATCH) sendBatch();
  scheduleSend();
}

export const logger = {
  debug: (tag, msg, meta) => log('debug', tag, msg, meta),
  info:  (tag, msg, meta) => log('info',  tag, msg, meta),
  warn:  (tag, msg, meta) => log('warn',  tag, msg, meta),
  error: (tag, msg, meta) => log('error', tag, msg, meta),
  sep:   (tag) => console.log(`${new Date().toISOString()} [SEP] ${tag} ${SEP}`),
};
