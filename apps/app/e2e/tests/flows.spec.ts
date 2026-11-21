import { test, expect } from '@playwright/test';

// Any browser console error (hydration warnings, React errors, etc.) fails the
// flow it happened in — attach before the first navigation.
function watchConsole(page: import('@playwright/test').Page) {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(String(err)));
  return () => expect(errors, errors.join('\n')).toEqual([]);
}

test.describe('onboarding flow', () => {
  test('Today empty -> Scan timetable -> Welcome -> capture -> Back', async ({ page }) => {
    const checkConsole = watchConsole(page);
    await page.goto('/');
    await expect(page.getByText('Set up your subjects to see your %.')).toBeVisible();
    await page.getByRole('button', { name: 'Scan timetable' }).click();
    await expect(page).toHaveURL(/welcome/);
    await page.getByRole('button', { name: 'Scan timetable' }).click();
    await expect(page).toHaveURL(/capture/);
    await expect(page.getByText('Timetable scanning arrives in the next build.')).toBeVisible();
    await page.getByRole('button', { name: /back/i }).click();
    await expect(page).not.toHaveURL(/capture/);
    checkConsole();
  });
});

test.describe('tabs', () => {
  const TABS = [
    ['Today', '/'],
    ['Subjects', '/subjects'],
    ['Plan', '/plan'],
    ['Library', '/library'],
    ['Tutor', '/tutor'],
  ] as const;
  for (const [tab, path] of TABS) {
    test(`tab bar reaches ${tab}`, async ({ page }) => {
      const checkConsole = watchConsole(page);
      await page.goto('/');
      await page.getByRole('link', { name: tab }).first().click();
      await expect(page).toHaveURL(new RegExp(`${path === '/' ? '/$' : path}`));
      // destination screen renders its large title as a heading
      await expect(page.getByRole('heading', { name: tab }).first()).toBeVisible();
      checkConsole();
    });
  }

  test('390px uses bottom bar, 1280px uses sidebar', async ({ page }, testInfo) => {
    await page.goto('/');
    const today = page.getByRole('link', { name: 'Today' });
    const tutor = page.getByRole('link', { name: 'Tutor' });
    await expect(today).toBeVisible();
    const tb = await today.boundingBox();
    const ub = await tutor.boundingBox();
    const height = page.viewportSize()!.height;
    if (testInfo.project.name === 'mobile') {
      // bottom bar: tabs in a row, anchored to the viewport bottom
      expect(Math.abs(tb!.y - ub!.y)).toBeLessThan(5);
      expect(tb!.y + tb!.height).toBeGreaterThan(height * 0.85);
    } else {
      // sidebar: tabs stacked in a left column
      expect(tb!.x).toBeLessThan(240);
      expect(ub!.y - tb!.y).toBeGreaterThan(40);
    }
  });
});

test.describe('today-demo', () => {
  test('mark/undo/cancel behaves per spec', async ({ page }) => {
    const checkConsole = watchConsole(page);
    await page.goto('/dev/today-demo');
    // after the count-up the hero shows the computed %
    await expect(page.getByText(/^\d+%$/).first()).toBeVisible({ timeout: 10_000 });

    // the row carrying the NOW badge (innermost div that also has the buttons)
    const nowRow = page
      .locator('div', { has: page.locator(':text-is("NOW")') })
      .filter({ has: page.getByRole('button', { name: 'Attended' }) })
      .last();

    // future rows (start after the clock) expose only an options menu — no mark buttons
    const futureOptionButtons = page.getByRole('button', { name: /options$/ });
    const futureCount = await futureOptionButtons.count();
    expect(futureCount).toBeGreaterThan(0);

    // tap ✓ on the Now row -> collapses into an "Attended" pill
    await nowRow.getByRole('button', { name: 'Attended' }).click();
    await expect(nowRow.getByText('Attended')).toBeVisible();
    // marking Now must not change future rows
    expect(await futureOptionButtons.count()).toBe(futureCount);

    // Undo restores the two buttons
    await page.getByRole('button', { name: 'Undo' }).click();
    await expect(nowRow.getByRole('button', { name: 'Attended' })).toBeVisible();
    await expect(nowRow.getByRole('button', { name: 'Bunked' })).toBeVisible();

    // a future row offers only "Cancelled"
    await futureOptionButtons.first().click();
    const items = page.getByRole('menuitem');
    await expect(items).toHaveCount(1);
    await expect(items.first()).toHaveText('Cancelled');
    await items.first().click();
    await expect(page.getByText('Cancelled').first()).toBeVisible();
    checkConsole();
  });

  test('reduce motion shows the final % immediately', async ({ page }) => {
    const checkConsole = watchConsole(page);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/dev/today-demo');
    await expect(page.getByText(/^\d+%$/).first()).toBeVisible();
    checkConsole();
  });
});

test.describe('static server hardening', () => {
  test('path traversal is rejected', async ({ page }) => {
    for (const path of ['/..%2f..%2fpackage.json', '/%2e%2e/%2e%2e/package.json']) {
      const res = await page.goto(path);
      expect([403, 404]).toContain(res?.status());
      expect(await res?.text()).not.toContain('@studex/app');
    }
  });
});
