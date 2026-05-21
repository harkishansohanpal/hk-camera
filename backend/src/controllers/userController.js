const bcrypt = require('bcryptjs');
const { prisma } = require('../config/database');

// ── PATCH /api/users/me ───────────────────────────────────────
async function updateProfile(req, res, next) {
  try {
    const { name, emailAlerts, pushAlerts, pushSubscription } = req.body;
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        ...(name !== undefined && { name }),
        ...(emailAlerts !== undefined && { emailAlerts }),
        ...(pushAlerts !== undefined && { pushAlerts }),
        ...(pushSubscription !== undefined && { pushSubscription: JSON.stringify(pushSubscription) }),
      },
      select: { id: true, email: true, name: true, role: true, avatarUrl: true, emailAlerts: true, pushAlerts: true },
    });
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
}

// ── PATCH /api/users/me/password ──────────────────────────────
async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) return res.status(401).json({ success: false, message: 'Current password is incorrect' });

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: req.user.id }, data: { passwordHash } });

    // Revoke all refresh tokens (force re-login everywhere)
    await prisma.refreshToken.deleteMany({ where: { userId: req.user.id } });

    res.json({ success: true, message: 'Password changed. Please log in again.' });
  } catch (err) { next(err); }
}

// ── DELETE /api/users/me ──────────────────────────────────────
async function deleteAccount(req, res, next) {
  try {
    await prisma.user.delete({ where: { id: req.user.id } });
    res.json({ success: true, message: 'Account deleted' });
  } catch (err) { next(err); }
}

// ── GET /api/users/me/export ──────────────────────────────────
async function exportData(req, res, next) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        cameras: {
          include: { recordings: { orderBy: { createdAt: 'desc' }, take: 500 } },
        },
        alerts: { orderBy: { createdAt: 'desc' }, take: 500 },
        subscription: true,
      },
    });

    const exportObj = {
      exportedAt: new Date().toISOString(),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt,
        consentGivenAt: user.consentGivenAt,
        doNotSell: user.doNotSell,
      },
      cameras: user.cameras.map((c) => ({
        id: c.id,
        name: c.name,
        description: c.description,
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
        createdAt: a.createdAt,
      })),
      subscription: user.subscription
        ? { planId: user.subscription.planId, status: user.subscription.status }
        : null,
    };

    res.json({ success: true, data: exportObj });
  } catch (err) { next(err); }
}

async function updateDoNotSell(req, res, next) {
  try {
    const { doNotSell } = req.body;
    await prisma.user.update({
      where: { id: req.user.id },
      data: { doNotSell },
    });
    res.json({ success: true, data: { doNotSell } });
  } catch (err) { next(err); }
}

module.exports = { updateProfile, changePassword, deleteAccount, exportData, updateDoNotSell };
