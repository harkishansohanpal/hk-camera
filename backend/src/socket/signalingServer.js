/**
 * WebRTC Signaling Server
 * ─────────────────────────────────────────────────────────────
 * Roles:
 *   camera  – the device broadcasting the feed
 *   viewer  – web client consuming the feed
 *
 * Flow:
 *   1. Camera joins room  `camera:<streamKey>`
 *   2. Viewer joins room  `camera:<streamKey>`
 *   3. Viewer sends  `viewer:offer`    → forwarded to camera
 *   4. Camera sends  `camera:answer`   → forwarded to viewer
 *   5. Both sides exchange `ice:candidate` as needed
 *   6. Two-way audio renegotiation uses the same viewer:offer / camera:answer flow
 */

const jwt = require('jsonwebtoken');
const { prisma } = require('../config/database');
const logger = require('../config/logger');
const reportScheduler = require('../services/reportScheduler');

let io = null;

// Map of streamKey → Set of socket IDs (viewers)
const viewers = new Map();
// Map of streamKey → camera socket ID
const cameras = new Map();
// Map of streamKey → { viewerSocketId → joinedAt }
const viewerSessions = new Map();

// Map of streamKey → last offline emit timestamp
const lastOfflineEmit = new Map();

function initSignalingServer(socketIO) {
  io = socketIO;

  io.use(async (socket, next) => {
    // Allow either JWT auth or streamKey auth (for camera devices)
    const { token, streamKey } = socket.handshake.auth;

    if (streamKey) {
      // Camera device authenticates with its stream key
      const camera = await prisma.camera.findUnique({
        where: { streamKey },
        include: { user: { select: { id: true } } },
      });
      if (!camera) return next(new Error('Invalid stream key'));
      socket.cameraId  = camera.id;
      socket.streamKey = streamKey;
      socket.role      = 'camera';
      socket.userId    = camera.user.id;
      return next();
    }

    if (token) {
      try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        socket.userId = payload.sub;
        socket.role   = 'viewer';
        return next();
      } catch {
        return next(new Error('Invalid token'));
      }
    }

    next(new Error('Authentication required'));
  });

  io.on('connection', (socket) => {
    logger.debug(`Socket connected [${socket.role}]`, { socketId: socket.id, userId: socket.userId });

    // Auto-join JWT-authenticated sockets to their user room for real-time camera status
    if (socket.role === 'viewer') {
      socket.join(`user:${socket.userId}`);
    }

    // ── Camera joins ──────────────────────────────────────────
    if (socket.role === 'camera') {
      const key = socket.streamKey;
      cameras.set(key, socket.id);

      socket.join(`camera:${key}`);

      logger.info('Signaling', 'Camera connected', { cameraId: socket.cameraId, streamKey: key });

      // Update DB online status
      prisma.camera.update({ where: { id: socket.cameraId }, data: { isOnline: true, lastSeen: new Date() } })
        .catch((err) => logger.warn('Failed to persist camera online status', { cameraId: socket.cameraId, error: err.message }));

      // Start 5-min report heartbeat for this session
      reportScheduler.startSession(socket.cameraId);

      // Notify any waiting viewers
      io.to(`camera:${key}`).emit('camera:online', { cameraId: socket.cameraId });
      // Notify the camera owner's Dashboard and other pages in real-time
      io.to(`user:${socket.userId}`).emit('camera:online', { cameraId: socket.cameraId });

      socket.on('disconnect', () => {
        // Only delete if this socket is still the registered camera (handles stale reconnect races)
        if (cameras.get(key) === socket.id) {
          reportScheduler.endSession(socket.cameraId);
          cameras.delete(key);
          prisma.camera.update({ where: { id: socket.cameraId }, data: { isOnline: false } }).catch((err) => logger.warn('Failed to persist camera offline status', { cameraId: socket.cameraId, error: err.message }));
          
          // Debounce offline emission to prevent duplicate events
          const now = Date.now();
          const lastEmit = lastOfflineEmit.get(key) || 0;
          if (now - lastEmit > 1000) {
            lastOfflineEmit.set(key, now);
            io.to(`camera:${key}`).emit('camera:offline', { cameraId: socket.cameraId });
            io.to(`user:${socket.userId}`).emit('camera:offline', { cameraId: socket.cameraId });
          }
          
          logger.info('Signaling', 'Camera disconnected', { cameraId: socket.cameraId, streamKey: key });
        }
      });

      // Re-register after socket.io reconnection (disconnect handler removes from map)
      socket.on('camera:reconnect', () => {
        const key = socket.streamKey;
        if (!key) return;
        cameras.set(key, socket.id);
        prisma.camera.update({ where: { id: socket.cameraId }, data: { isOnline: true, lastSeen: new Date() } })
          .catch((err) => logger.warn('Failed to persist camera reconnection status', { cameraId: socket.cameraId, error: err.message }));
        io.to(`camera:${key}`).emit('camera:online', { cameraId: socket.cameraId });
        io.to(`user:${socket.userId}`).emit('camera:online', { cameraId: socket.cameraId });
        logger.info('Signaling', 'Camera reconnected', { cameraId: socket.cameraId, streamKey: key });
      });

      // Forward answer to the specific viewer
      socket.on('camera:answer', ({ viewerSocketId, answer }) => {
        io.to(viewerSocketId).emit('camera:answer', { answer });
        logger.debug('Answer forwarded to viewer', { viewerSocketId });
      });

      // Forward ICE candidates to viewer
      socket.on('ice:candidate', ({ viewerSocketId, candidate }) => {
        io.to(viewerSocketId).emit('ice:candidate', { candidate, from: 'camera' });
      });

    }

    // ── Viewer joins ──────────────────────────────────────────
    if (socket.role === 'viewer') {
      socket.on('viewer:join', async ({ streamKey }) => {
        // Verify viewer owns or has access to this camera
        const camera = await prisma.camera.findUnique({
          where: { streamKey },
          select: { id: true, userId: true, isOnline: true },
        });

        logger.debug('Viewer join attempt', { streamKey, userId: socket.userId, cameraFound: !!camera });

        if (!camera) {
          logger.warn('Viewer join failed: camera not found', { streamKey });
          socket.emit('error', { message: 'Camera not found' });
          return;
        }

        if (camera.userId !== socket.userId) {
          logger.warn('Viewer join failed: access denied', { cameraUserId: camera.userId, viewerUserId: socket.userId });
          socket.emit('error', { message: 'Access denied' });
          return;
        }

        socket.join(`camera:${streamKey}`);
        socket.streamKey = streamKey;
        socket.cameraId  = camera.id;

        // Track viewer set
        if (!viewers.has(streamKey)) viewers.set(streamKey, new Set());
        viewers.get(streamKey).add(socket.id);

        // Track session start
        if (!viewerSessions.has(streamKey)) viewerSessions.set(streamKey, new Map());
        viewerSessions.get(streamKey).set(socket.id, Date.now());
        logger.info('Signaling', 'Viewer joined', { streamKey, viewerSocketId: socket.id, viewerCount: viewers.get(streamKey)?.size });

        // Use in-memory map as source of truth (DB update is async/fire-and-forget)
        const cameraIsOnline = cameras.has(streamKey);
        socket.emit('camera:status', { online: cameraIsOnline, cameraId: camera.id });

        // Let camera know a viewer is ready to receive
        const cameraSocketId = cameras.get(streamKey);
        if (cameraSocketId) {
          io.to(cameraSocketId).emit('viewer:joined', { viewerSocketId: socket.id });
        }

        logger.debug('Viewer joined camera room', { viewerSocketId: socket.id, cameraId: camera.id });
      });

      // Forward offer to camera
      socket.on('viewer:offer', ({ offer }) => {
        const cameraSocketId = cameras.get(socket.streamKey);
        if (!cameraSocketId) {
          socket.emit('error', { message: 'Camera is not online' });
          return;
        }
        io.to(cameraSocketId).emit('viewer:offer', { viewerSocketId: socket.id, offer });
        logger.debug('Offer forwarded to camera', { cameraSocketId });
      });

      // Forward ICE candidates to camera
      socket.on('ice:candidate', ({ candidate }) => {
        const cameraSocketId = cameras.get(socket.streamKey);
        if (cameraSocketId) {
          io.to(cameraSocketId).emit('ice:candidate', { viewerSocketId: socket.id, candidate, from: 'viewer' });
        }
      });

      // Forward remote control commands to camera (torch, screen dim, background mode)
      socket.on('viewer:command', ({ command, payload }) => {
        const cameraSocketId = cameras.get(socket.streamKey);
        if (cameraSocketId) {
          io.to(cameraSocketId).emit('viewer:command', { command, payload });
        }
      });

      socket.on('disconnect', () => {
        if (socket.streamKey) {
          viewers.get(socket.streamKey)?.delete(socket.id);
          // Log session duration
          const sessions = viewerSessions.get(socket.streamKey);
          const joinedAt = sessions?.get(socket.id);
          const sessionDurationSec = joinedAt ? Math.round((Date.now() - joinedAt) / 1000) : null;
          sessions?.delete(socket.id);
          if (sessionDurationSec !== null) {
            logger.info('Signaling', 'Viewer left', { streamKey: socket.streamKey, viewerSocketId: socket.id, sessionDurationSec });
          }
          // Inform camera the viewer left
          const cameraSocketId = cameras.get(socket.streamKey);
          if (cameraSocketId) {
            io.to(cameraSocketId).emit('viewer:left', { viewerSocketId: socket.id });
          }
        }
        logger.debug('Signaling', 'Viewer disconnected', { socketId: socket.id });
      });
    }
  });

  logger.info('✅ WebRTC signaling server initialised');
}

function isCameraOnline(streamKey) {
  return cameras.has(streamKey);
}

module.exports = { initSignalingServer, isCameraOnline };
