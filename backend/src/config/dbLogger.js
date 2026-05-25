/**
 * DB Logger Transport
 * Writes winston log entries to the Log table via Prisma.
 * Buffers logs and flushes every 5s to batch DB writes.
 */
const Transport = require('winston-transport');

const LOG_LEVEL_MAP = {
  error: 'error',
  warn: 'warn',
  info: 'info',
  http: 'info',
  verbose: 'debug',
  debug: 'debug',
  silly: 'debug',
};

class DbTransport extends Transport {
  constructor(opts = {}) {
    super(opts);
    this.buffer = [];
    this.flushTimer = null;
    this.batchSize = opts.batchSize || 50;
    this.flushIntervalMs = opts.flushIntervalMs || 5000;
    this._prisma = null;
    this._proxyMode = opts.proxyMode !== false;
    this._startFlushTimer();
  }

  get prisma() {
    if (!this._prisma && this._proxyMode) {
      try {
        this._prisma = require('./database').prisma;
      } catch {
        // DB not available — logs silently dropped
        this._proxyMode = false;
      }
    }
    return this._prisma;
  }

  log(info, callback) {
    if (!this.prisma) {
      callback();
      return;
    }

    const entry = {
      level: LOG_LEVEL_MAP[info.level] || 'info',
      tag: info.tag || info.label || info.level,
      message: info.message || '',
      meta: info.meta ? info.meta : undefined,
      sessionId: info.sessionId || undefined,
      userId: info.userId || undefined,
      cameraId: info.cameraId || undefined,
    };

    this.buffer.push(entry);

    if (this.buffer.length >= this.batchSize) {
      this._flush();
    }

    callback();
  }

  _startFlushTimer() {
    this.flushTimer = setInterval(() => this._flush(), this.flushIntervalMs);
    if (this.flushTimer.unref) this.flushTimer.unref();
  }

  _flush() {
    if (this.buffer.length === 0) return;
    if (!this.prisma) return;
    const batch = this.buffer.splice(0);
    this.prisma.log.createMany({ data: batch, skipDuplicates: true })
      .catch(() => {});
  }

  close() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    this._flush();
  }
}

module.exports = { DbTransport };
