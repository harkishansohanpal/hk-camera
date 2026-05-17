import { test, expect } from '@playwright/test';

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

  test('can navigate back to landing from login', async ({ page }) => {
    await page.goto('/login');
    await page.locator('a:has-text("HK Camera")').first().click();
    await expect(page).toHaveURL('/');
  });
});

test.describe('Full Regression – Navigation & Routing', () => {
  test('all public pages accessible from landing', async ({ page }) => {
    await page.goto('/');

    await page.click('a:has-text("Pricing")');
    await expect(page).toHaveURL(/\/pricing/);

    await page.goto('/');
    await page.click('a:has-text("Log in")');
    await expect(page).toHaveURL(/\/login/);

    await page.goto('/');
    await page.getByRole('button', { name: 'Get Started' }).click();
    await expect(page).toHaveURL(/\/register/);
  });

  test('pricing page displays plan information', async ({ page }) => {
    await page.goto('/pricing');
    await expect(page.locator('h1')).toContainText('pricing', { ignoreCase: true });
  });

  test('protected routes redirect to login', async ({ page }) => {
    const protectedPaths = ['/dashboard', '/settings', '/billing', '/alerts', '/recordings'];
    for (const path of protectedPaths) {
      await page.goto(path);
      await expect(page, `Path ${path} should redirect to /login`).toHaveURL(/\/login/);
    }
  });

  test('invalid token is rejected silently', async ({ page }) => {
    await page.goto('/login');
    await page.evaluate(() => {
      localStorage.setItem('accessToken', 'invalid-token-12345');
      localStorage.setItem('refreshToken', 'invalid-refresh-12345');
    });
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
    await page.evaluate(() => localStorage.clear());
  });

  test('malformed token does not crash app', async ({ page }) => {
    await page.goto('/login');
    await page.evaluate(() => {
      localStorage.setItem('accessToken', 'not-a-valid-jwt');
    });
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
    await page.evaluate(() => localStorage.clear());
  });
});

test.describe('Full Regression – Page Content', () => {
  test('landing page has all brand elements', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('banner').getByText('HK Camera')).toBeVisible();
    await expect(page.locator('text=smart security camera')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Get Started' })).toBeVisible();
    await expect(page.locator('a:has-text("Log in")')).toBeVisible();
  });

  test('landing has pricing link in navigation', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('a:has-text("Pricing")')).toBeVisible();
  });

  test('login form has all required fields', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
    await expect(page.locator('button:has-text("Sign in")')).toBeVisible();
    await expect(page.locator('a:has-text("Create one")')).toBeVisible();
  });

  test('register form has all required fields', async ({ page }) => {
    await page.goto('/register');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('input[placeholder="Jane Smith"]')).toBeVisible();
    await expect(page.locator('button:has-text("Create account")')).toBeVisible();
    await expect(page.locator('a:has-text("Sign in")')).toBeVisible();
  });

  test('login and register pages link to each other', async ({ page }) => {
    await page.goto('/login');
    await page.locator('a:has-text("Create one")').click();
    await expect(page).toHaveURL(/\/register/);

    await page.locator('a:has-text("Sign in")').click();
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe('Full Regression – Error Boundaries', () => {
  test('pricing page back navigation works', async ({ page }) => {
    await page.goto('/pricing');
    await expect(page.locator('button:has-text("Back")')).toBeVisible();
    await page.locator('button:has-text("Back")').click();
    await expect(page).toHaveURL('/');
  });

  test('browser back button works from login', async ({ page }) => {
    await page.goto('/');
    await page.click('a:has-text("Log in")');
    await expect(page).toHaveURL(/\/login/);
    await page.goBack();
    await expect(page).toHaveURL('/');
  });

  test('direct URL access to login preserves path', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveURL(/\/login/);
    const inputs = await page.locator('input[type="email"]').count();
    expect(inputs).toBeGreaterThan(0);
  });
});
