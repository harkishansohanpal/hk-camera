import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('hk-consent', 'accepted');
  });
});

test.describe('Visual Regression', () => {
  test('Landing page matches screenshot', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toBeVisible();
    await expect(page).toHaveScreenshot({ fullPage: true, maxDiffPixels: 100 });
  });

  test('Login page matches screenshot', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('h1')).toBeVisible();
    await expect(page).toHaveScreenshot({ fullPage: true, maxDiffPixels: 100 });
  });

  test('Register page matches screenshot', async ({ page }) => {
    await page.goto('/register');
    await expect(page.locator('h1')).toBeVisible();
    await expect(page).toHaveScreenshot({ fullPage: true, maxDiffPixels: 100 });
  });
});
