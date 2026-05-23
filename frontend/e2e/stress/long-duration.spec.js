import { test, expect } from '@playwright/test';
import {
  createTestUser, createTestCamera, cleanupTestData,
  mockGetUserMedia, setupAuth, startCameraBroadcast,
  openViewer, waitForViewerConnected, getViewerStatus,
  getCameraStatus, formatDuration,
} from './helpers.js';

const TEST_DURATION_MS = parseInt(process.env.STRESS_DURATION || '300000'); // default 5 min
const POLL_INTERVAL_MS = 5000;

test.describe('Long-Duration Stability', () => {
  let cameraId;
  let streamKey;

  test.beforeAll(async () => {
    await createTestUser();
    const c = await createTestCamera('Long Duration Stability');
    cameraId = c.camera.id;
    streamKey = c.streamKey;
  });

  test.afterAll(async () => {
    await cleanupTestData();
  });

  test(`stream stable for ${formatDuration(TEST_DURATION_MS)}`, async ({ browser }) => {
    test.setTimeout(TEST_DURATION_MS + 60000);

    // Camera context
    const camCtx = await browser.newContext({
      permissions: ['camera', 'microphone'],
      viewport: { width: 480, height: 800 },
    });
    const camPage = await camCtx.newPage();

    // Viewer context
    const viewCtx = await browser.newContext({
      viewport: { width: 1280, height: 720 },
    });
    const viewPage = await viewCtx.newPage();

    await mockGetUserMedia(camPage);
    await setupAuth(camPage);
    await setupAuth(viewPage);

    await startCameraBroadcast(camPage, cameraId);
    await openViewer(viewPage, streamKey);
    const connected = await waitForViewerConnected(viewPage, 30000);
    expect(connected).toBe(true);

    const events = [];
    let viewerPrevStatus = 'live';
    let camPrevStatus = 'broadcasting';
    const startTime = Date.now();

    while (Date.now() - startTime < TEST_DURATION_MS) {
      await camPage.waitForTimeout(POLL_INTERVAL_MS);

      const viewStatus = await getViewerStatus(viewPage);
      const camStatus = await getCameraStatus(camPage);
      const elapsed = Date.now() - startTime;

      if (viewStatus !== viewerPrevStatus) {
        events.push({ t: elapsed, component: 'viewer', from: viewerPrevStatus, to: viewStatus });
        viewerPrevStatus = viewStatus;
      }
      if (camStatus !== camPrevStatus) {
        events.push({ t: elapsed, component: 'camera', from: camPrevStatus, to: camStatus });
        camPrevStatus = camStatus;
      }

      if (viewStatus === 'disconnected' || viewStatus === 'error') {
        // Allow auto-reconnect
        const recovered = await waitForViewerConnected(viewPage, 15000);
        events.push({
          t: Date.now() - startTime,
          component: 'viewer',
          from: viewStatus,
          to: recovered ? 'live' : 'still_down',
        });
        viewerPrevStatus = recovered ? 'live' : 'still_down';
      }
    }

    const totalMs = Date.now() - startTime;
    const drops = events.filter((e) => e.to === 'disconnected' || e.to === 'error' || e.from === 'live');
    const recoveries = events.filter((e) => e.to === 'live' || e.to === 'broadcasting');
    const viewerDowntime = events
      .filter((e) => e.component === 'viewer' && (e.to === 'disconnected' || e.to === 'error' || e.to === 'still_down'))
      .reduce((sum, e) => sum + POLL_INTERVAL_MS, 0);

    console.log('\n=== Long-Duration Results ===');
    console.log(`Duration: ${formatDuration(totalMs)}`);
    console.log(`Viewer status changes: ${events.filter(e => e.component === 'viewer').length}`);
    console.log(`Camera status changes: ${events.filter(e => e.component === 'camera').length}`);
    console.log(`Drops (viewer lost LIVE): ${drops.length}`);
    console.log(`Recoveries: ${recoveries.length}`);
    console.log(`Estimated viewer downtime: ${formatDuration(viewerDowntime)}`);
    console.log(`Uptime: ${totalMs > 0 ? (((totalMs - viewerDowntime) / totalMs) * 100).toFixed(1) : 'N/A'}%`);
    if (events.length > 0) {
      console.log('Events:');
      events.forEach((e) => console.log(`  t=${formatDuration(e.t)} ${e.component}: ${e.from} → ${e.to}`));
    }

    // A passing test: no more than 3 drops for the duration
    expect(drops.length).toBeLessThanOrEqual(3);

    await camCtx.close();
    await viewCtx.close();
  });
});
