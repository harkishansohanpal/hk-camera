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

module.exports = { updateProfile, changePassword, deleteAccount };
