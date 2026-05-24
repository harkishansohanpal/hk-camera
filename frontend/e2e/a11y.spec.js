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

      // Known pre-existing violations (theme-level fixes needed):
      // - color-contrast     Tailwind theme contrast
      // - meta-viewport      viewport disables zoom (pre-existing in index.html)
      // - landmark-one-main  Landing page uses <div> wrapper
      // - region             some content outside landmarks
      const knownIds = new Set(['color-contrast', 'meta-viewport', 'landmark-one-main', 'region']);

      const unexpected = results.violations.filter((v) => !knownIds.has(v.id));

      if (unexpected.length > 0) {
        const msg = unexpected.map((v) => `${v.id} (${v.impact})`).join(', ');
        throw new Error(`New accessibility violations found: ${msg}`);
      }
    });
  }
});
