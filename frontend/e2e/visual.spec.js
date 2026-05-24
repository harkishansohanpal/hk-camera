import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('hk-consent', 'accepted');
  });
});

test.describe('Visual Regression', () => {
  for (const { name, path } of [
    { name: 'Landing page', path: '/' },
    { name: 'Login page', path: '/login' },
    { name: 'Register page', path: '/register' },
  ]) {
    test(`${name} matches screenshot`, async ({ page }) => {
      await page.goto(path);
      await expect(page.locator('h1').first()).toBeVisible();
      await expect(page).toHaveScreenshot({ fullPage: true, maxDiffPixels: 100 });
    });
  }
});
