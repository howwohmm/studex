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
      await page.goto(`${route}?scheme=${scheme}`);
      // Entrance animations (welcome staggered fade, demo count-up) run under
      // element opacity — scanning mid-fade reports false contrast failures.
      // Wait out the longest entrance animation before analyzing.
      await page.waitForTimeout(1500);
      await expect(page.locator('body')).not.toBeEmpty();
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();
      expect(results.violations, JSON.stringify(results.violations.map((v) => v.id))).toEqual([]);
    });
  }
}
