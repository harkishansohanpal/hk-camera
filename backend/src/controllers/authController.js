const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { prisma } = require('../config/database');
const logger = require('../config/logger');

// ── Token helpers ─────────────────────────────────────────────
function signAccessToken(userId) {
  return jwt.sign({ sub: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  });
}

function signRefreshToken(userId) {
  return jwt.sign({ sub: userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  });
}

function refreshTokenExpiry() {
  const days = parseInt(process.env.JWT_REFRESH_EXPIRES_IN || '7d', 10);
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

// ── POST /api/auth/register ───────────────────────────────────
async function register(req, res, next) {
  try {
    const { email, password, name, consent } = req.body;

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) return res.status(409).json({ success: false, message: 'Email already in use' });

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        email, passwordHash, name,
        consentGivenAt: new Date(),
        consentVersion: '2026-05-21',
        termsConsentAt: new Date(),
        termsConsentVersion: '2026-05-21',
        consentIp: req.ip || req.connection?.remoteAddress || null,
      },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });

    const accessToken  = signAccessToken(user.id);
    const refreshToken = signRefreshToken(user.id);
    await prisma.refreshToken.create({
      data: { token: refreshToken, userId: user.id, expiresAt: refreshTokenExpiry() },
    });

    logger.info('User registered', { userId: user.id });
    res.status(201).json({ success: true, data: { user, accessToken, refreshToken } });
  } catch (err) {
    next(err);
  }
}

// ── POST /api/auth/login ──────────────────────────────────────
async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const accessToken  = signAccessToken(user.id);
    const refreshToken = signRefreshToken(user.id);
    await prisma.refreshToken.create({
      data: { token: refreshToken, userId: user.id, expiresAt: refreshTokenExpiry() },
    });

    const { passwordHash, ...safeUser } = user;
    logger.info('User logged in', { userId: user.id });
    res.json({ success: true, data: { user: safeUser, accessToken, refreshToken } });
  } catch (err) {
    next(err);
  }
}

// ── POST /api/auth/refresh ────────────────────────────────────
async function refresh(req, res, next) {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(401).json({ success: false, message: 'Refresh token required' });

    let payload;
    try {
      payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch {
      return res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
    }

    const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });
    if (!stored || stored.expiresAt < new Date()) {
      return res.status(401).json({ success: false, message: 'Refresh token revoked or expired' });
    }

    // Rotate refresh token
    await prisma.refreshToken.delete({ where: { token: refreshToken } });
    const newRefreshToken = signRefreshToken(payload.sub);
    await prisma.refreshToken.create({
      data: { token: newRefreshToken, userId: payload.sub, expiresAt: refreshTokenExpiry() },
    });

    res.json({
      success: true,
      data: { accessToken: signAccessToken(payload.sub), refreshToken: newRefreshToken },
    });
  } catch (err) {
    next(err);
  }
}

// ── POST /api/auth/logout ─────────────────────────────────────
async function logout(req, res, next) {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
    }
    res.json({ success: true, message: 'Logged out' });
  } catch (err) {
    next(err);
  }
}

// ── GET /api/auth/me ──────────────────────────────────────────
async function me(req, res, next) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, email: true, name: true, role: true, avatarUrl: true, emailAlerts: true, pushAlerts: true, consentGivenAt: true, termsConsentAt: true, consentIp: true, doNotSell: true, createdAt: true },
    });
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, refresh, logout, me };
