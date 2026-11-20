export const ZONE = 'Asia/Kolkata';
export const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const COLORS = ['violet', 'blue', 'mint', 'amber', 'rose'];
export const STATUSES = ['Not started', 'In progress', 'Completed', 'Cancelled'];
export const ATTENDANCE_STATUSES = ['Present', 'Absent', 'Cancelled'];
export const TASK_TYPES = ['Assignment', 'Homework', 'Project', 'Lab', 'Reading', 'Revision', 'Personal task', 'Exam'];
export const uid = () => crypto.randomUUID();

export function dateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const get = (type) => parts.find((part) => part.type === type).value;
  return [get('year'), get('month'), get('day')].join('-');
}

function dateAt(key) { return new Date(key + 'T12:00:00Z'); }
export function shiftDate(key, days) {
  const d = dateAt(key);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
export const dayOf = (key) => dateAt(key).getUTCDay();
export const weekStart = (key) => shiftDate(key, -((dayOf(key) + 6) % 7));
export const niceDate = (key, options = { day: 'numeric', month: 'short' }) =>
  new Intl.DateTimeFormat('en-IN', { timeZone: 'UTC', ...options }).format(dateAt(key));
export const timeLabel = (time) => {
  const [h, m] = time.split(':').map(Number);
  return (h % 12 || 12) + ':' + String(m).padStart(2, '0') + ' ' + (h < 12 ? 'AM' : 'PM');
};

export function scheduleFor(state, date) {
  return state.events.filter((event) =>
    (event.date ? event.date === date : event.day === dayOf(date) &&
      (!state.profile.termStart || date >= state.profile.termStart) && (!state.profile.termEnd || date <= state.profile.termEnd)) &&
    !event.skipped?.includes(date) &&
    (event.kind === 'Break' || state.subjects.some((subject) => subject.id === event.subjectId && !subject.archived))
  ).sort((a, b) => a.start.localeCompare(b.start));
}

export function overlaps(a, b) {
  if (a.id && a.id === b.id) return false;
  if (a.start >= b.end || b.start >= a.end) return false;
  if (a.date && b.date) return a.date === b.date;
  if (a.date || b.date) {
    const single = a.date ? a : b;
    const weekly = a.date ? b : a;
    return dayOf(single.date) === weekly.day && !weekly.skipped?.includes(single.date);
  }
  return a.day === b.day;
}

export function attendance(attended, held, threshold) {
  // Use integer hundredths of a percentage point for the eligibility boundary.
  const target = Math.round(threshold * 100);
  if (!held) return { percent: null, status: 'No records', recover: null, miss: null };
  const margin = attended * 10000 - target * held;
  return {
    percent: attended / held * 100,
    status: margin < 0 ? 'At risk' : (margin < 500 * held ? 'Close to limit' : 'On track'),
    recover: margin >= 0 ? 0 : (target === 10000 ? null : Math.ceil(-margin / (10000 - target))),
    miss: margin < 0 ? 0 : Math.floor(margin / target),
  };
}

export function subjectAttendance(state, subject) {
  const records = state.records.filter((record) => record.subjectId === subject.id);
  const present = (subject.baselinePresent ?? 0) + records.filter((record) => record.status === 'Present').length;
  const held = (subject.baselineHeld ?? 0) + records.filter((record) => ['Present', 'Absent'].includes(record.status)).length;
  return { present, held, ...attendance(present, held, subject.threshold) };
}

export function remainingClasses(state, subjectId, today) {
  const { termStart, termEnd } = state.profile;
  const from = termStart && termStart > today ? termStart : today;
  if (termEnd && termEnd < from) return 0;
  const marked = new Map();
  for (const { eventId, date } of state.records) {
    if (!eventId || date < from || (termEnd && date > termEnd)) continue;
    if (!marked.has(eventId)) marked.set(eventId, new Set());
    marked.get(eventId).add(date);
  }

  let remaining = 0;
  for (const event of state.events) {
    if (event.subjectId !== subjectId || event.kind === 'Break') continue;
    const excluded = new Set([...(event.skipped ?? []), ...(marked.get(event.id) ?? [])]);
    if (event.date) {
      if (event.date >= from && (!termEnd || event.date <= termEnd) && !excluded.has(event.date)) remaining++;
    } else {
      if (!termEnd) return null;
      const first = shiftDate(from, (event.day - dayOf(from) + 7) % 7);
      if (first > termEnd) continue;
      remaining += 1 + Math.floor((dateAt(termEnd) - dateAt(first)) / (7 * 86400000));
      for (const date of excluded) {
        if (date >= first && date <= termEnd && dayOf(date) === event.day) remaining--;
      }
    }
  }
  return remaining;
}

export function matchingRecord(records, input) {
  return records.find((record) => input.id === record.id) ||
    (input.eventId ? records.find((record) => record.eventId === input.eventId && record.date === input.date) : undefined);
}
export const occurrenceLabel = (event) => event ? timeLabel(event.start) + ' – ' + timeLabel(event.end) + ' · ' + event.kind : '';

export function upsertRecord(records, input, now = new Date().toISOString()) {
  const previous = matchingRecord(records, input);
  if (!previous) return [...records, { ...input, id: input.id || uid(), createdAt: now, history: [] }];
  if (['subjectId', 'date', 'eventId', 'status'].every((key) => previous[key] === input[key])) return records;
  const before = Object.fromEntries(['subjectId', 'date', 'eventId', 'status'].map((key) => [key, previous[key]]));
  return records.map((record) => record.id === previous.id
    ? { ...record, ...input, id: previous.id, updatedAt: now, history: [...previous.history, { ...before, at: now }] }
    : record);
}

export const activeTask = (task) => !['Completed', 'Cancelled'].includes(task.status);
export function orderedTasks(tasks) {
  return [...tasks].sort((a, b) => (a.due || '9999').localeCompare(b.due || '9999') || a.title.localeCompare(b.title));
}

export function taskDeadlines(tasks, today) {
  const dated = orderedTasks(tasks.filter((task) => activeTask(task) && task.due));
  const overdue = dated.filter((task) => task.due < today);
  const upcoming = dated.filter((task) => task.due >= today);
  const cutoff = shiftDate(today, 7);
  return { overdue, upcoming, dueSoon: upcoming.filter((task) => task.due <= cutoff) };
}

const normalizeTitle = (title) => title.normalize().toLowerCase().replace(/\s+/g, ' ').trim();
export function taskKey(task) {
  return JSON.stringify([normalizeTitle(task.title), task.subjectId || '', task.due || '', task.type]);
}

export function freshState(demo = true, today = dateKey()) {
  const empty = { version: 1, demo, profile: { name: '', university: '', program: '', semester: '' }, subjects: [], events: [], tasks: [], records: [], files: [] };
  if (!demo) return empty;
  return {
    ...empty,
    profile: { name: 'Aanya Sharma', university: 'Example University', program: 'B.Tech Computer Science', semester: 'Semester 4' },
    subjects: [
      { id: 'dsa', title: 'Data Structures', code: 'CS201', color: 'violet', threshold: 75, baselinePresent: 21, baselineHeld: 24 },
      { id: 'dbms', title: 'Database Systems', code: 'CS204', color: 'blue', threshold: 75, baselinePresent: 15, baselineHeld: 19 },
      { id: 'math', title: 'Discrete Mathematics', code: 'MA202', color: 'rose', threshold: 75, baselinePresent: 13, baselineHeld: 18 },
      { id: 'os', title: 'Operating Systems', code: 'CS203', color: 'mint', threshold: 75, baselinePresent: 17, baselineHeld: 20 },
    ],
    events: [
      { id: 'demo-1', subjectId: 'dsa', day: dayOf(today), start: '09:00', end: '10:00', room: 'Room 302', kind: 'Lecture' },
      { id: 'demo-2', subjectId: 'dbms', day: dayOf(today), start: '11:00', end: '12:30', room: 'Lab 2', kind: 'Lab' },
      { id: 'demo-3', subjectId: 'math', day: dayOf(today), start: '14:00', end: '15:00', room: 'Room 105', kind: 'Lecture' },
      { id: 'demo-4', subjectId: 'os', day: dayOf(shiftDate(today, 2)), start: '10:00', end: '11:00', room: 'Room 205', kind: 'Lecture' },
      { id: 'demo-5', subjectId: 'dsa', day: dayOf(shiftDate(today, 3)), start: '13:00', end: '14:30', room: 'Lab 1', kind: 'Lab' },
      { id: 'demo-6', subjectId: 'math', day: dayOf(shiftDate(today, 4)), start: '11:00', end: '12:00', room: 'Room 105', kind: 'Tutorial' },
    ],
    tasks: [
      { id: 'task-1', subjectId: 'dsa', title: 'Implement AVL tree rotations', due: shiftDate(today, 1), priority: 'High', status: 'In progress', type: 'Assignment', effort: '90' },
      { id: 'task-2', subjectId: 'dbms', title: 'Submit SQL lab journal', due: shiftDate(today, 3), priority: 'Medium', status: 'Not started', type: 'Lab', effort: '45' },
      { id: 'task-3', subjectId: 'math', title: 'Revise graph theory notes', due: shiftDate(today, 5), priority: 'Low', status: 'Not started', type: 'Revision', effort: '30' },
      { id: 'task-4', subjectId: 'os', title: 'Operating Systems midterm', due: shiftDate(today, 12), priority: 'High', status: 'Not started', type: 'Exam' },
    ],
    files: [
      { id: 'file-1', subjectId: 'dsa', title: 'AVL trees · lecture notes', name: 'avl-trees.txt', mime: 'text/plain', date: shiftDate(today, -2), text: 'AVL trees\n\nAn AVL tree is a self-balancing binary search tree. Every node has a balance factor of -1, 0 or 1. Single and double rotations restore balance after insertion or deletion.' },
      { id: 'file-2', subjectId: 'dbms', title: 'SQL joins · quick reference', name: 'sql-joins.txt', mime: 'text/plain', date: shiftDate(today, -1), text: 'SQL joins\n\nINNER JOIN returns matching rows. LEFT JOIN also retains unmatched rows from the left table, filling in NULL values for missing right-side columns.' },
    ],
  };
}
