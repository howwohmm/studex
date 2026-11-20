import assert from 'node:assert/strict';
import { test } from 'node:test';
import { attendance, dateKey, freshState, overlaps, scheduleFor, shiftDate, subjectAttendance, upsertRecord, weekStart } from './model.js';

test('date keys, calendar weeks and day arithmetic use Indian civil dates', () => {
  assert.equal(dateKey(new Date('2026-01-31T18:29:59Z')), '2026-01-31');
  assert.equal(dateKey(new Date('2026-01-31T18:30:00Z')), '2026-02-01');
  assert.equal(weekStart('2026-02-01'), '2026-01-26');
  assert.equal(shiftDate('2028-02-28', 1), '2028-02-29');
});

test('weekly and one-time events sort by time without archived or skipped classes', () => {
  const state = freshState(false);
  state.subjects = [{ id: 's' }, { id: 'archive', archived: true }];
  state.events = [
    { id: 'weekly', subjectId: 's', day: 1, start: '11:00' },
    { id: 'skip', subjectId: 's', day: 1, start: '08:00', skipped: ['2026-04-06'] },
    { id: 'once', subjectId: 's', date: '2026-04-06', start: '09:00' },
    { id: 'archived', subjectId: 'archive', day: 1, start: '08:00' },
  ];
  assert.deepEqual(scheduleFor(state, '2026-04-06').map((item) => item.id), ['once', 'weekly']);
  assert.deepEqual(scheduleFor(state, '2026-04-13').map((item) => item.id), ['skip', 'weekly']);
});

test('timetable overlap respects calendar exceptions and adjacent classes', () => {
  const monday = { id: 'weekly', day: 1, start: '09:00', end: '10:00', skipped: ['2026-04-13'] };
  const once = { date: '2026-04-06', start: '09:30', end: '11:00' };
  assert.equal(overlaps(monday, once), true);
  assert.equal(overlaps(once, monday), true);
  assert.equal(overlaps(monday, { ...once, date: '2026-04-13' }), false);
  assert.equal(overlaps(monday, { ...once, date: '2026-04-07' }), false);
  assert.equal(overlaps(monday, { ...once, start: '10:00' }), false);
  assert.equal(overlaps(monday, { ...once, id: 'weekly' }), false);
});

test('missing and impossible attendance forecasts are neither zero nor invented', () => {
  assert.deepEqual(attendance(0, 0, 75), { percent: null, status: 'No records', recover: null, miss: null });
  assert.deepEqual(attendance(2, 3, 100), { percent: 2 / 3 * 100, status: 'At risk', recover: null, miss: 0 });
  assert.equal(attendance(3, 4, 75).status, 'Close to limit');
  assert.equal(attendance(75, 100, 75.01).status, 'At risk');
});

test('attendance forecast finds the exact eligibility boundary across counts and targets', () => {
  for (const threshold of [0.01, 20, 66.67, 75, 82.55, 99.99, 100]) {
    const target = Math.round(threshold * 100);
    for (let held = 1; held < 60; held++) {
      for (let present = 0; present <= held; present++) {
        const result = attendance(present, held, threshold);
        if (result.status !== 'At risk') {
          assert.equal(result.recover, 0);
          assert.ok(present * 10000 >= (held + result.miss) * target);
          assert.ok(present * 10000 < (held + result.miss + 1) * target);
        } else if (target < 10000) {
          assert.equal(result.miss, 0);
          assert.ok((present + result.recover) * 10000 >= (held + result.recover) * target);
          assert.ok((present + result.recover - 1) * 10000 < (held + result.recover - 1) * target);
        } else {
          assert.equal(result.recover, null);
        }
      }
    }
  }
});

test('correcting a scheduled record keeps its original identity and audit history', () => {
  const date = '2026-04-06';
  const timestamp = '2026-04-06T10:00:00Z';
  const subject = { id: 's', baselinePresent: 3, baselineHeld: 4, threshold: 75 };
  const entry = { date, subjectId: 's', eventId: 'class', status: 'Present' };
  const records = upsertRecord([], entry, timestamp);
  assert.equal(upsertRecord(records, entry, timestamp), records);
  const next = upsertRecord(records, { ...entry, status: 'Absent' }, '2026-04-06T10:00:03Z');
  assert.equal(next.length, 1);
  assert.equal(next[0].id, records[0].id);
  assert.equal(next[0].createdAt, timestamp);
  assert.equal(next[0].history[0].status, 'Present');
  assert.equal(subjectAttendance({ records }, subject).percent, 80);
  assert.equal(subjectAttendance({ records: next }, subject).percent, 60);
});
