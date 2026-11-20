import { describe, expect, it } from 'vitest';
import { catalog, t, type CopyKey } from '../index';

/** LOCKED strings from docs/spec/reference/v1/briefs/copy.md — must match byte-for-byte. */
const LOCKED: Record<string, string> = {
  'onboarding.headline': 'What do you have today?',
  'onboarding.feature.1': 'Your day, sorted.',
  'onboarding.feature.2': 'Know your number. Always.',
  'onboarding.feature.3': 'Never lose a file again.',
  'capture.button.scan': 'Scan timetable',
  'capture.button.photos': 'Choose from Photos',
  'capture.button.pdf': 'Pick a PDF',
  'capture.caption':
    'Crumpled paper, PDF, screenshot from the class group — all fine.',
  'capture.manual.link': 'No timetable handy? Type it in',
  'permission.camera':
    'StudEx uses the camera to scan your timetable and to add photos to your subject folders. Everything stays on this device.',
  'today.title': 'Today',
  'today.card.caption': 'Overall',
  'today.verdict.above':
    "You're at {percent}%. You can bunk {n} more and stay above {threshold}%.",
  'today.verdict.close':
    "You're at {percent}%. One bunk puts you under {threshold}%.",
  'today.verdict.below':
    "You're at {percent}%. Attend the next {n} to reach {threshold}%.",
  'today.section.upcoming': 'Coming up',
  'today.section.earlier': 'Earlier',
  'today.badge.now': 'NOW',
  'today.row.multihour': 'Hour {i} of {k}',
  'today.unmarked.prompt': 'Did you make it?',
  'today.state.attended': 'Attended',
  'today.state.bunked': 'Bunked',
  'today.state.cancelled': 'Cancelled',
  'today.cancelled.detail': "Doesn't count",
  'today.empty': 'Nothing today. Go touch grass.',
  'today.toast.recovered': "You're back above {threshold}%!",
  'mark.attended': 'Attended',
  'mark.bunked': 'Bunked',
  'mark.cancelled': 'Cancelled',
  'subjects.title': 'Subjects',
  'subjects.row.subtitle': '{attended} of {held} attended',
  'subjects.toolbar.heatmap': 'Your semester',
  'subjects.empty': 'Set up your subjects to see your %.',
  'a11y.subject.above':
    '{subject}. {percent} percent. {attended} of {held} attended. You can bunk {n} more.',
  'a11y.subject.close':
    '{subject}. {percent} percent. {attended} of {held} attended. No bunks to spare.',
  'a11y.subject.below':
    '{subject}. {percent} percent. {attended} of {held} attended. Attend the next {n} to reach {threshold} percent.',
  'detail.status.above': '{percent}%. You can bunk {n} more and stay above {threshold}%.',
  'detail.status.close': '{percent}%. One bunk puts you under {threshold}%.',
  'detail.status.below': '{percent}%. Attend the next {n} to reach {threshold}%.',
  'detail.status.counts': '{attended} of {held} attended',
  'detail.files.header': 'Files',
  'detail.add.a11y': 'Add to {subject}',
  'detail.add.camera': 'Take a photo',
  'detail.add.photos': 'Choose from Photos',
  'detail.add.files': 'Browse Files',
  'detail.add.note': 'Write a note',
  'note.editor.title': 'New note',
  'note.editor.save': 'Save',
  'detail.empty': 'Empty folder. Drop something in.',
};

describe('FR-COPY locked strings', () => {
  it.each(Object.entries(LOCKED))('locked key %s matches copy.md verbatim', (key, text) => {
    expect(catalog[key as CopyKey]).toBe(text);
  });

  it('no retired Claude-key strings exist in the catalog', () => {
    for (const key of Object.keys(catalog)) {
      expect(key).not.toContain('claude');
      expect(key).not.toContain('boost');
    }
    for (const value of Object.values(catalog)) {
      const s = typeof value === 'string' ? value : value.one + value.other;
      expect(s).not.toContain('Claude');
    }
  });
});

describe('t()', () => {
  it('interpolates params', () => {
    expect(t('today.verdict.below', { percent: '72', n: 4, threshold: '75' })).toBe(
      "You're at 72%. Attend the next 4 to reach 75%.",
    );
  });

  it('throws on a missing param', () => {
    expect(() => t('today.verdict.below', { percent: '72' })).toThrowError(/missing param/);
  });

  it('plurals select via Intl.PluralRules', () => {
    expect(t('today.sweep', { n: 1 })).toBe('Mark the last class Attended');
    expect(t('today.sweep', { n: 3 })).toBe('Mark remaining 3 Attended');
  });

  it('every catalog key resolves', () => {
    for (const key of Object.keys(catalog) as CopyKey[]) {
      const entry = catalog[key];
      const params: Record<string, string | number> = {
        percent: '75', n: 2, threshold: '75', subject: 'DBMS',
        attended: 10, held: 12, i: 1, k: 2, state: 'Bunked', filename: 'x',
      };
      expect(() => t(key, params)).not.toThrow();
      expect(typeof t(key, params)).toBe('string');
      expect(entry).toBeTruthy();
    }
  });
});
