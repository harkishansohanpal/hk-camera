import { test, expect } from '@playwright/test';

const PROD_URL = process.env.CI ? 'https://hk-camera.pages.dev' : 'http://localhost:5173';

test.describe('Production Smoke Tests', () => {
  test('landing page loads with 200 status', async ({ page }) => {
    const res = await page.goto(PROD_URL + '/');
    expect(res.status()).toBe(200);
    await expect(page).toHaveTitle(/HK Camera/);
  });

  test('pricing page loads', async ({ page }) => {
    const res = await page.goto(PROD_URL + '/pricing');
    expect(res.status()).toBe(200);
    await expect(page.locator('h1')).toContainText('pricing', { ignoreCase: true });
  });

  test('login page loads', async ({ page }) => {
    const res = await page.goto(PROD_URL + '/login');
    expect(res.status()).toBe(200);
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('button:has-text("Sign in")')).toBeVisible();
  });

  test('register page loads', async ({ page }) => {
    const res = await page.goto(PROD_URL + '/register');
    expect(res.status()).toBe(200);
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('button:has-text("Create account")')).toBeVisible();
  });

  test('404 page redirects to landing', async ({ page }) => {
    const res = await page.goto(PROD_URL + '/nonexistent-route');
    await expect(page).toHaveURL(PROD_URL + '/');
  });
});
