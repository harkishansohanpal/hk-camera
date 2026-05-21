require('dotenv').config();
const http = require('http');
const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { Server } = require('socket.io');

const logger = require('./config/logger');
const { connectDatabase } = require('./config/database');
const { connectRedis } = require('./config/redis');
const { initSignalingServer } = require('./socket/signalingServer');
const { apiLimiter } = require('./middleware/rateLimiter');
const { errorHandler, notFound } = require('./middleware/errorHandler');

// ── Route modules ─────────────────────────────────────────────
const authRoutes       = require('./routes/auth');
const cameraRoutes     = require('./routes/cameras');
const alertRoutes      = require('./routes/alerts');
const recordingRoutes  = require('./routes/recordings');
const userRoutes       = require('./routes/users');
const turnRoutes       = require('./routes/turn');
const subscriptionRoutes = require('./routes/subscriptions');
const detectRoutes      = require('./routes/detect');
const webhookRoutes    = require('./routes/webhook');

// ── Express app ───────────────────────────────────────────────
const app = express();
const server = http.createServer(app);

// ── Socket.IO (WebRTC signaling) ──────────────────────────────
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production'
      ? process.env.CLIENT_URL
      : true,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
});

// ── Trust proxy (Fly.io / Cloudflare) ─────────────────────────
app.set('trust proxy', 1);

// ── Core middleware ───────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // needed for video recordings
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc:  ["'self'"],
      styleSrc:   ["'self'", "'unsafe-inline'"],
      imgSrc:     ["'self'", 'data:', 'blob:'],
      mediaSrc:   ["'self'", 'blob:', 'mediastream:'],
      connectSrc: ["'self'", 'wss:', 'https:'],
      workerSrc:  ["'self'", 'blob:'],
      frameSrc:   ["'none'"],
      objectSrc:  ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
}));
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? process.env.CLIENT_URL
    : process.env.CLIENT_URL || true,
  credentials: true,
}));

// Stripe webhook must be before JSON body parser (needs raw body)
app.use('/api/webhook', webhookRoutes);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
// ── Log sanitisation: strip sensitive headers from HTTP logs
const SENSITIVE_HEADERS = /authorization|cookie|set-cookie|x-auth-token/i;
function sanitiseHeaders(headers) {
  const sanitised = { ...headers };
  for (const key of Object.keys(sanitised)) {
    if (SENSITIVE_HEADERS.test(key)) sanitised[key] = '[REDACTED]';
  }
  return sanitised;
}

morgan.token('sanitised-headers', (req) => JSON.stringify(sanitiseHeaders(req.headers)));

app.use(morgan(process.env.NODE_ENV === 'production'
  ? ':remote-addr :method :url :status :res[content-length] - :response-time ms'
  : 'dev'
));

// ── Static file serving ───────────────────────────────────────
app.use('/uploads',    express.static(path.resolve(process.env.LOCAL_UPLOAD_DIR    || './uploads')));
app.use('/recordings', express.static(path.resolve(process.env.LOCAL_RECORDING_DIR || './recordings')));

// ── Health check ──────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ success: true, uptime: process.uptime(), timestamp: new Date().toISOString() });
});

// ── API routes ────────────────────────────────────────────────
app.use('/api',              apiLimiter);
app.use('/api/auth',         authRoutes);
app.use('/api/cameras',      cameraRoutes);
app.use('/api/alerts',       alertRoutes);
app.use('/api/recordings',   recordingRoutes);
app.use('/api/users',        userRoutes);
app.use('/api/turn-credentials', turnRoutes);
app.use('/api/detect',       detectRoutes);
app.use('/api/subscriptions', subscriptionRoutes);

// ── Admin routes (require ADMIN role) ─────────────────────────
const { authenticate, requireAdmin } = require('./middleware/auth');
const adminRoutes = require('./routes/admin');
app.use('/api/admin', authenticate, requireAdmin, adminRoutes);

// ── 404 + global error handler ────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ── Bootstrap ─────────────────────────────────────────────────
async function bootstrap() {
  try {
    await connectDatabase();

    // Redis is optional – won't crash server if unavailable in dev
    try { await connectRedis(); } catch { logger.warn('Redis unavailable – continuing without it'); }

    initSignalingServer(io);

    const PORT = Number(process.env.PORT) || 5000;
    server.listen(PORT, () => {
      logger.info(`🚀 HK Camera backend running on port ${PORT}`);
      logger.info(`   Environment : ${process.env.NODE_ENV}`);
      logger.info(`   Client URL  : ${process.env.CLIENT_URL}`);
    });
  } catch (err) {
    logger.error('Failed to start server', { err: err.message });
    process.exit(1);
  }
}

// ── Graceful shutdown ─────────────────────────────────────────
process.on('SIGTERM', () => {
  logger.info('SIGTERM received – shutting down gracefully');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

if (process.env.NODE_ENV !== 'test') {
  bootstrap();
}

module.exports = { app, server }; // for tests
