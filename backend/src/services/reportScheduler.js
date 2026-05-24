const https = require('https');

const GIT_OWNER = 'harkishansohanpal';
const GIT_REPO  = 'hk-camera';

// ── Active session timers ────────────────────────────────
const timers = new Map(); // cameraId → { interval, startTimeout }

function triggerReport(reason) {
  const pat = process.env.GH_PAT;
  if (!pat) {
    console.warn('[reportScheduler] GH_PAT not set, skipping report trigger');
    return;
  }

  const body = JSON.stringify({
    ref: 'master',
    inputs: { reason },
  });

  const req = https.request({
    hostname: 'api.github.com',
    path: `/repos/${GIT_OWNER}/${GIT_REPO}/actions/workflows/log-report.yml/dispatches`,
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${pat}`,
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'hk-camera-backend',
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
    },
  }, (res) => {
    let data = '';
    res.on('data', (c) => data += c);
    res.on('end', () => {
      if (res.statusCode === 204) {
        console.log(`[reportScheduler] Workflow dispatched (${reason})`);
      } else {
        console.warn(`[reportScheduler] Dispatch failed (${res.statusCode}): ${data.slice(0,200)}`);
      }
    });
  });
  req.on('error', (e) => console.warn('[reportScheduler] HTTP error:', e.message));
  req.write(body);
  req.end();
}

function startSession(cameraId) {
  if (timers.has(cameraId)) return;

  // Immediate trigger on session start
  triggerReport(`broadcast_start:${cameraId}`);

  // 5-min heartbeat while alive
  const interval = setInterval(() => {
    triggerReport(`heartbeat:${cameraId}`);
  }, 5 * 60 * 1000);

  timers.set(cameraId, { interval });
  console.log(`[reportScheduler] Session started for ${cameraId}`);
}

function endSession(cameraId) {
  const timer = timers.get(cameraId);
  if (!timer) return;

  clearInterval(timer.interval);
  timers.delete(cameraId);

  // Final report on session end
  triggerReport(`broadcast_stop:${cameraId}`);
  console.log(`[reportScheduler] Session ended for ${cameraId}`);
}

function stopAll() {
  for (const [cameraId, timer] of timers) {
    clearInterval(timer.interval);
  }
  timers.clear();
}

module.exports = { startSession, endSession, stopAll, triggerReport };
