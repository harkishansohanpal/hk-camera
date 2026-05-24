import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('hk-consent', 'accepted');
  });
});

test.describe('Accessibility', () => {
  const pages = [
    { name: 'Landing page', path: '/', wait: 'networkidle' },
    { name: 'Pricing page', path: '/pricing', wait: 'networkidle' },
    { name: 'Login page', path: '/login', wait: 'networkidle' },
    { name: 'Register page', path: '/register', wait: 'load' },
  ];

  for (const { name, path, wait } of pages) {
    test(`${name} has no critical or serious violations`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState(wait);

      const results = await new AxeBuilder({ page }).analyze();

      const criticalSerious = results.violations.filter(
        (v) => v.impact === 'critical' || v.impact === 'serious',
      );

      for (const violation of results.violations) {
        test.info().annotations.push({
          type: 'issue',
          description: `[${violation.impact}] ${violation.help} (${violation.id}) — ${violation.helpUrl}`,
        });
      }

      expect.soft(criticalSerious.length, `Critical/serious violations: ${criticalSerious.map(v => v.id).join(', ')}`).toBe(0);
      expect.soft(results.violations.length).toBe(0);
    });
  }
});
