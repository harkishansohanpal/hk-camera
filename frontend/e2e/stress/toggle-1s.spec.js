import { test, expect } from '@playwright/test';
import {
  createTestUser, createTestCamera, cleanupTestData,
  mockGetUserMedia, setupAuth, startCameraBroadcast,
  openViewer, waitForViewerConnected, warmUpBackend, startKeepAlive,
  toggleCameraBroadcast,
} from './helpers.js';

const DURATION = parseInt(process.env.STRESS_DURATION || '60000');

test.describe('1s Camera Toggle Stress', () => {
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

  test(`Toggle camera stream every 1s for ${DURATION / 1000}s`, async ({ browser }) => {
    test.setTimeout(DURATION + 120000);

    // ── Camera page ──────────────────────────────────────────
    const camCtx = await browser.newContext({
      permissions: ['camera', 'microphone'],
      viewport: { width: 480, height: 800 },
    });
    const camPage = await camCtx.newPage();
    await mockGetUserMedia(camPage);
    await setupAuth(camPage);
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

    // ── Helper to extract event counts ───────────────────────
    async function getViewerEventTs(pattern) {
      return viewPage.evaluate((p) => {
        const events = window.__viewerEvents || [];
        return events.filter((e) => e.msg.includes(p)).map((e) => e.ts);
      }, pattern);
    }

    // Clear accumulated events from initial connection
    await viewPage.evaluate(() => { window.__viewerEvents = []; });

    // ── Toggle loop ──────────────────────────────────────────
    const start = Date.now();
    let cycle = 0;

    while (Date.now() - start < DURATION) {
      cycle++;
      await toggleCameraBroadcast(camPage);
      // Wait for next cycle
      await camPage.waitForTimeout(1000);
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

    // Log every 5th cycle detail
    console.log('\n=== Event Timeline (every 5th cycle) ===');
    const allEvents = await viewPage.evaluate(() => {
      return (window.__viewerEvents || []).map((e) => ({
        msg: e.msg.substring(0, 80),
        ts: e.ts,
      }));
    });

    // Group events by second
    const bySecond = {};
    for (const e of allEvents) {
      const sec = Math.floor((e.ts - start) / 1000);
      if (!bySecond[sec]) bySecond[sec] = [];
      bySecond[sec].push(e.msg);
    }
    for (const [sec, msgs] of Object.entries(bySecond).sort((a, b) => a[0] - b[0])) {
      if (msgs.length > 0) {
        console.log(`  t+${sec}s: [${msgs.join('; ')}]`);
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
