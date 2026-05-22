import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('hk-consent', 'accepted'));
  });
  test('login form has required fields', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
    await expect(page.locator('button:has-text("Sign in")')).toBeVisible();
  });

  test('register form has required fields', async ({ page }) => {
    await page.goto('/register');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('input[placeholder="Jane Smith"]')).toBeVisible();
    await expect(page.locator('button:has-text("Create account")')).toBeVisible();
  });

  test('stays on login page after invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'nonexistent@test.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.locator('button:has-text("Sign in")').click();
    // Should remain on login page (not redirect to /dashboard)
    await expect(page).toHaveURL(/\/login/);
  });

  test('can navigate between login and register', async ({ page }) => {
    await page.goto('/register');
    await page.locator('a:has-text("Sign in")').click();
    await expect(page).toHaveURL(/\/login/);
  });

  test('protected routes redirect to login when unauthenticated', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });
});
