import { expect } from '@playwright/test';

export const API_BASE = process.env.STRESS_API_BASE || 'http://localhost:5001';
const FRONTEND_URL = process.env.STRESS_FRONTEND_URL || 'http://localhost:5173';

let auth = null;
let camera = null;
let streamKeyVal = null;


export function getAuth() { return auth; }
export function getCamera() { return camera; }
export function getStreamKey() { return streamKeyVal; }

export async function api(method, path, body, token) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  if (token) opts.headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, opts);
  const data = await res.json();
  if (!data.success) throw new Error(`${method} ${path}: ${data.message}`);
  return data.data;
}

const TEST_CREDENTIALS = { email: 'stress-tester@hk-camera-test.local', password: 'StressTest123!' };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function apiRetry(method, path, body, token, retries = 5) {
  for (let i = 0; i < retries; i++) {
    try {
      return await api(method, path, body, token);
    } catch (err) {
      const isRate = err.message.includes('Too many');
      const isConflict = err.message.includes('already in use');
      if (!isRate || i >= retries - 1) {
        if (isConflict) throw err; // don't retry 409s
        if (!isRate) throw err;
      }
      await sleep(4000 + Math.random() * 2000);
    }
  }
  throw new Error(`Request failed after ${retries} retries: ${method} ${path}`);
}

export async function createTestUser() {
  // Try register first; user may already exist from a prior run
  let data;
  try {
    data = await apiRetry('POST', '/api/auth/register', { ...TEST_CREDENTIALS, name: 'Stress Tester', consent: true, turnstileToken: 'test-token' });
  } catch (err) {
    if (!err.message.includes('already in use')) throw err;
  }

  if (!data) {
    data = await apiRetry('POST', '/api/auth/login', TEST_CREDENTIALS);
  }

  auth = { accessToken: data.accessToken, refreshToken: data.refreshToken, userId: data.user.id };
  return auth;
}

export async function createTestCamera(name = 'Stress Camera') {
  const cam = await api('POST', '/api/cameras', { name }, auth.accessToken);
  camera = cam;
  const sk = await api('GET', `/api/cameras/${cam.id}/stream-key`, null, auth.accessToken);
  streamKeyVal = sk.streamKey;
  return { camera: cam, streamKey: sk.streamKey };
}

export async function cleanupTestData() {
  if (camera) {
    try { await api('DELETE', `/api/cameras/${camera.id}`, null, auth.accessToken); } catch {}
  }
}

export async function mockGetUserMedia(page) {
  await page.addInitScript(() => {
    const origGUM = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);

    navigator.mediaDevices.getUserMedia = async (constraints) => {
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 480;
      const ctx = canvas.getContext('2d');

      let frame = 0;
      function draw() {
        if (canvas._stopDraw) return;
        const hue = (frame * 5) % 360;
        ctx.fillStyle = `hsl(${hue}, 80%, 60%)`;
        ctx.fillRect(0, 0, 640, 480);
        ctx.fillStyle = '#fff';
        ctx.font = '20px monospace';
        ctx.fillText(`STRESS ${String(frame).padStart(4, '0')}`, 20, 50);
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.beginPath();
        ctx.arc(320 + Math.sin(frame * 0.05) * 100, 240 + Math.cos(frame * 0.05) * 100, 50, 0, Math.PI * 2);
        ctx.fill();
        frame++;
        requestAnimationFrame(draw);
      }
      draw();

      const videoStream = canvas.captureStream(30);

      if (constraints.audio === false && constraints.video) {
        return videoStream;
      }

      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (AC) {
          const ac = new AC();
          if (ac.state === 'suspended') ac.resume();
          const dest = ac.createMediaStreamDestination();
          const osc = ac.createOscillator();
          osc.frequency.value = 0;
          const gain = ac.createGain();
          gain.gain.value = 0;
          osc.connect(gain);
          gain.connect(dest);
          osc.start();
          window.__stressAudioCtx = ac;
          window.__stressOsc = osc;
          const combined = new MediaStream([
            ...videoStream.getVideoTracks(),
            ...dest.stream.getAudioTracks(),
          ]);
          return combined;
        }
      } catch {}

      return videoStream;
    };
  });
}

