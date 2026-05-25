/**
 * DB Logger Transport
 * Writes winston log entries to the Log table via Prisma.
 * Buffers logs and flushes every 5s to batch DB writes.
 */
const Transport = require('winston-transport');
const { prisma } = require('./database');

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
    this.name = 'DbTransport';
    this.batchSize = opts.batchSize || 50;
    this.flushIntervalMs = opts.flushIntervalMs || 5000;
    this._startFlushTimer();
  }

  log(info, callback) {
    const entry = {
      level: LOG_LEVEL_MAP[info.level] || 'info',
      tag: info.tag || info.label || info.level,
      message: info.message || '',
      meta: info.meta || undefined,
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
    const batch = this.buffer.splice(0);
    prisma.log.createMany({ data: batch, skipDuplicates: true })
      .catch((err) => {
        console.error('[dbLogger] Failed to write logs to DB:', err.message);
      });
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
