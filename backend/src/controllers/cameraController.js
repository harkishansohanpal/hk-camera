const { prisma } = require('../config/database');
const { getIO } = require('../socket/signalingServer');
const logger = require('../config/logger');

// ── GET /api/cameras ──────────────────────────────────────────
async function listCameras(req, res, next) {
  try {
    const cameras = await prisma.camera.findMany({
      where: { userId: req.user.id },
      include: { _count: { select: { recordings: true, alerts: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: cameras });
  } catch (err) { next(err); }
}

// ── POST /api/cameras ─────────────────────────────────────────
async function createCamera(req, res, next) {
  try {
    const { name, description, motionDetect, sensitivity, recordOnMotion, twoWayAudio, exposure, focus, whiteBalance, iso, brightness, contrast } = req.body;
    const camera = await prisma.camera.create({
      data: { name, description, motionDetect, sensitivity, recordOnMotion, twoWayAudio, exposure, focus, whiteBalance, iso, brightness, contrast, userId: req.user.id },
    });
    logger.info('Camera created', { cameraId: camera.id, userId: req.user.id });
    res.status(201).json({ success: true, data: camera });
  } catch (err) { next(err); }
}

// ── GET /api/cameras/:cameraId ────────────────────────────────
async function getCamera(req, res, next) {
  try {
    const camera = await prisma.camera.findUnique({
      where: { id: req.params.cameraId },
      include: {
        _count: { select: { recordings: true, alerts: true } },
        recordings: { take: 5, orderBy: { createdAt: 'desc' } },
        alerts:     { take: 5, orderBy: { createdAt: 'desc' } },
      },
    });
    if (!camera) return res.status(404).json({ success: false, message: 'Camera not found' });
    res.json({ success: true, data: camera });
  } catch (err) { next(err); }
}

// ── PATCH /api/cameras/:cameraId ──────────────────────────────
async function updateCamera(req, res, next) {
  try {
    const { name, description, motionDetect, sensitivity, recordOnMotion, twoWayAudio, nightVision, exposure, focus, whiteBalance, iso, brightness, contrast } = req.body;
    const camera = await prisma.camera.update({
      where: { id: req.params.cameraId },
      data: { name, description, motionDetect, sensitivity, recordOnMotion, twoWayAudio, nightVision, exposure, focus, whiteBalance, iso, brightness, contrast },
    });
    res.json({ success: true, data: camera });
  } catch (err) { next(err); }
}

// ── DELETE /api/cameras/:cameraId ─────────────────────────────
async function deleteCamera(req, res, next) {
  try {
    await prisma.camera.delete({ where: { id: req.params.cameraId } });
    logger.info('Camera deleted', { cameraId: req.params.cameraId });
    res.json({ success: true, message: 'Camera deleted' });
  } catch (err) { next(err); }
}

// ── GET /api/cameras/:cameraId/stream-key ─────────────────────
async function getStreamKey(req, res, next) {
  try {
    const camera = await prisma.camera.findUnique({
      where: { id: req.params.cameraId },
      select: { streamKey: true },
    });
    if (!camera) return res.status(404).json({ success: false, message: 'Camera not found' });
    res.json({ success: true, data: { streamKey: camera.streamKey } });
  } catch (err) { next(err); }
}

// ── POST /api/cameras/:cameraId/stream-key/rotate ────────────
async function rotateStreamKey(req, res, next) {
  try {
    const { v4: uuidv4 } = require('uuid');
    const camera = await prisma.camera.update({
      where: { id: req.params.cameraId },
      data: { streamKey: uuidv4() },
      select: { streamKey: true },
    });
    res.json({ success: true, data: { streamKey: camera.streamKey } });
  } catch (err) { next(err); }
}

// ── POST /api/cameras/:cameraId/heartbeat (called by camera device) ──
async function heartbeat(req, res, next) {
  try {
    await prisma.camera.update({
      where: { id: req.params.cameraId },
      data: { isOnline: true, lastSeen: new Date() },
    });
    // Notify connected viewers
    getIO().to(req.params.cameraId).emit('camera:status', { cameraId: req.params.cameraId, online: true });
    res.json({ success: true });
  } catch (err) { next(err); }
}

module.exports = { listCameras, createCamera, getCamera, updateCamera, deleteCamera, getStreamKey, rotateStreamKey, heartbeat };