/** Ping /api/health until the backend responds (handles Fly.io cold-start). */
export async function warmUpBackend(timeoutMs = 60000) {
  const deadline = Date.now() + timeoutMs;
  let lastErr;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${API_BASE}/api/health`, { signal: AbortSignal.timeout(5000) });
      if (res.ok) return;
      lastErr = new Error(`Health returned ${res.status}`);
    } catch (err) {
      lastErr = err;
    }
    await sleep(2000);
  }
  throw lastErr || new Error('Backend warm-up timed out');
}

/** Ping the backend every 30s to prevent Fly.io machine from stopping mid-test.
 *  Returns a stop function. */
export function startKeepAlive() {
  const id = setInterval(() => {
    fetch(`${API_BASE}/api/health`, { signal: AbortSignal.timeout(5000) }).catch(() => {});
  }, 30000);
  return () => clearInterval(id);
}

function isTokenExpired(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return Date.now() >= payload.exp * 1000;
  } catch {
    return true;
  }
}

/** Refresh auth tokens via the refresh endpoint. Updates the module-level `auth` object. */
export async function refreshAuth() {
  if (!auth) throw new Error('No auth to refresh. Call createTestUser first.');
  if (!isTokenExpired(auth.accessToken)) return; // still valid
  const data = await apiRetry('POST', '/api/auth/refresh', { refreshToken: auth.refreshToken });
  auth.accessToken = data.accessToken;
  auth.refreshToken = data.refreshToken;
}

export async function setupAuth(page) {
  await refreshAuth();
  const tk = auth;
  await page.addInitScript(`
    localStorage.setItem('accessToken', ${JSON.stringify(tk.accessToken)});
    localStorage.setItem('refreshToken', ${JSON.stringify(tk.refreshToken)});
    localStorage.setItem('hk-consent', 'accepted');
  `);
}

export async function startCameraBroadcast(page, cameraId) {
  await page.goto(`${FRONTEND_URL}/cameras/${cameraId}`, { waitUntil: 'load', timeout: 20000 });
  await page.waitForTimeout(3000);

  // The stream toggle is the large circular icon button (w-[68px])
  const streamBtn = page.locator('button[class*="w-\\[68px\\]"]');
  await expect(streamBtn).toBeVisible({ timeout: 15000 });

  // Make sure it's in "start" mode (shows Camera icon = not broadcasting)
  await streamBtn.click();

  const liveBadge = page.locator('text=LIVE').first();
  await expect(liveBadge).toBeVisible({ timeout: 30000 });
}

export async function stopCameraBroadcast(page) {
  const stopBtn = page.locator('button[class*="w-\\[68px\\]"]');
  if (await stopBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await stopBtn.click();
  }
}

export async function toggleCameraBroadcast(page) {
  const btn = page.locator('button[class*="w-\\[68px\\]"]');
  if (await btn.isVisible({ timeout: 1000 }).catch(() => false)) {
    await btn.click();
  }
}

export async function openViewer(page, streamKey) {
  const resp = await page.goto(`${FRONTEND_URL}/viewer/${streamKey}`, { waitUntil: 'load', timeout: 20000 });
  if (!resp) throw new Error('Viewer page load failed (no response)');
  await page.waitForTimeout(3000);

  const url = page.url();
  if (url.includes('/login')) {
    const hasToken = await page.evaluate(() => !!localStorage.getItem('accessToken'));
    throw new Error(`Viewer redirected to login (hasToken=${hasToken})`);
  }
}

export async function waitForViewerConnected(page, timeoutMs = 20000) {
  try {
    await page.waitForFunction(
      () => {
        const el = document.querySelector('.capitalize');
        return el && el.textContent.toLowerCase().trim() === 'live';
      },
      { timeout: timeoutMs },
    );
    return true;
  } catch {
    return false;
  }
}

export async function getViewerStatus(page) {
  return page.evaluate(() => {
    const el = document.querySelector('.capitalize');
    return el ? el.textContent.toLowerCase().trim() : 'unknown';
  });
}

export async function getCameraStatus(page) {
  return page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent.includes('Stream') || b.textContent.includes('Stop'),
    );
    if (!btn) return 'unknown';
    return btn.textContent.includes('Stop') ? 'broadcasting' : 'idle';
  });
}

export function formatDuration(ms) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m}m ${s % 60}s`;
}
