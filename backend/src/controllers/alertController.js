const { prisma } = require('../config/database');
const { sendMotionAlert } = require('../services/notificationService');
const logger = require('../config/logger');

// ── GET /api/alerts ───────────────────────────────────────────
async function listAlerts(req, res, next) {
  try {
    const { page = 1, limit = 30, unreadOnly, cameraId } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where = {
      userId: req.user.id,
      ...(unreadOnly === 'true' && { read: false }),
      ...(cameraId && { cameraId }),
    };

    const [alerts, total, unreadCount] = await Promise.all([
      prisma.alert.findMany({ where, skip, take: Number(limit), orderBy: { createdAt: 'desc' } }),
      prisma.alert.count({ where }),
      prisma.alert.count({ where: { userId: req.user.id, read: false } }),
    ]);

    res.json({
      success: true,
      data: alerts,
      unreadCount,
      pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) },
    });
  } catch (err) { next(err); }
}

// ── POST /api/alerts/motion (triggered by camera device) ─────
async function motionAlert(req, res, next) {
  try {
    const { cameraId, thumbnailUrl } = req.body;

    const camera = await prisma.camera.findUnique({
      where: { id: cameraId },
      include: { user: true },
    });
    if (!camera) return res.status(404).json({ success: false, message: 'Camera not found' });
    if (camera.userId !== req.user.id) return res.status(403).json({ success: false, message: 'Access denied' });

    const alert = await prisma.alert.create({
      data: {
        type: 'MOTION',
        message: `Motion detected on ${camera.name}`,
        thumbnailUrl,
        cameraId,
        userId: camera.userId,
      },
    });

    // Fire-and-forget notifications
    sendMotionAlert(camera.user, camera, thumbnailUrl).catch((e) =>
      logger.warn('Motion notification failed', { err: e.message })
    );

    res.status(201).json({ success: true, data: alert });
  } catch (err) { next(err); }
}

// ── PATCH /api/alerts/:alertId/read ──────────────────────────
async function markRead(req, res, next) {
  try {
    await prisma.alert.update({ where: { id: req.params.alertId }, data: { read: true } });
    res.json({ success: true, message: 'Alert marked as read' });
  } catch (err) { next(err); }
}

// ── PATCH /api/alerts/read-all ────────────────────────────────
async function markAllRead(req, res, next) {
  try {
    await prisma.alert.updateMany({ where: { userId: req.user.id, read: false }, data: { read: true } });
    res.json({ success: true, message: 'All alerts marked as read' });
  } catch (err) { next(err); }
}

// ── DELETE /api/alerts/:alertId ───────────────────────────────
async function deleteAlert(req, res, next) {
  try {
    await prisma.alert.deleteMany({ where: { id: req.params.alertId, userId: req.user.id } });
    res.json({ success: true, message: 'Alert deleted' });
  } catch (err) { next(err); }
}

module.exports = { listAlerts, motionAlert, markRead, markAllRead, deleteAlert };
