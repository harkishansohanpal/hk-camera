import { test, expect } from '@playwright/test';
import {
  createTestUser, createTestCamera, cleanupTestData,
  mockGetUserMedia, setupAuth, startCameraBroadcast,
  openViewer, waitForViewerConnected, getViewerStatus,
  getCameraStatus, formatDuration, warmUpBackend, startKeepAlive,
} from './helpers.js';

const RECOVERY_TIMEOUT = 30000;

test.describe('Network Fault Injection', () => {
  let cameraId;
  let streamKey;

  test.beforeAll(async () => {
    await warmUpBackend();
    await createTestUser();
    const c = await createTestCamera('Network Fault Stress');
    cameraId = c.camera.id;
    streamKey = c.streamKey;
  });

  test.afterAll(async () => {
    await cleanupTestData();
  });

  async function injectFault(context, conditions) {
    const cdp = await context.newCDPSession(
      context.pages()[0],
    );
    await cdp.send('Network.emulateNetworkConditions', conditions);
    return cdp;
  }

  async function restoreNetwork(cdp) {
    await cdp.send('Network.emulateNetworkConditions', {
      offline: false,
      latency: 0,
      downloadThroughput: -1,
      uploadThroughput: -1,
      packetLoss: 0,
    });
  }

  test('survives brief offline period and recovers', async ({ browser }) => {
    test.setTimeout(120000);

    const camCtx = await browser.newContext({
      permissions: ['camera', 'microphone'],
      viewport: { width: 480, height: 800 },
    });
    const camPage = await camCtx.newPage();
    await mockGetUserMedia(camPage);
    await setupAuth(camPage);
    await startCameraBroadcast(camPage, cameraId);

    const stopKeepAlive = startKeepAlive();

    const viewCtx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const viewPage = await viewCtx.newPage();
    await setupAuth(viewPage);
    await openViewer(viewPage, streamKey);

    const baselineConnected = await waitForViewerConnected(viewPage, 30000);
    expect(baselineConnected).toBe(true);
    console.log('  Baseline connection established');

    // Inject 5 seconds of offline
    console.log('  Injecting 5s offline...');
    const viewCdp = await injectFault(viewCtx, {
      offline: true,
      latency: 0,
      downloadThroughput: 0,
      uploadThroughput: 0,
      packetLoss: 0,
    });

    await viewPage.waitForTimeout(5000);

    // Restore
    console.log('  Restoring network...');
    await restoreNetwork(viewCdp);

    // Wait for recovery
    const recovered = await waitForViewerConnected(viewPage, RECOVERY_TIMEOUT);
    console.log(`  Recovery from offline: ${recovered ? '✓' : '✗'}`);
    expect(recovered).toBe(true);

    stopKeepAlive();
    await camCtx.close();
    await viewCtx.close();
  });

  test('survives high latency without permanent drop', async ({ browser }) => {
    test.setTimeout(120000);

    const camCtx = await browser.newContext({
      permissions: ['camera', 'microphone'],
      viewport: { width: 480, height: 800 },
    });
    const camPage = await camCtx.newPage();
    await mockGetUserMedia(camPage);
    await setupAuth(camPage);
    await startCameraBroadcast(camPage, cameraId);

    const stopKeepAlive = startKeepAlive();

    const viewCtx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const viewPage = await viewCtx.newPage();
    await setupAuth(viewPage);
    await openViewer(viewPage, streamKey);

    const baselineConnected = await waitForViewerConnected(viewPage, 30000);
    expect(baselineConnected).toBe(true);
    console.log('  Baseline connection established');

    // Inject 500ms latency, limited bandwidth, 5% packet loss for 15s
    console.log('  Injecting high latency (500ms) + 5% packet loss for 15s...');
    const viewCdp = await injectFault(viewCtx, {
      offline: false,
      latency: 500,
      downloadThroughput: 1024 * 1024, // 1 Mbps
      uploadThroughput: 512 * 1024, // 512 Kbps
      packetLoss: 0.05,
    });

    await viewPage.waitForTimeout(15000);

    // Check if viewer is still connected or auto-recovered
    const statusDuringFault = await getViewerStatus(viewPage);
    console.log(`  Status during fault period: ${statusDuringFault}`);

    // Restore
    console.log('  Restoring network...');
    await restoreNetwork(viewCdp);

    // Wait for recovery if needed
    const recovered = await waitForViewerConnected(viewPage, RECOVERY_TIMEOUT);
    console.log(`  Final status after restore: ${recovered ? '✓ LIVE' : '✗ down'}`);
    expect(recovered).toBe(true);

    stopKeepAlive();
    await camCtx.close();
    await viewCtx.close();
  });

  test('handles multiple brief network flaps', async ({ browser }) => {
    test.setTimeout(180000);

    const camCtx = await browser.newContext({
      permissions: ['camera', 'microphone'],
      viewport: { width: 480, height: 800 },
    });
    const camPage = await camCtx.newPage();
    await mockGetUserMedia(camPage);
    await setupAuth(camPage);
    await startCameraBroadcast(camPage, cameraId);

    const stopKeepAlive = startKeepAlive();

    const viewCtx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const viewPage = await viewCtx.newPage();
    await setupAuth(viewPage);
    await openViewer(viewPage, streamKey);

    const baselineConnected = await waitForViewerConnected(viewPage, 30000);
    expect(baselineConnected).toBe(true);
    console.log('  Baseline connection established');

    const viewCdp = await injectFault(viewCtx, {
      offline: false,
      latency: 0,
      downloadThroughput: -1,
      uploadThroughput: -1,
      packetLoss: 0,
    });

    const flaps = 5;
    for (let i = 0; i < flaps; i++) {
      // Go offline
      console.log(`  Flap ${i + 1}/${flaps}: offline for 3s...`);
      await viewCdp.send('Network.emulateNetworkConditions', {
        offline: true,
        latency: 0,
        downloadThroughput: 0,
        uploadThroughput: 0,
        packetLoss: 0,
      });
      await viewPage.waitForTimeout(3000);

      // Restore
      await restoreNetwork(viewCdp);
      const recovered = await waitForViewerConnected(viewPage, 20000);
      console.log(`  Flap ${i + 1}/${flaps}: recovered = ${recovered ? '✓' : '✗'}`);
      expect(recovered).toBe(true);
    }

    const finalStatus = await getViewerStatus(viewPage);
    console.log(`  After ${flaps} flaps: ${finalStatus}`);
    expect(finalStatus).toBe('live');

    stopKeepAlive();
    await camCtx.close();
    await viewCtx.close();
  });
});
