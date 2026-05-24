import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('hk-consent', 'accepted');
  });
});

test.describe('Accessibility', () => {
  const pages = [
    { name: 'Landing page', path: '/' },
    { name: 'Pricing page', path: '/pricing' },
    { name: 'Login page', path: '/login' },
    { name: 'Register page', path: '/register' },
  ];

  for (const { name, path } of pages) {
    test(`${name} has no critical or serious violations`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState('networkidle');

      const results = await new AxeBuilder({ page }).analyze();

      const criticalSerious = results.violations.filter(
        (v) => v.impact === 'critical' || v.impact === 'serious',
      );

      expect(criticalSerious.length).toBe(0);

      for (const violation of results.violations) {
        test.info().annotations.push({
          type: 'issue',
          description: `${violation.impact}: ${violation.help} (${violation.id}) — ${violation.helpUrl}`,
        });
      }

      expect.soft(results.violations.length).toBe(0);
    });
  }
});
