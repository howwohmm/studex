import { test } from '@playwright/test';

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
const CLOCKS = ['morning', 'midday', 'evening'] as const;
const slug = (r: string) => (r === '/' ? 'today' : r.replace(/^\//, '').replace(/\//g, '-'));

for (const scheme of ['light', 'dark']) {
  for (const route of ROUTES) {
    test(`shot ${route} ${scheme}`, async ({ page }, testInfo) => {
      await page.goto(`${route}?scheme=${scheme}`);
      await page.waitForTimeout(route === '/dev/today-demo' ? 2500 : 800);
      const dir = `e2e/screenshots/${testInfo.project.name}`;
      await page.screenshot({ path: `${dir}/${slug(route)}-${scheme}.png`, fullPage: true });
    });
  }
}
for (const clock of CLOCKS) {
  test(`shot today-demo ${clock}`, async ({ page }, testInfo) => {
    for (const scheme of ['light', 'dark']) {
      await page.goto(`/dev/today-demo?scheme=${scheme}&clock=${clock}`);
      await page.waitForTimeout(2500);
      const dir = `e2e/screenshots/${testInfo.project.name}`;
      await page.screenshot({ path: `${dir}/today-demo-${clock}-${scheme}.png`, fullPage: true });
    }
  });
}
