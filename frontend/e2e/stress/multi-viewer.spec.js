import { test, expect } from '@playwright/test';
import {
  createTestUser, createTestCamera, cleanupTestData,
  mockGetUserMedia, setupAuth, startCameraBroadcast,
  openViewer, waitForViewerConnected, getViewerStatus,
  getCameraStatus, formatDuration,
} from './helpers.js';

const VIEWER_COUNT = parseInt(process.env.STRESS_VIEWER_COUNT || '5');
const MONITOR_DURATION_MS = parseInt(process.env.STRESS_MONITOR_DURATION || '60000'); // 1 min
const POLL_INTERVAL_MS = 5000;

test.describe('Multi-Viewer Load', () => {
  let cameraId;
  let streamKey;

  test.beforeAll(async () => {
    await createTestUser();
    const c = await createTestCamera('Multi Viewer Load');
    cameraId = c.camera.id;
    streamKey = c.streamKey;
  });

  test.afterAll(async () => {
    await cleanupTestData();
  });

  test(`${VIEWER_COUNT} concurrent viewers for ${formatDuration(MONITOR_DURATION_MS)}`, async ({ browser }) => {
    test.setTimeout(MONITOR_DURATION_MS + 120000);

    // Camera context
    const camCtx = await browser.newContext({
      permissions: ['camera', 'microphone'],
      viewport: { width: 480, height: 800 },
    });
    const camPage = await camCtx.newPage();
    await mockGetUserMedia(camPage);
    await setupAuth(camPage);
    await startCameraBroadcast(camPage, cameraId);

    // Open all viewers
    const viewPages = [];
    for (let i = 0; i < VIEWER_COUNT; i++) {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
      const page = await ctx.newPage();
      await setupAuth(page);
      await openViewer(page, streamKey);
      const connected = await waitForViewerConnected(page, 30000);
      viewPages.push({ page, ctx, connected, index: i, drops: 0, wasLive: connected });
      console.log(`  Viewer ${i + 1}/${VIEWER_COUNT}: ${connected ? '✓' : '✗'}`);
      if (!connected) {
        console.log(`    Viewer ${i + 1} failed initial connection, continuing monitoring`);
      }
    }

    // Monitor all viewers
    const startTime = Date.now();
    while (Date.now() - startTime < MONITOR_DURATION_MS) {
      await camPage.waitForTimeout(POLL_INTERVAL_MS);

      for (const v of viewPages) {
        const status = await getViewerStatus(v.page);
        const isLive = status === 'live';
        if (!isLive && v.wasLive) {
          v.drops++;
          console.log(`  Viewer ${v.index + 1} dropped at t=${formatDuration(Date.now() - startTime)} (status: ${status})`);
        }
        v.wasLive = isLive;
      }
    }

    const camStatus = await getCameraStatus(camPage);

    console.log('\n=== Multi-Viewer Results ===');
    console.log(`Camera status: ${camStatus}`);
    console.log(`Monitor duration: ${formatDuration(MONITOR_DURATION_MS)}`);
    console.log(`Total viewers: ${VIEWER_COUNT}`);
    console.log(`Initial connections: ${viewPages.filter((v) => v.connected).length}/${VIEWER_COUNT}`);
    for (const v of viewPages) {
      console.log(`  Viewer ${v.index + 1}: ${v.drops} drop(s), ended as ${v.wasLive ? 'LIVE' : 'down'}`);
    }

    const totalDrops = viewPages.reduce((s, v) => s + v.drops, 0);
    const stableViewers = viewPages.filter((v) => v.drops === 0).length;

    console.log(`Total drops across all viewers: ${totalDrops}`);
    console.log(`Viewers with zero drops: ${stableViewers}/${VIEWER_COUNT}`);

    // At least 60% of viewers should have zero drops
    expect(stableViewers / Math.max(VIEWER_COUNT, 1)).toBeGreaterThanOrEqual(0.6);

    for (const v of viewPages) {
      await v.ctx.close();
    }
    await camCtx.close();
  });
});
