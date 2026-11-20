import { test, expect } from '@playwright/test';
import { AxeBuilder } from '@axe-core/playwright';

const ROUTES = [
  '/',
  '/subjects',
  '/plan',
  '/library',
  '/tutor',
  '/welcome',
  '/capture',
  '/manual-entry',
  '/dev/gallery',
  '/dev/today-demo',
  '/dev/qa',
];

// WCAG 2.2 A/AA: no rule disables — every violation fails the suite.
for (const scheme of ['light', 'dark']) {
  for (const route of ROUTES) {
    test(`axe ${route} (${scheme})`, async ({ page }) => {
      const res = await page.goto(`${route}?scheme=${scheme}`);
      expect(res?.status()).toBe(200);
      // Screens flag data-settled once entrance animations (welcome stagger,
      // demo count-up) and the scheme effect are done — scanning mid-fade
      // reports false contrast failures.
      await page.locator('[data-settled="true"]').waitFor();
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();
      expect(results.violations, JSON.stringify(results.violations.map((v) => v.id))).toEqual([]);
    });
  }
}
