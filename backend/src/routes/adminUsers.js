const { Router } = require('express');
const fs = require('fs');
const { prisma } = require('../config/database');
const logger = require('../config/logger');

const router = Router();

// ── GET /api/admin/users?email=&q=&all=true&page=1&limit=50 ────
router.get('/', async (req, res, next) => {
  try {
    const { email, q, all, page = '1', limit = '50' } = req.query;

    // ── Exact email lookup (returns full user details) ─────────
    if (email) {
      const user = await prisma.user.findUnique({
        where: { email },
        include: {
          cameras: {
            include: { recordings: { orderBy: { createdAt: 'desc' }, take: 200 } },
          },
          alerts: { orderBy: { createdAt: 'desc' }, take: 200 },
          subscription: true,
        },
      });

      if (!user) return res.status(404).json({ success: false, message: 'User not found' });

      const data = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isDemo: user.isDemo,
        createdAt: user.createdAt,
        consentGivenAt: user.consentGivenAt,
        consentVersion: user.consentVersion,
        termsConsentAt: user.termsConsentAt,
        termsConsentVersion: user.termsConsentVersion,
        consentIp: user.consentIp,
        doNotSell: user.doNotSell,
        suspended: user.suspended,
        suspendedAt: user.suspendedAt,
        suspensionReason: user.suspensionReason,
        legalHold: user.legalHold,
        cameras: user.cameras.map((c) => ({
          id: c.id,
          name: c.name,
          streamKey: c.streamKey,
          createdAt: c.createdAt,
          recordingCount: c.recordings.length,
          recordings: c.recordings.map((r) => ({
            id: r.id,
            url: r.url,
            size: r.size,
            duration: r.duration,
            trigger: r.trigger,
            createdAt: r.createdAt,
          })),
        })),
        alerts: user.alerts.map((a) => ({
          id: a.id,
          type: a.type,
          message: a.message,
          cameraId: a.cameraId,
          createdAt: a.createdAt,
        })),
        subscription: user.subscription
          ? { planId: user.subscription.planId, status: user.subscription.status }
          : null,
      };

      logger.info('Admin', 'User lookup', { targetEmail: email, adminId: req.user.id });
      return res.json({ success: true, data });
    }

    // ── List users (search by name/email, or show all) ────────
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const where = {};
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
      ];
    } else if (!all) {
      return res.status(422).json({ success: false, message: 'Provide email, q, or all=true' });
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isDemo: true,
          createdAt: true,
          suspended: true,
          legalHold: true,
          cameras: { select: { id: true, name: true, streamKey: true, createdAt: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);

    logger.info('Admin', 'User list', { query: q || '(all)', total, adminId: req.user.id });
    res.json({ success: true, data: { users, total, page: pageNum, limit: limitNum } });
  } catch (err) { next(err); }
});

// ── PATCH /api/admin/users/:userId/suspend ──────────────────────
router.patch('/:userId/suspend', async (req, res, next) => {
  try {
    const { reason } = req.body;
    const user = await prisma.user.update({
      where: { id: req.params.userId },
      data: { suspended: true, suspendedAt: new Date(), suspensionReason: reason || null },
      select: { id: true, email: true, name: true, suspended: true, suspendedAt: true, suspensionReason: true },
    });

    logger.info('Admin', 'User suspended', { targetId: user.id, reason, adminId: req.user.id });
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
});

// ── PATCH /api/admin/users/:userId/unsuspend ────────────────────
router.patch('/:userId/unsuspend', async (req, res, next) => {
  try {
    const user = await prisma.user.update({
      where: { id: req.params.userId },
      data: { suspended: false, suspendedAt: null, suspensionReason: null },
      select: { id: true, email: true, name: true, suspended: true },
    });

    logger.info('Admin', 'User unsuspended', { targetId: user.id, adminId: req.user.id });
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
});

// ── PUT /api/admin/users/:userId/legal-hold ─────────────────────
router.put('/:userId/legal-hold', async (req, res, next) => {
  try {
    const { enabled } = req.body;
    const user = await prisma.user.update({
      where: { id: req.params.userId },
      data: { legalHold: enabled === true },
      select: { id: true, email: true, name: true, legalHold: true },
    });

    logger.info('Admin', 'Legal hold toggled', { targetId: user.id, enabled: !!enabled, adminId: req.user.id });
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
});

// ── PUT /api/admin/users/:userId/export ─────────────────────────
router.put('/:userId/export', async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.userId },
      include: {
        cameras: {
          include: { recordings: { orderBy: { createdAt: 'desc' } } },
        },
        alerts: { orderBy: { createdAt: 'desc' } },
        subscription: true,
      },
    });

    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const exportObj = {
      exportedAt: new Date().toISOString(),
      exportedBy: req.user.id,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isDemo: user.isDemo,
        createdAt: user.createdAt,
        consentGivenAt: user.consentGivenAt,
        consentVersion: user.consentVersion,
        termsConsentAt: user.termsConsentAt,
        termsConsentVersion: user.termsConsentVersion,
        consentIp: user.consentIp,
        doNotSell: user.doNotSell,
        suspended: user.suspended,
        suspendedAt: user.suspendedAt,
        suspensionReason: user.suspensionReason,
        legalHold: user.legalHold,
      },
      cameras: user.cameras.map((c) => ({
        id: c.id,
        name: c.name,
        streamKey: c.streamKey,
        createdAt: c.createdAt,
        recordings: c.recordings.map((r) => ({
          id: r.id,
          url: r.url,
          size: r.size,
          duration: r.duration,
          trigger: r.trigger,
          createdAt: r.createdAt,
        })),
      })),
      alerts: user.alerts.map((a) => ({
        id: a.id,
        type: a.type,
        message: a.message,
        cameraId: a.cameraId,
        createdAt: a.createdAt,
      })),
      subscription: user.subscription
        ? { planId: user.subscription.planId, status: user.subscription.status }
        : null,
    };

    logger.info('Admin', 'User data exported', { targetId: user.id, adminId: req.user.id });
    res.json({ success: true, data: exportObj });
  } catch (err) { next(err); }
});

// ── DELETE /api/admin/recordings/:id ────────────────────────────
router.delete('/recordings/:id', async (req, res, next) => {
  try {
    const recording = await prisma.recording.findUnique({ where: { id: req.params.id } });
    if (!recording) return res.status(404).json({ success: false, message: 'Recording not found' });

    try { fs.unlinkSync(recording.url); } catch { /* file may not exist */ }

    await prisma.recording.delete({ where: { id: req.params.id } });

    logger.info('Admin', 'Recording deleted', { recordingId: req.params.id, adminId: req.user.id });
    res.json({ success: true, message: 'Recording deleted' });
  } catch (err) { next(err); }
});

// ── DELETE /api/admin/cameras/:id ───────────────────────────────
router.delete('/cameras/:id', async (req, res, next) => {
  try {
    const camera = await prisma.camera.findUnique({ where: { id: req.params.id } });
    if (!camera) return res.status(404).json({ success: false, message: 'Camera not found' });

    await prisma.recording.deleteMany({ where: { cameraId: req.params.id } });
    await prisma.camera.delete({ where: { id: req.params.id } });

    logger.info('Admin', 'Camera deleted', { cameraId: req.params.id, adminId: req.user.id });
    res.json({ success: true, message: 'Camera and associated recordings deleted' });
  } catch (err) { next(err); }
});

module.exports = router;
