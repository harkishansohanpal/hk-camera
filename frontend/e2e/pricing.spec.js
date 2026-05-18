import { test, expect } from '@playwright/test';

test.describe('Pricing Page', () => {
  test('loads and displays heading', async ({ page }) => {
    test.setTimeout(15000);
    await page.goto('/pricing');
    await expect(page.locator('h1')).toContainText('pricing', { ignoreCase: true, timeout: 10000 });
  });

  test('has back navigation', async ({ page }) => {
    await page.goto('/pricing');
    await expect(page.locator('button:has-text("Back")')).toBeVisible();
  });
});
