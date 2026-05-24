import { test } from '@playwright/test';
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
    test(`${name} has no unexpected violations`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState(wait);

      const results = await new AxeBuilder({ page }).analyze();

      for (const violation of results.violations) {
        test.info().annotations.push({
          type: 'issue',
          description: `[${violation.impact}] ${violation.help} (${violation.id}) — ${violation.helpUrl}`,
        });
      }

      // Currently known violations (all pages share this):
      // - color-contrast: Tailwind theme needs contrast fixes
      // Tracked in: <issue-url>
      const knownIds = new Set(['color-contrast']);

      const unexpected = results.violations.filter((v) => !knownIds.has(v.id));

      if (unexpected.length > 0) {
        const msg = unexpected.map((v) => `${v.id} (${v.impact})`).join(', ');
        throw new Error(`New accessibility violations found: ${msg}`);
      }
    });
  }
});
