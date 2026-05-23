import { test, expect } from '@playwright/test';
import {
  createTestUser, createTestCamera, cleanupTestData,
  mockGetUserMedia, setupAuth, startCameraBroadcast,
  openViewer, waitForViewerConnected,
} from './helpers.js';

const CYCLES = parseInt(process.env.STRESS_RECONNECT_CYCLES || '20');
const CONNECT_TIMEOUT = 30000;

test.describe('Rapid Reconnect Cycling', () => {
  let cameraId;
  let streamKey;

  test.beforeAll(async () => {
    await createTestUser();
    const c = await createTestCamera('Reconnect Stress');
    cameraId = c.camera.id;
    streamKey = c.streamKey;
  });

  test.afterAll(async () => {
    await cleanupTestData();
  });

  test(`${CYCLES} connect/disconnect cycles`, async ({ browser }) => {
    test.setTimeout(CYCLES * 60000 + 120000);

    // Camera context (stays open)
    const camCtx = await browser.newContext({
      permissions: ['camera', 'microphone'],
      viewport: { width: 480, height: 800 },
    });
    const camPage = await camCtx.newPage();
    await mockGetUserMedia(camPage);
    await setupAuth(camPage);
    await startCameraBroadcast(camPage, cameraId);

    const results = [];
    let consecutiveFails = 0;

    const viewCtx = await browser.newContext({ viewport: { width: 1280, height: 720 } });

    for (let cycle = 1; cycle <= CYCLES; cycle++) {
      const viewPage = await viewCtx.newPage();
      await setupAuth(viewPage);

      const cycleStart = Date.now();
      await openViewer(viewPage, streamKey);
      console.log(`  Viewer page loaded in ${Date.now() - cycleStart}ms`);
      const connected = await waitForViewerConnected(viewPage, CONNECT_TIMEOUT);
      console.log(`  Viewer connect result: ${connected} (${Date.now() - cycleStart}ms elapsed)`);

      if (connected) {
        await viewPage.waitForTimeout(2000);
        consecutiveFails = 0;
      } else {
        consecutiveFails++;
      }

      const connectTime = Date.now() - cycleStart;
      results.push({ cycle, connected, connectTime });

      console.log(
        `  Cycle ${cycle}/${CYCLES}: ${connected ? '✓' : '✗'} (${connectTime}ms)` +
        (consecutiveFails >= 3 ? ' WARNING: 3+ consecutive failures' : ''),
      );

      await viewPage.close();

      if (consecutiveFails >= 5) {
        console.log(`  Aborting after ${consecutiveFails} consecutive failures`);
        break;
      }
    }

    await viewCtx.close();

    const successCycles = results.filter((r) => r.connected);
    const failCycles = results.filter((r) => !r.connected);
    const avgConnectTime =
      successCycles.length > 0
        ? Math.round(successCycles.reduce((s, r) => s + r.connectTime, 0) / successCycles.length)
        : 0;

    console.log('\n=== Reconnect Cycling Results ===');
    console.log(`Total cycles: ${results.length}`);
    console.log(`Successful: ${successCycles.length}`);
    console.log(`Failed: ${failCycles.length}`);
    console.log(`Success rate: ${((successCycles.length / results.length) * 100).toFixed(1)}%`);
    console.log(`Avg connect time: ${avgConnectTime}ms`);
    if (failCycles.length > 0) {
      console.log(`Failed cycles: ${failCycles.map((r) => r.cycle).join(', ')}`);
    }

    // At least 90% success rate
    expect(successCycles.length / Math.max(results.length, 1)).toBeGreaterThanOrEqual(0.9);

    await camCtx.close();
  });
});
