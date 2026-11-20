import { test, expect } from '@playwright/test';

const isMobile = (project: string) => project === 'mobile';

test.describe('onboarding flow', () => {
  test('Today empty -> Scan timetable -> Welcome -> capture -> Back', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Set up your subjects to see your %.')).toBeVisible();
    await page.getByRole('button', { name: 'Scan timetable' }).click();
    await expect(page).toHaveURL(/welcome/);
    await page.getByRole('button', { name: 'Scan timetable' }).click();
    await expect(page).toHaveURL(/capture/);
    await expect(page.getByText('Timetable scanning arrives in the next build.')).toBeVisible();
    await page.getByRole('button', { name: /back/i }).click();
    await expect(page).not.toHaveURL(/capture/);
  });
});

test.describe('tabs', () => {
  for (const tab of ['Today', 'Subjects', 'Plan', 'Library', 'Tutor']) {
    test(`tab bar reaches ${tab}`, async ({ page }, testInfo) => {
      await page.goto('/');
      await page.getByRole('link', { name: tab }).first().click();
      await expect(page.getByRole('heading').first()).toBeVisible();
    });
  }

  test('390px uses bottom bar, 1280px uses sidebar', async ({ page }, testInfo) => {
    await page.goto('/');
    const today = page.getByRole('link', { name: 'Today' });
    const tutor = page.getByRole('link', { name: 'Tutor' });
    await expect(today).toBeVisible();
    const tb = await today.boundingBox();
    const ub = await tutor.boundingBox();
    if (testInfo.project.name === 'mobile') {
      // bottom bar: tabs in a row, anchored to the viewport bottom
      expect(Math.abs(tb!.y - ub!.y)).toBeLessThan(5);
      expect(tb!.y + tb!.height).toBeGreaterThan(800);
    } else {
      // sidebar: tabs stacked in a left column
      expect(tb!.x).toBeLessThan(240);
      expect(ub!.y - tb!.y).toBeGreaterThan(40);
    }
  });
});

test.describe('today-demo', () => {
  test('mark/undo/cancel behaves per spec', async ({ page }) => {
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
  });

  test('reduce motion shows the final % immediately', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/dev/today-demo');
    await expect(page.getByText(/^\d+%$/).first()).toBeVisible();
  });
});
