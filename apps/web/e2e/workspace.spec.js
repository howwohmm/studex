import { test, expect } from '@playwright/test';

const dialog = (page) => page.getByRole('dialog');
const nav = (page) => page.getByRole('navigation', { name: 'Main navigation' });
const preview = (page) => page.getByRole('heading', { name: 'Review imported classes' });
const uploadInput = (page) => dialog(page).locator('input[type=file]');

test('log and correct a scheduled class without duplicating attendance', async ({ page }) => {
  await page.goto('/');
  const today = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Today’s timetable' }) });
  await today.getByRole('button', { name: /Data Structures/ }).click();
  await dialog(page).getByRole('button', { name: 'Mark absent' }).click();
  await expect(today.getByRole('button', { name: /Data Structures.*Absent/ })).toBeVisible();
  await nav(page).getByRole('link', { name: 'Attendance' }).click();
  await page.getByRole('button', { name: /Data Structures.*Absent/ }).click();
  await dialog(page).getByLabel('Status', { exact: true }).selectOption('Present');
  await dialog(page).getByRole('button', { name: 'Save', exact: true }).click();
  await page.reload();
  await expect(page.getByText('22 attended · 3 missed · 25 held')).toBeVisible();
  await page.getByRole('button', { name: /Data Structures.*Corrected.*Present/ }).click();
  await expect(dialog(page).getByText(/previously absent/)).toBeVisible();
});

test('attendance and timetable share one mark, and cancellation does not count', async ({ page }) => {
  await page.goto('/#/attendance');
  await page.getByRole('button', { name: 'Log attendance' }).click();
  await dialog(page).getByLabel('Subject', { exact: true }).selectOption({ label: 'Data Structures' });
  await expect(dialog(page).getByLabel('Class occurrence')).not.toHaveValue('');
  await dialog(page).getByLabel('Status', { exact: true }).selectOption('Absent');
  await dialog(page).getByRole('button', { name: 'Save', exact: true }).click();
  await nav(page).getByRole('link', { name: 'Timetable' }).click();
  await page.getByRole('button', { name: /Data Structures.*Absent/ }).click();
  await dialog(page).getByRole('button', { name: 'Mark present' }).click();
  await page.getByRole('button', { name: /Data Structures.*Present/ }).click();
  await dialog(page).getByRole('button', { name: 'Mark cancelled' }).click();
  await nav(page).getByRole('link', { name: 'Attendance' }).click();
  await page.reload();
  await expect(page.getByText('21 attended · 3 missed · 24 held')).toBeVisible();
  await expect(page.getByRole('button', { name: /Data Structures.*9:00 AM.*Lecture.*Cancelled/ })).toHaveCount(1);
  await expect(page.getByRole('button', { name: /Data Structures.*Absent/ })).toHaveCount(0);
});

test('create, complete, and find an assignment after reload', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('banner').getByRole('button', { name: 'New assignment' }).click();
  await dialog(page).getByLabel('Title', { exact: true }).fill('Write the lab report');
  await dialog(page).getByLabel('Subject', { exact: true }).selectOption({ label: 'Database Systems' });
  await dialog(page).getByLabel('Status', { exact: true }).selectOption('In progress');
  await dialog(page).getByRole('button', { name: 'Save', exact: true }).click();
  await nav(page).getByRole('link', { name: 'Assignments' }).click();
  await page.getByRole('checkbox', { name: 'Complete Write the lab report' }).click();
  await expect(page.getByText('Assignment completed.')).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Finished', exact: true }).click();
  await expect(page.getByRole('checkbox', { name: 'Reopen Write the lab report' })).toBeChecked();
  await page.getByRole('button', { name: /Write the lab report/ }).click();
  await dialog(page).getByLabel('Title', { exact: true }).fill('Write the updated lab report');
  await dialog(page).getByRole('button', { name: 'Save', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Reopen Write the updated lab report' }).click();
  await page.getByRole('button', { name: 'Open', exact: true }).click();
  await page.getByRole('button', { name: /Write the updated lab report/ }).click();
  await expect(dialog(page).getByLabel('Status', { exact: true })).toHaveValue('In progress');
});

test('review CSV changes before linking imported classes to the subject workspace', async ({ page }) => {
  await page.goto('/#/timetable');
  await page.getByRole('button', { name: 'Import', exact: true }).click();
  await uploadInput(page).setInputFiles({
    name: 'timetable.csv', mimeType: 'text/csv',
    buffer: Buffer.from('day,start,end,subject,room\nWednesday,07:00,08:15,Computer Graphics,Room 101\nThursday,07:00,08:00,Computer Graphics,Room 101'),
  });
  await expect(dialog(page).getByLabel('Timetable text')).toHaveValue(/Computer Graphics/);
  await dialog(page).getByRole('button', { name: 'Review classes' }).click();
  await expect(preview(page)).toBeVisible();
  await dialog(page).getByRole('checkbox', { name: 'Class 2' }).uncheck();
  const first = dialog(page).getByRole('group', { name: 'Class 1' });
  await first.locator('summary').click();
  await first.getByLabel('Room').fill('Studio 12');
  await dialog(page).getByRole('button', { name: 'Import classes' }).click();
  await page.getByRole('button', { name: 'Week', exact: true }).click();
  await expect(page.getByRole('button', { name: /Computer Graphics.*Studio 12/ })).toHaveCount(1);
  await nav(page).getByRole('link', { name: 'Subjects' }).click();
  await page.getByRole('button', { name: /Computer Graphics/ }).click();
  await expect(page.getByRole('heading', { name: 'Computer Graphics', exact: true })).toBeVisible();
});

function textPdf(line) {
  const stream = 'BT /F1 15 Tf 44 730 Td (' + line + ') Tj ET';
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Count 1 /Kids [3 0 R] >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    '<< /Length ' + stream.length + ' >>\nstream\n' + stream + '\nendstream',
  ];
  let doc = '%PDF-1.4\n';
  const xref = ['0000000000 65535 f \n'];
  objects.forEach((body, i) => {
    xref.push(String(doc.length).padStart(10, '0') + ' 00000 n \n');
    doc += (i + 1) + ' 0 obj\n' + body + '\nendobj\n';
  });
  return Buffer.from(doc + 'xref\n0 ' + xref.length + '\n' + xref.join('') +
    'trailer\n<< /Size ' + xref.length + ' /Root 1 0 R >>\nstartxref\n' + doc.length + '\n%%EOF\n');
}

