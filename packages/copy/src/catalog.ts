/**
 * en-IN copy catalog. Strings marked LOCKED in docs/spec/reference/v1/briefs/copy.md
 * are byte-identical — the locked-string test enforces it.
 */
export const catalog = {
  // §1 Onboarding — capture
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

  // §5 Today
  'today.title': 'Today',
  'today.card.caption': 'Overall',
  'today.verdict.above':
    "You're at {percent}%. You can bunk {n} more and stay above {threshold}%.",
  'today.verdict.close':
    "You're at {percent}%. One bunk puts you under {threshold}%.",
  'today.verdict.below':
    "You're at {percent}%. Attend the next {n} to reach {threshold}%.",
  'today.section.now': 'Now',
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
  'today.toast.marked': '{subject} marked {state}',

  // §5/§6 marks
  'mark.attended': 'Attended',
  'mark.bunked': 'Bunked',
  'mark.cancelled': 'Cancelled',

  // §6 Subjects
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

  // §7 Subject detail
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

  // ── NEW COPY (not in copy.md; follows 01 §11 voice) ──
  'plan.title': 'Plan',
  'plan.empty': 'Your week, planned. Add a class or a study block to see it here.',
  'library.title': 'Library',
  'library.empty': 'Every file for every subject lives here. Scan a timetable to start.',
  'tutor.title': 'Tutor',
  'tutor.empty': 'Ask anything about your subjects. Answers stay on this device.',
  'today.sweep': {
    one: 'Mark the last class Attended',
    other: 'Mark remaining {n} Attended',
  },
  'common.undo': 'Undo',
  'welcome.cta': 'Scan timetable',
  'tabs.today': 'Today',
  'tabs.subjects': 'Subjects',
  'tabs.plan': 'Plan',
  'tabs.library': 'Library',
  'tabs.tutor': 'Tutor',
  'demo.badge': 'DEMO DATA',
  'demo.clock.morning': 'Morning',
  'demo.clock.midday': 'Midday',
  'demo.clock.evening': 'Evening',
  'row.budget.spare': { one: '{n} to spare', other: '{n} to spare' },
  'row.budget.below': 'attend next {n}',
  'manual.placeholder': 'Type in your timetable — coming soon.',
  'capture.placeholder': 'Timetable scanning arrives in the next build.',
  'toast.marked': 'Marked.',
  'today.verdict.unreachable':
    "You're at {percent}%. Attending everything gets you to {max}% — still short of {threshold}%.",
  'row.budget.unreachable': 'at best {max}%',
  'a11y.profile': 'Profile',
  'a11y.class.options': '{subject} options',
  'common.back': 'Back',
} as const;

export type CopyKey = keyof typeof catalog;
