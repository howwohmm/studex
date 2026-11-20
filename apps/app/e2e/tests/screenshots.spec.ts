import { test, expect, type Page } from '@playwright/test';

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

// Navigates to a route that responded 200 with a non-empty body, then waits for
// the screen's data-settled flag (animations + query effects done) before shot.
async function gotoSettled(page: Page, url: string) {
  const res = await page.goto(url);
  expect(res, url).not.toBeNull();
  expect(res!.status(), url).toBe(200);
  const body = await res!.body();
  expect(body.length, url).toBeGreaterThan(0);
  await page.locator('[data-settled="true"]').waitFor();
}

for (const scheme of ['light', 'dark']) {
  for (const route of ROUTES) {
    test(`shot ${route} ${scheme}`, async ({ page }, testInfo) => {
      await gotoSettled(page, `${route}?scheme=${scheme}`);
      const dir = `e2e/screenshots/${testInfo.project.name}`;
      await page.screenshot({ path: `${dir}/${slug(route)}-${scheme}.png`, fullPage: true });
    });
  }
}
for (const clock of CLOCKS) {
  test(`shot today-demo ${clock}`, async ({ page }, testInfo) => {
    for (const scheme of ['light', 'dark']) {
      await gotoSettled(page, `/dev/today-demo?scheme=${scheme}&clock=${clock}`);
      const dir = `e2e/screenshots/${testInfo.project.name}`;
      await page.screenshot({ path: `${dir}/today-demo-${clock}-${scheme}.png`, fullPage: true });
    }
  });
}