test('extract a timetable locally from a selectable-text PDF', async ({ page }) => {
  await page.goto('/#/timetable');
  await page.getByRole('button', { name: 'Import', exact: true }).click();
  await uploadInput(page).setInputFiles({
    name: 'timetable.pdf', mimeType: 'application/pdf', buffer: textPdf('Monday 09:00-10:00 Signals and Systems'),
  });
  await expect(dialog(page).getByLabel('Timetable text')).toHaveValue(/Signals and Systems/);
  await dialog(page).getByRole('button', { name: 'Review classes' }).click();
  await expect(preview(page)).toBeVisible();
  await expect(dialog(page).locator('summary')).toContainText('Signals and Systems');
});

test('read a timetable photo without a third-party request', async ({ page }) => {
  const external = [];
  page.on('request', (request) => { if (!request.url().startsWith('http://127.0.0.1:4180')) external.push(request.url()); });
  await page.goto('/#/timetable');
  await page.getByRole('button', { name: 'Import', exact: true }).click();
  const image = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1500; canvas.height = 200;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'white'; ctx.fillRect(0, 0, 1500, 200);
    ctx.fillStyle = 'black'; ctx.font = '54px Arial';
    ctx.fillText('Monday 09:00-10:00 Applied Physics', 65, 116);
    return canvas.toDataURL().split(',')[1];
  });
  await uploadInput(page).setInputFiles({ name: 'timetable.png', mimeType: 'image/png', buffer: Buffer.from(image, 'base64') });
  await expect(dialog(page).getByLabel('Timetable text')).toHaveValue(/Applied Physics/i, { timeout: 20_000 });
  await dialog(page).getByRole('button', { name: 'Review classes' }).click();
  await expect(preview(page)).toBeVisible();
  await expect(dialog(page).locator('summary')).toContainText(/Applied Physics/i);
  expect(external).toEqual([]);
});

test('store a material locally, find it by content, and delete its original', async ({ page }) => {
  await page.goto('/#/library');
  await page.getByRole('button', { name: 'Upload material' }).click();
  await uploadInput(page).setInputFiles({ name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('Hamiltonian paths') });
  await dialog(page).getByLabel('Display name').fill('Graph theory');
  await dialog(page).getByLabel('Subject', { exact: true }).selectOption({ label: 'Discrete Mathematics' });
  await dialog(page).getByRole('button', { name: 'Upload material', exact: true }).click();
  await expect(page.getByRole('button', { name: /Graph theory/ })).toBeVisible();
  await page.reload();
  await page.getByRole('textbox', { name: 'Search the library' }).fill('Hamiltonian');
  await page.getByRole('button', { name: /Graph theory/ }).click();
  await expect(dialog(page).getByText('Hamiltonian paths')).toBeVisible();
  const download = page.waitForEvent('download');
  await dialog(page).getByRole('button', { name: 'Download' }).click();
  expect((await download).suggestedFilename()).toBe('notes.txt');
  await dialog(page).getByRole('button', { name: 'Delete', exact: true }).click();
  await dialog(page).getByRole('button', { name: 'Remove', exact: true }).click();
  await expect(page.getByText('No materials found')).toBeVisible();
  expect(await page.evaluate(() => new Promise((resolve) => {
    const request = indexedDB.open('studex-files', 1);
    request.onsuccess = () => {
      const db = request.result;
      const count = db.transaction('files').objectStore('files').count();
      count.onsuccess = () => { db.close(); resolve(count.result); };
    };
  }))).toBe(0);
});

