import { useState } from 'react';
import { ArrowDownToLine, ArrowLeft, Check, CircleAlert, FileText } from 'lucide-react';
import { DAYS, COLORS, overlaps, uid } from './model.js';
import { pdfText, verifyFile } from './files.js';
import { parseTimetable } from './timetable-parser.js';
import { Button, Dialog, Field } from './ui.jsx';

const sample = 'day,start,end,subject,room\nMonday,09:00,10:00,Data Structures,Room 302\nWednesday,11:00,12:30,Database Systems,Lab 2\nFriday,14:00,15:00,Discrete Mathematics,Room 105';
const validTime = /^(?:[01][0-9]|2[0-3]):[0-5][0-9]$/;

export function ImportTimetable({ state, apply, close }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [review, setReview] = useState(null);
  const [ackConflict, setAckConflict] = useState(false);
  const [filename, setFilename] = useState('');
  const rows = review?.filter((row) => row.selected) ?? [];
  const conflict = rows.some((a, i) => [...state.events, ...rows.slice(0, i)].some((b) => overlaps(a, b)));
  async function read(file) {
    if (!file) return;
    setError(''); setFilename(''); setBusy(true);
    try {
      if (!file.size || file.size > 12 * 1024 * 1024) throw new Error('Choose a timetable file no larger than 12 MB.');
      const ext = file.name.split('.').at(-1).toLowerCase();
      let result;
      if (ext === 'pdf') {
        await verifyFile(file);
        ({ text: result } = await pdfText(file, 30));
      } else if (ext === 'txt' || ext === 'csv') {
        if (file.size > 100_000) throw new Error('Text and CSV imports are limited to 100 KB.');
        result = await file.text();
      } else if (['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
        await verifyFile(file);
        const { photoText } = await import('./ocr.js');
        result = await photoText(file);
      } else {
        throw new Error('Choose a photo, PDF, CSV or TXT timetable.');
      }
      if (!result.trim()) throw new Error('No text was found. Try a clearer photo, paste a transcription, or use a CSV export.');
      if (result.length > 100_000) throw new Error('The timetable text is too long. Try a smaller export.');
      setText(result); setFilename(file.name);
    } catch (err) { setError(err?.message || 'This file could not be read.'); }
    finally { setBusy(false); }
  }
  function submit(event) {
    event.preventDefault();
    setError('');
    if (!review) {
      const parsed = parseTimetable(text);
      if (!parsed.length) { setError('No classes recognised. Use the example format or put each class on its own line with a day and time range.'); return; }
      if (parsed.length > 100) { setError('Import no more than 100 classes at a time.'); return; }
      setReview(parsed.map((row) => ({ ...row, id: uid(), selected: true })));
      return;
    }
    if (!rows.length) { setError('Select at least one class to import.'); return; }
    if (rows.some((row) => !row.subject.trim() || !validTime.test(row.start) || !validTime.test(row.end) || row.start >= row.end)) {
      setError('Give each selected class a subject and an end time after its start.'); return;
    }
    if (conflict && !ackConflict) { setError('Confirm the overlapping times or adjust the conflicting classes.'); return; }
    const subjects = [...state.subjects];
    const events = rows.map((row) => {
      const label = row.subject.trim();
      const lower = label.toLowerCase();
      let subject = subjects.find((s) => !s.archived && (s.title.toLowerCase() === lower || s.code?.toLowerCase() === lower));
      if (!subject) {
        subject = { id: uid(), title: label, code: '', color: COLORS[subjects.length % COLORS.length], threshold: 75, baselineHeld: 0, baselinePresent: 0 };
        subjects.push(subject);
      }
      return { id: row.id, subjectId: subject.id, day: row.day, start: row.start, end: row.end, room: (row.room || '').trim(), kind: 'Class' };
    });
    apply({ ...state, subjects, events: [...state.events, ...events] }, `${events.length} ${events.length === 1 ? 'class' : 'classes'} imported.`);
  }

  const edit = (id, key, value) => {
    setReview(review.map((row) => row.id === id ? { ...row, [key]: value } : row));
    setAckConflict(false);
  };

  return <Dialog title={review ? 'Review imported classes' : 'Import timetable'} subtitle={review
    ? 'Check times and subject names before adding recurring weekly classes.'
    : 'Choose a clear English timetable photo, a text-based PDF, CSV or TXT. You can also paste one class per line.'} close={close} busy={busy}>
    <form onSubmit={submit}>
      {review ? <div className="import-review">
        <p className="muted small">{rows.length} selected. Unrecognised lines are skipped. New subject names create new subjects.</p>
        {review.map((row, i) => <fieldset key={row.id} className="import-row">
          <legend><label><input type="checkbox" checked={row.selected} onChange={(e) => edit(row.id, 'selected', e.target.checked)}/>Class {i + 1}</label></legend>
          <div className="form-grid">
            <Field label="Subject"><input maxLength={90} value={row.subject} disabled={!row.selected} onChange={(e) => edit(row.id, 'subject', e.target.value)}/></Field>
            <Field label="Day"><select value={row.day} disabled={!row.selected} onChange={(e) => edit(row.id, 'day', +e.target.value)}>
              {DAYS.map((day, j) => <option value={j} key={day}>{day}</option>)}</select></Field>
            <Field label="Starts"><input type="time" value={row.start} disabled={!row.selected} onChange={(e) => edit(row.id, 'start', e.target.value)}/></Field>
            <Field label="Ends"><input type="time" value={row.end} disabled={!row.selected} onChange={(e) => edit(row.id, 'end', e.target.value)}/></Field>
            <Field label="Room" wide><input maxLength={80} value={row.room ?? ''} disabled={!row.selected} onChange={(e) => edit(row.id, 'room', e.target.value)}/></Field>
          </div>
        </fieldset>)}
        {conflict && <label className="warning"><CircleAlert size={16}/><input type="checkbox" checked={ackConflict} onChange={(e) => setAckConflict(e.target.checked)}/>Import even though some times overlap</label>}
      </div> : <>
        <label className="file-picker"><FileText size={22}/><span>{busy ? 'Reading timetable…' : filename || 'Choose a timetable file'}</span>
          <input type="file" accept=".pdf,.csv,.txt,.jpg,.jpeg,.png,.webp" disabled={busy} onChange={(e) => { void read(e.target.files[0]); e.target.value = ''; }}/></label>
        <Field label="Timetable text"><textarea rows="7" maxLength="100000" value={text} disabled={busy} onChange={(e) => setText(e.target.value)} placeholder="Monday 09:00–10:00 | Data Structures | Room 302"/></Field>
        <button className="text-link import-example" type="button" disabled={busy} onClick={() => { setText(sample); setFilename(''); setError(''); }}>Use example text</button>
      </>}
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="dialog-actions">
        {review ? <Button variant="secondary" icon={ArrowLeft} onClick={() => { setReview(null); setAckConflict(false); setError(''); }}>Back</Button> :
          <Button variant="secondary" disabled={busy} onClick={close}>Cancel</Button>}
        <Button type="submit" icon={review ? Check : ArrowDownToLine} disabled={busy}>{review ? 'Import classes' : 'Review classes'}</Button>
      </div>
    </form>
  </Dialog>;
}
