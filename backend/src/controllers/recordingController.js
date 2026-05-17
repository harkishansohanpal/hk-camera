const path = require('path');
const fs = require('fs');
const { prisma } = require('../config/database');
const { uploadToS3, getPresignedUrl } = require('../config/storage');
const { sendRecordingCompleteAlert } = require('../services/notificationService');
const logger = require('../config/logger');

// ── Convert S3 URL to presigned URL ───────────────────────────
function s3KeyFromUrl(s3Url) {
  try { return new URL(s3Url).pathname.replace(/^\//, ''); } catch { return null; }
}

async function signS3Url(s3Url) {
  const key = s3KeyFromUrl(s3Url);
  if (!key) return s3Url;
  try { return await getPresignedUrl(key); } catch { return s3Url; }
}

// ── GET /api/cameras/:cameraId/recordings ─────────────────────
async function listRecordings(req, res, next) {
  try {
    const { page = 1, limit = 20, trigger } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where = {
      cameraId: req.params.cameraId,
      ...(trigger && { trigger }),
    };

    const [raw, total] = await Promise.all([
      prisma.recording.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.recording.count({ where }),
    ]);

    const data = await Promise.all(raw.map(async (r) => ({
      ...r,
      url: process.env.STORAGE_STRATEGY === 's3' ? await signS3Url(r.url) : r.url,
    })));

    res.json({
      success: true,
      data,
      pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) },
    });
  } catch (err) { next(err); }
}

// ── GET /api/recordings ───────────────────────────────────────
async function listAllRecordings(req, res, next) {
  try {
    const { page = 1, limit = 20, trigger, cameraId } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where = {
      camera: { userId: req.user.id },
      ...(trigger && { trigger }),
      ...(cameraId && { cameraId }),
    };

    const [raw, total] = await Promise.all([
      prisma.recording.findMany({
        where,
        include: { camera: { select: { id: true, name: true } } },
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.recording.count({ where }),
    ]);

    const data = await Promise.all(raw.map(async (r) => ({
      ...r,
      url: process.env.STORAGE_STRATEGY === 's3' ? await signS3Url(r.url) : r.url,
    })));

    res.json({
      success: true,
      data,
      pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) },
    });
  } catch (err) { next(err); }
}

// ── POST /api/cameras/:cameraId/recordings (upload a recording) ──
async function createRecording(req, res, next) {
  try {
    const { cameraId } = req.params;
    const { trigger = 'MANUAL', duration } = req.body;

    if (!req.file) return res.status(400).json({ success: false, message: 'No video file uploaded' });

    let url = '';

    if (process.env.STORAGE_STRATEGY === 's3') {
      const key = `recordings/${cameraId}/${req.file.filename}`;
      const fileBuffer = fs.readFileSync(req.file.path);
      url = await uploadToS3(key, fileBuffer, req.file.mimetype);
      fs.unlinkSync(req.file.path); // clean up temp file
    } else {
      // Local storage – serve via /recordings/ static route
      url = `/recordings/${req.file.filename}`;
    }

    const recording = await prisma.recording.create({
      data: {
        filename: req.file.filename,
        url,
        size: req.file.size,
        duration: duration ? Number(duration) : null,
        trigger,
        cameraId,
      },
    });

    // Fire-and-forget notification
    const camera = await prisma.camera.findUnique({
      where: { id: cameraId },
      include: { user: true },
    });
    sendRecordingCompleteAlert(camera.user, camera, recording).catch((e) =>
      logger.warn('Notification failed', { err: e.message })
    );

    logger.info('Recording saved', { recordingId: recording.id, cameraId, trigger });
    res.status(201).json({ success: true, data: recording });
  } catch (err) { next(err); }
}

// ── DELETE /api/recordings/:recordingId ───────────────────────
async function deleteRecording(req, res, next) {
  try {
    const recording = await prisma.recording.findUnique({ where: { id: req.params.recordingId } });
    if (!recording) return res.status(404).json({ success: false, message: 'Recording not found' });

    // Delete physical file (local strategy)
    if (process.env.STORAGE_STRATEGY !== 's3') {
      const filePath = path.resolve(process.env.LOCAL_RECORDING_DIR || './recordings', recording.filename);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    await prisma.recording.delete({ where: { id: req.params.recordingId } });
    res.json({ success: true, message: 'Recording deleted' });
  } catch (err) { next(err); }
}

// ── DELETE /api/recordings/bulk-delete ───────────────────────
async function deleteRecordingsBulk(req, res, next) {
  try {
    const { recordingIds } = req.body;
    if (!Array.isArray(recordingIds) || recordingIds.length === 0) {
      return res.status(400).json({ success: false, message: 'recordingIds must be a non-empty array' });
    }

    // Get recordings to check ownership and get filenames
    const recordings = await prisma.recording.findMany({
      where: { id: { in: recordingIds }, camera: { userId: req.user.id } },
      select: { id: true, filename: true },
    });

    if (recordings.length !== recordingIds.length) {
      return res.status(404).json({ success: false, message: 'Some recordings not found or access denied' });
    }

    // Delete physical files (local strategy)
    if (process.env.STORAGE_STRATEGY !== 's3') {
      recordings.forEach((rec) => {
        const filePath = path.resolve(process.env.LOCAL_RECORDING_DIR || './recordings', rec.filename);
        if (fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath);
          } catch (err) {
            logger.warn('Failed to delete file', { filename: rec.filename, error: err.message });
          }
        }
      });
    }

    // Delete from database
    await prisma.recording.deleteMany({
      where: { id: { in: recordingIds } },
    });

    logger.info('Bulk recordings deleted', { count: recordingIds.length, userId: req.user.id });
    res.json({ success: true, message: `${recordingIds.length} recordings deleted` });
  } catch (err) { next(err); }
}

// ── GET /api/recordings/:recordingId ─────────────────────────
async function getRecording(req, res, next) {
  try {
    const recording = await prisma.recording.findUnique({
      where: { id: req.params.recordingId },
      include: { camera: { select: { id: true, name: true, userId: true } } },
    });
    if (!recording) return res.status(404).json({ success: false, message: 'Recording not found' });
    if (recording.camera.userId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    if (process.env.STORAGE_STRATEGY === 's3') {
      recording.url = await signS3Url(recording.url);
    }
    res.json({ success: true, data: recording });
  } catch (err) { next(err); }
}

module.exports = { listRecordings, listAllRecordings, createRecording, deleteRecording, deleteRecordingsBulk, getRecording };
