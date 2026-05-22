import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('hk-consent', 'accepted');
  });
});

test.describe('Full Regression – Authentication Flow', () => {
  test('register form validates required fields', async ({ page }) => {
    await page.goto('/register');
    await page.locator('button:has-text("Create account")').click();
    await expect(page).toHaveURL(/\/register/);
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('input[placeholder="Jane Smith"]')).toBeVisible();
  });

  test('register rejects weak password', async ({ page }) => {
    await page.goto('/register');
    await page.fill('input[type="email"]', 'newuser@test.com');
    await page.fill('input[type="password"]', '123');
    await page.fill('input[placeholder="Jane Smith"]', 'New User');
    await page.locator('button:has-text("Create account")').click();
    await expect(page).toHaveURL(/\/register/);
  });

  test('login rejects invalid email format', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'not-an-email');
    await page.fill('input[type="password"]', 'password123');
    await page.locator('button:has-text("Sign in")').click();
    await expect(page).toHaveURL(/\/login/);
  });

  test('login with wrong credentials shows error and stays on page', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'wrong@example.com');
    await page.fill('input[type="password"]', 'DefinitelyWrongPassword!');
    await page.locator('button:has-text("Sign in")').click();
    await expect(page).toHaveURL(/\/login/);
  });

test('can navigate to register from login', async ({ page }) => {
    await page.goto('/login');
    await page.locator('a:has-text("Sign Up")').click();
    await expect(page).toHaveURL(/\/register/);
  });
});

test.describe('Full Regression – Page Content', () => {
  test('landing page has brand elements', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('banner').getByText('HK Camera')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Get Started', exact: true })).toBeVisible();
    await expect(page.getByRole('banner').getByRole('link', { name: 'Log in' })).toBeVisible();
  });

  test('landing page headline mentions smart security', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('security camera');
  });

  test('login form has all required fields', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
    await expect(page.locator('button:has-text("Sign in")')).toBeVisible();
    await expect(page.locator('a:has-text("Sign Up")')).toBeVisible();
  });

  test('register form has all required fields', async ({ page }) => {
    await page.goto('/register');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('input[placeholder="Jane Smith"]')).toBeVisible();
    await expect(page.locator('button:has-text("Create account")')).toBeVisible();
    await expect(page.locator('a:has-text("Log In")')).toBeVisible();
  });

  test('login and register pages link to each other', async ({ page }) => {
    await page.goto('/login');
    await page.locator('a:has-text("Sign Up")').click();
    await expect(page).toHaveURL(/\/register/);

    await page.locator('a:has-text("Log In")').click();
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe('Full Regression – Error Boundaries', () => {
  test('pricing page navigates back correctly', async ({ page }) => {
    await page.goto('/');
    await page.goto('/pricing');
    await expect(page.locator('button:has-text("Back")')).toBeVisible();
  });

  test('browser back button works from login', async ({ page }) => {
    await page.goto('/');
    await page.click('a:has-text("Log in")');
    await expect(page).toHaveURL(/\/login/);
    await page.goBack();
    await expect(page).toHaveURL('/');
  });
});
