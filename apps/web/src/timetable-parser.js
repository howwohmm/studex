const days = [
  ['sun', 'sunday'], ['mon', 'monday'], ['tue', 'tues', 'tuesday'],
  ['wed', 'weds', 'wednesday'], ['thu', 'thur', 'thurs', 'thursday'],
  ['fri', 'friday'], ['sat', 'saturday'],
];

function parseDay(value) {
  const day = days.findIndex(names => names.includes(value.trim().toLowerCase()));
  return day < 0 ? null : day;
}

function parseTime(value) {
  const match = value.trim().match(/^(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm)?$/i);
  let hour, minute, period;
  if (match) {
    hour = Number(match[1]);
    minute = Number(match[2] || 0);
    period = match[3]?.toLowerCase();
  } else if (/^\d{4}$/.test(value.trim())) {
    hour = Number(value.trim().slice(0, 2));
    minute = Number(value.trim().slice(2));
  } else {
    return null;
  }
  if (minute > 59 || hour > 23 || (period && (hour < 1 || hour > 12))) return null;
  if (period) hour = hour % 12 + (period === 'pm' ? 12 : 0);
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function entry(day, start, end, subject, room) {
  start = parseTime(start);
  end = parseTime(end);
  subject = subject.trim();
  if (day === null || !start || !end || end <= start || !subject) return null;
  return { day, start, end, subject, room: room?.trim() || null };
}

function csvRows(text) {
  const rows = [];
  let row = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (quoted && text[i + 1] === '"') { field += '"'; i++; }
      else quoted = !quoted;
    } else if (!quoted && (char === ',' || char === '\n')) {
      row.push(field.trim());
      field = '';
      if (char === '\n') { rows.push(row); row = []; }
    } else {
      field += char;
    }
  }
  if (!quoted) { row.push(field.trim()); rows.push(row); }
  return rows;
}

const timeToken = '\\d{1,4}(?:[:.]\\d{1,2})?\\s*(?:am|pm)?';
const range = new RegExp(`^(${timeToken})\\s*(?:[-–—]|to)\\s*(${timeToken})\\s+(.*)$`, 'i');

export function parseTimetable(text) {
  if (typeof text !== 'string' || !text.trim()) return [];
  text = text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  const rows = csvRows(text);
  const aliases = { day: 'day', start: 'start', end: 'end', subject: 'subject', course: 'subject', room: 'room', venue: 'room' };
  const headerIndex = rows.findIndex(row => {
    const columns = row.map(cell => aliases[cell.toLowerCase()]);
    return ['day', 'start', 'end', 'subject'].every(name => columns.includes(name));
  });
  const result = [];
  if (headerIndex >= 0 || rows.some(row => row.length >= 4 && parseDay(row[0]) !== null)) {
    const columns = headerIndex >= 0
      ? rows[headerIndex].map(cell => aliases[cell.toLowerCase()])
      : ['day', 'start', 'end', 'subject', 'room'];
    for (const row of rows.slice(headerIndex + 1)) {
      const get = name => row[columns.indexOf(name)] || '';
      const parsed = entry(parseDay(get('day')), get('start'), get('end'), get('subject'), get('room'));
      if (parsed) result.push(parsed);
    }
    return result;
  }

  let day = null;
  for (let line of text.split('\n')) {
    line = line.trim();
    if (!line) continue;
    const heading = parseDay(line.replace(/:$/, ''));
    if (heading !== null) { day = heading; continue; }
    const prefix = line.match(/^([a-z]+)\b\s*:?\s*/i);
    let lineDay = day;
    if (prefix) {
      lineDay = parseDay(prefix[1]);
      if (lineDay === null) continue;
      line = line.slice(prefix[0].length);
    }
    const match = line.match(range);
    if (!match) continue;
    let subject = match[3].trim(), room = null;
    if (subject.startsWith('|')) {
      const fields = subject.slice(1).split('|').map(field => field.trim());
      if (fields.length > 2) continue;
      [subject, room] = fields;
    } else {
      const location = subject.match(/\s+\(?Room\s+(.+?)\)?$/i);
      if (location) {
        room = location[1].trim();
        subject = subject.slice(0, location.index).trim();
      }
    }
    const parsed = entry(lineDay, match[1], match[2], subject, room);
    if (parsed) result.push(parsed);
  }
  return result;
}
