import { test, expect } from '@playwright/test';

test.describe('Landing Page', () => {
  test('loads with correct title and branding', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('banner').getByText('HK Camera')).toBeVisible();
    await expect(page.locator('h1')).toContainText('security camera');
  });

  test('has working navigation links', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('banner').getByRole('link', { name: 'Log in' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Get Started', exact: true })).toBeVisible();
  });

  test('login link navigates to /login', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('banner').getByRole('link', { name: 'Log in' }).click();
    await expect(page).toHaveURL(/\/login/);
  });

  test('Get Started button navigates to /register', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Get Started', exact: true }).click();
    await expect(page).toHaveURL(/\/register/);
  });
});
