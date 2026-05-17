import { test, expect } from '@playwright/test';

const PROTECTED_ROUTES = [
  '/dashboard',
  '/settings',
  '/billing',
  '/alerts',
];

test.describe('Protected Routes', () => {
  for (const path of PROTECTED_ROUTES) {
    test(`redirects ${path} to /login when unauthenticated`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(/\/login/);
    });
  }

  test('rejects invalid token silently', async ({ page }) => {
    await page.goto('/login');
    await page.evaluate(() => {
      localStorage.setItem('accessToken', 'totally-invalid-token');
    });
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });
});
