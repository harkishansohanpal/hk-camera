import { test, expect } from '@playwright/test';
import {
  createTestUser, createTestCamera, cleanupTestData,
  mockGetUserMedia, setupAuth, startCameraBroadcast,
  openViewer, waitForViewerConnected, warmUpBackend, startKeepAlive,
  toggleCameraBroadcast,
} from './helpers.js';

const DURATION = parseInt(process.env.STRESS_DURATION || '60000');

test.describe('200ms Camera Toggle Stress', () => {
  let cameraId;
  let streamKey;

  test.beforeAll(async () => {
    await warmUpBackend();
    await createTestUser();
    const c = await createTestCamera('Toggle Stress');
    cameraId = c.camera.id;
    streamKey = c.streamKey;
  });

  test.afterAll(async () => {
    await cleanupTestData();
  });

  test(`Toggle camera stream every 200ms for ${DURATION / 1000}s`, async ({ browser }) => {
    test.setTimeout(DURATION + 240000);

    // ── Camera page ──────────────────────────────────────────
    const camCtx = await browser.newContext({
      permissions: ['camera', 'microphone'],
      viewport: { width: 480, height: 800 },
    });
    const camPage = await camCtx.newPage();
    await mockGetUserMedia(camPage);
    await setupAuth(camPage);

    // Intercept camera console for connectViewer timestamps
    await camPage.addInitScript(() => {
      const methods = ['log', 'warn', 'error', 'debug'];
      for (const m of methods) {
        const orig = console[m];
        console[m] = (...args) => {
          const msg = args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
          window.__camEvents = window.__camEvents || [];
          window.__camEvents.push({ msg, ts: Date.now() });
          orig.apply(console, args);
        };
      }
    });

    await startCameraBroadcast(camPage, cameraId);

    const stopKeepAlive = startKeepAlive();

    // ── Viewer page with event logging ───────────────────────
    const viewCtx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const viewPage = await viewCtx.newPage();
    await setupAuth(viewPage);

    // Intercept all console output from the viewer for precise event tracking
    const viewerEvents = [];
    await viewPage.addInitScript(() => {
      const methods = ['log', 'warn', 'error', 'debug'];
      for (const m of methods) {
        const orig = console[m];
        console[m] = (...args) => {
          const msg = args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
          window.__viewerEvents = window.__viewerEvents || [];
          window.__viewerEvents.push({ msg, ts: Date.now() });
          orig.apply(console, args);
        };
      }
    });

    await openViewer(viewPage, streamKey);
    const initialConnect = await waitForViewerConnected(viewPage, 30000);
    console.log(`  Viewer initial connect: ${initialConnect}`);
    if (!initialConnect) throw new Error('Viewer failed initial connect');

    // ── Helpers to extract event data ────────────────────────
    async function getViewerEventTs(pattern) {
      return viewPage.evaluate((p) => {
        const events = window.__viewerEvents || [];
        return events.filter((e) => e.msg.includes(p)).map((e) => e.ts);
      }, pattern);
    }

    async function getCameraEventTs(pattern) {
      return camPage.evaluate((p) => {
        const events = window.__camEvents || [];
        return events.filter((e) => e.msg.includes(p)).map((e) => e.ts);
      }, pattern);
    }

    function computeStats(values) {
      if (!values.length) return null;
      const sorted = [...values].sort((a, b) => a - b);
      const sum = sorted.reduce((a, b) => a + b, 0);
      return {
        count: sorted.length,
        min: sorted[0],
        max: sorted[sorted.length - 1],
        avg: Math.round(sum / sorted.length),
        p50: sorted[Math.floor(sorted.length * 0.5)],
        p99: sorted[Math.floor(sorted.length * 0.99)],
      };
    }

    // Clear accumulated events from initial connection
    await viewPage.evaluate(() => { window.__viewerEvents = []; });
    await camPage.evaluate(() => { window.__camEvents = []; });

    // ── Toggle loop ──────────────────────────────────────────
    const start = Date.now();
    let cycle = 0;

    while (Date.now() - start < DURATION) {
      cycle++;
      await toggleCameraBroadcast(camPage);
      await camPage.waitForTimeout(200);
      if (cycle % 50 === 0) console.log(`  Cycle ${cycle} at ${Math.round((Date.now() - start) / 1000)}s`);
    }

    stopKeepAlive();

    // ── Aggregate results from console events ────────────────
    const offlineEvents = await getViewerEventTs('Camera went offline');
    const pcConnectedEvents = await getViewerEventTs('Peer connection established');
    const waitingEvents = await getViewerEventTs('Camera offline, waiting');
    const offerEvents = await getViewerEventTs('initiateOffer called');
    const pcConnStateChanges = await viewPage.evaluate(() => {
      const events = window.__viewerEvents || [];
      return events.filter((e) => e.msg.includes('PC connection state change')).map((e) => e.msg);
    });

    console.log('\n=== Toggle Stress Results ===');
    console.log(`  Duration: ${DURATION / 1000}s`);
    console.log(`  Toggle cycles: ${cycle}`);
    console.log(`  Camera went offline events: ${offlineEvents.length}`);
    console.log(`  Camera offline, waiting events: ${waitingEvents.length}`);
    console.log(`  initiateOffer called: ${offerEvents.length}`);
    console.log(`  Peer connection established: ${pcConnectedEvents.length}`);

    // Count how many times viewer was successfully connected after a toggle
    // A "connect" = PC connected event that follows an offer event
    const successfulConnects = pcConnectedEvents.length;
    const failedConnects = offerEvents.length - successfulConnects;
    console.log(`\n  Successful viewer connects: ${successfulConnects}`);
    console.log(`  Failed viewer connects (offer but no PC): ${Math.max(0, failedConnects)}`);
    console.log(`  Toggles without any reconnect attempt: ${cycle - offerEvents.length}`);

    // PC connection state changes that ended in 'disconnected' or 'failed'
    const disconnectStates = pcConnStateChanges.filter((m) =>
      m.includes('disconnected') || m.includes('failed'),
    );
    console.log(`  PC disconnect/failed events: ${disconnectStates.length}`);

    // ── Latency metrics ──────────────────────────────────────
    const camConnectTs = await getCameraEventTs('Camera socket connected');
    const offerTs = await getViewerEventTs('initiateOffer called');
    const connectTs = await getViewerEventTs('Peer connection established');

    const reconnectLatencies = [];
    const pairs = Math.min(offerTs.length, connectTs.length);
    for (let i = 0; i < pairs; i++) {
      reconnectLatencies.push(connectTs[i] - offerTs[i]);
    }

    const e2eLatencies = [];
    const e2ePairs = Math.min(camConnectTs.length, connectTs.length);
    for (let i = 0; i < e2ePairs; i++) {
      e2eLatencies.push(connectTs[i] - camConnectTs[i]);
    }

    const reconnectStats = computeStats(reconnectLatencies);
    const e2eStats = computeStats(e2eLatencies);

    console.log('\n=== Latency Metrics ===');
    if (reconnectStats) {
      console.log(`  Viewer reconnect latency (ms): min=${reconnectStats.min} max=${reconnectStats.max} avg=${reconnectStats.avg} p50=${reconnectStats.p50} p99=${reconnectStats.p99} (n=${reconnectStats.count})`);
    }
    if (e2eStats) {
      console.log(`  Camera→Viewer E2E latency (ms): min=${e2eStats.min} max=${e2eStats.max} avg=${e2eStats.avg} p50=${e2eStats.p50} p99=${e2eStats.p99} (n=${e2eStats.count})`);
    }

    // Log every 10th cycle detail
    console.log('\n=== Event Timeline (every 10th cycle) ===');
    const allEvents = await viewPage.evaluate(() => {
      return (window.__viewerEvents || []).map((e) => ({
        msg: e.msg.substring(0, 80),
        ts: e.ts,
      }));
    });

    // Group events by 500ms buckets
    const byBucket = {};
    for (const e of allEvents) {
      const bucket = Math.floor((e.ts - start) / 500) * 500;
      if (!byBucket[bucket]) byBucket[bucket] = [];
      byBucket[bucket].push(e.msg);
    }
    for (const [bucket, msgs] of Object.entries(byBucket).sort((a, b) => a[0] - b[0])) {
      if (msgs.length > 0) {
        console.log(`  t+${bucket}ms: [${msgs.join('; ')}]`);
      }
    }

    // Log all unique PC state changes for diagnostics
    console.log('\n=== PC Connection State Changes ===');
    for (const msg of pcConnStateChanges) {
      console.log(`  ${msg}`);
    }

    await viewPage.close();
    await viewCtx.close();
    await camCtx.close();
  });
});