test('mobile navigation and settings let a student start a blank workspace', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('navigation', { name: 'Quick navigation' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await page.getByRole('link', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: 'Start my own workspace' }).click();
  await dialog(page).getByRole('button', { name: 'Replace workspace' }).click();
  await expect(page.getByText('Your workspace is ready.')).toBeVisible();
  await page.reload();
  await page.getByRole('navigation', { name: 'Quick navigation' }).getByRole('link', { name: 'Overview' }).click();
  await expect(page.getByRole('heading', { name: 'Make today count.' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Set up your semester' })).toBeVisible();
  await page.getByRole('button', { name: 'Add a subject', exact: true }).click();
  await expect(dialog(page).getByLabel('Subject name')).toBeFocused();
});

test('phone dock makes actions reachable and attendance can be undone', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await page.goto('/');
  const dock = page.getByRole('navigation', { name: 'Quick navigation' });
  await expect(dock.getByRole('link', { name: 'Subjects' })).toBeVisible();
  const add = dock.getByRole('button', { name: 'Quick actions' });
  await add.click();
  await dialog(page).getByRole('button', { name: 'New assignment' }).click();
  await expect(dialog(page).getByLabel('Title', { exact: true })).toBeFocused();
  await dialog(page).getByRole('button', { name: 'Cancel' }).click();
  const today = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Today’s timetable' }) });
  const target = today.getByRole('button', { name: /Data Structures/ });
  await target.click();
  await dialog(page).getByRole('button', { name: 'Mark present' }).click();
  await expect(target).toContainText('Present');
  const undo = page.getByRole('button', { name: 'Undo', exact: true });
  const noticeBox = await undo.boundingBox();
  const dockBox = await dock.boundingBox();
  expect(noticeBox.y + noticeBox.height).toBeLessThanOrEqual(dockBox.y);
  await undo.click();
  await expect(target).not.toContainText('Present');
  await expect(page.getByText('Attendance restored.')).toBeVisible();
});

test('workspace changes in another tab keep the open draft and restore keyboard focus', async ({ page, context }) => {
  await page.goto('/');
  const opener = page.getByRole('banner').getByRole('button', { name: 'New assignment' });
  await opener.focus();
  await page.keyboard.press('Enter');
  const title = dialog(page).getByLabel('Title', { exact: true });
  await expect(title).toBeFocused();
  await title.fill('Draft title');
  const other = await context.newPage();
  await other.goto('/');
  await other.getByRole('banner').getByRole('button', { name: 'New assignment' }).click();
  await dialog(other).getByLabel('Title', { exact: true }).fill('Title saved in another tab');
  await dialog(other).getByRole('button', { name: 'Save', exact: true }).click();
  await expect(dialog(other)).not.toBeVisible();
  await expect(title).toHaveValue('Draft title');
  await page.keyboard.press('Escape');
  await expect(opener).toBeFocused();
  await expect(page.getByText('Workspace updated in another tab.')).toBeVisible();
});

test('saving a subject notes draft preserves units added in another tab', async ({ page, context }) => {
  await page.goto('/#/subject/dsa');
  await page.getByRole('button', { name: 'Edit notes' }).click();
  await dialog(page).getByLabel('Subject notes').fill('Draft notes about sorting');
  const other = await context.newPage();
  await other.goto('/#/subject/dsa');
  await other.getByRole('button', { name: 'Add unit' }).click();
  await dialog(other).getByLabel('Unit name').fill('Dynamic programming');
  await dialog(other).getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByText('Workspace updated in another tab.')).toBeVisible();
  await dialog(page).getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByText('Draft notes about sorting')).toBeVisible();
  await expect(page.getByText('Dynamic programming')).toBeVisible();
});

test('production workspace reloads and extracts PDF text offline after first load', async ({ page, context }) => {
  await page.goto('/#/library');
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Library' })).toBeVisible();
  await page.getByRole('button', { name: 'Upload material' }).click();
  await uploadInput(page).setInputFiles({
    name: 'lecture.pdf', mimeType: 'application/pdf', buffer: textPdf('Consecutive fractions'),
  });
  await dialog(page).getByRole('button', { name: 'Upload material', exact: true }).click();
  await expect(page.getByText('Material uploaded.')).toBeVisible();
  await page.getByRole('button', { name: 'Search Studex' }).click();
  await expect(dialog(page).getByRole('textbox', { name: 'Search workspace' })).toBeFocused();
  await page.keyboard.type('consecutive fractions');
  await expect(dialog(page).getByRole('button', { name: /lecture.pdf/ })).toBeVisible();
});

test.describe('without a service worker', () => {
  test.use({ serviceWorkers: 'block' });
  test('an offline PDF is indexed after reconnection', async ({ page, context }) => {
    await page.goto('/#/library');
    await context.setOffline(true);
    await page.getByRole('button', { name: 'Upload material' }).click();
    await uploadInput(page).setInputFiles({
      name: 'reader.pdf', mimeType: 'application/pdf', buffer: textPdf('Local search phrase'),
    });
    await dialog(page).getByRole('button', { name: 'Upload material', exact: true }).click();
    await expect(page.getByText(/Text extraction will retry when you reconnect/)).toBeVisible();
    await context.setOffline(false);
    await page.getByRole('textbox', { name: 'Search the library' }).fill('Local search phrase');
    await expect(page.getByRole('button', { name: /reader.pdf/ })).toBeVisible();
  });
});
