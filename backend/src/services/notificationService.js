const nodemailer = require('nodemailer');
const webpush = require('web-push');
const logger = require('../config/logger');

// ── Web Push VAPID setup ──────────────────────────────────────
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:admin@hkcamera.app',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

// ── Nodemailer transporter ────────────────────────────────────
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// ── Send email ────────────────────────────────────────────────
async function sendEmail({ to, subject, html }) {
  if (!process.env.SMTP_USER) {
    logger.debug('SMTP not configured – skipping email', { to, subject });
    return;
  }
  await transporter.sendMail({ from: process.env.ALERT_FROM || process.env.SMTP_USER, to, subject, html });
  logger.info('Email sent', { to, subject });
}

// ── Send web push notification ────────────────────────────────
async function sendPush(subscription, payload) {
  if (!process.env.VAPID_PUBLIC_KEY) {
    logger.debug('VAPID not configured – skipping push');
    return;
  }
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
  } catch (err) {
    logger.warn('Push notification failed', { err: err.message });
  }
}

// ── Motion detected ───────────────────────────────────────────
async function sendMotionAlert(user, camera, thumbnailUrl) {
  const subject = `🚨 Motion detected – ${camera.name}`;
  const html = `
    <h2>Motion Detected</h2>
    <p>Camera: <strong>${camera.name}</strong></p>
    <p>Time: ${new Date().toLocaleString()}</p>
    ${thumbnailUrl ? `<img src="${thumbnailUrl}" style="max-width:400px" alt="Motion thumbnail" />` : ''}
    <p><a href="${process.env.CLIENT_URL}/cameras/${camera.id}">View live feed →</a></p>
  `;

  if (user.emailAlerts) await sendEmail({ to: user.email, subject, html });

  if (user.pushAlerts && user.pushSubscription) {
    const sub = JSON.parse(user.pushSubscription);
    await sendPush(sub, {
      title: `Motion on ${camera.name}`,
      body: 'Tap to view live feed',
      icon: '/icons/alert.png',
      data: { url: `/cameras/${camera.id}` },
    });
  }
}

// ── Recording complete ────────────────────────────────────────
async function sendRecordingCompleteAlert(user, camera, recording) {
  if (!user.emailAlerts) return;
  await sendEmail({
    to: user.email,
    subject: `📹 New recording – ${camera.name}`,
    html: `
      <h2>Recording Saved</h2>
      <p>Camera: <strong>${camera.name}</strong></p>
      <p>Duration: ${recording.duration ? `${recording.duration}s` : 'N/A'}</p>
      <p><a href="${process.env.CLIENT_URL}/recordings/${recording.id}">View recording →</a></p>
    `,
  });
}

// ── Camera offline alert ──────────────────────────────────────
async function sendCameraOfflineAlert(user, camera) {
  if (!user.emailAlerts) return;
  await sendEmail({
    to: user.email,
    subject: `⚠️ Camera offline – ${camera.name}`,
    html: `<p>Your camera <strong>${camera.name}</strong> went offline at ${new Date().toLocaleString()}.</p>`,
  });
}

module.exports = { sendMotionAlert, sendRecordingCompleteAlert, sendCameraOfflineAlert };
