const jwt = require('jsonwebtoken');
const { prisma } = require('../config/database');
const logger = require('../config/logger');

/**
 * Verifies the Bearer JWT in the Authorization header.
 * Attaches req.user = { id, email, role } on success.
 */
async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, name: true, role: true, isDemo: true },
    });

    if (!user) return res.status(401).json({ success: false, message: 'User not found' });

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expired' });
    }
    logger.warn('JWT verification failed', { error: err.message });
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
}

/**
 * Requires the authenticated user to have the ADMIN role.
 * Must be used AFTER `authenticate`.
 */
function requireAdmin(req, res, next) {
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }
  next();
}

/**
 * Verifies that the authenticated user owns the camera with the given :cameraId param.
 */
async function ownCamera(req, res, next) {
  const { cameraId } = req.params;
  const camera = await prisma.camera.findUnique({ where: { id: cameraId }, select: { userId: true } });

  if (!camera) return res.status(404).json({ success: false, message: 'Camera not found' });
  if (camera.userId !== req.user.id && req.user.role !== 'ADMIN') {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }

  next();
}

/**
 * Blocks demo users from mutating routes (403).
 */
function requireNotDemo(req, res, next) {
  if (req.user?.isDemo) {
    return res.status(403).json({ success: false, message: 'Demo accounts are read-only' });
  }
  next();
}

module.exports = { authenticate, requireAdmin, ownCamera, requireNotDemo };
