import { useState } from 'react';
import { BookOpen, Check, CircleAlert, ClipboardList, Download, FileText, MapPin, Search, Trash2, Upload } from 'lucide-react';
import { COLORS, DAYS, STATUSES, TASK_TYPES, dayOf, freshState, niceDate, overlaps, uid, upsertRecord } from './model.js';
import { clearFiles, deleteFile, getFile, putFile } from './storage.js';
import { fileAccept, fileHash, pdfText, verifyFile } from './files.js';
import { ImportTimetable } from './import.jsx';
import { Badge, Button, DayLabel, Dialog, Empty, Field, SubjectOptions, Tile, TimeRange } from './ui.jsx';

const replace = (list, item) => list.some((x) => x.id === item.id) ? list.map((x) => x.id === item.id ? item : x) : [...list, item];
const kindOptions = ['Class', 'Lecture', 'Lab', 'Tutorial', 'Seminar'];
const Titles = {
  subject: ['Add a subject', 'Edit subject'], event: ['Add a class', 'Edit class'],
  task: ['Add an assignment', 'Edit assignment'], record: ['Log attendance', 'Correct attendance'],
  unit: ['Add a unit', 'Edit unit'], notes: ['Edit academic notes', 'Edit academic notes'],
  profile: ['Edit academic profile', 'Edit academic profile'],
};

function FormDialog({ action, state, today, apply, close, open }) {
  const { type, item, date = today, subjectId = '', kind, subject } = action;
  const [error, setError] = useState('');
  const [override, setOverride] = useState(null);
  const [repeat, setRepeat] = useState(!item || !item.date);
  const subjects = state.subjects.filter((s) => !s.archived || s.id === (item?.subjectId || subjectId));
  if ((type === 'record' || type === 'event') && !subjects.length) {
    return <Dialog title={Titles[type][0]} close={close}><Empty icon={BookOpen} title="Add a subject first" text="Classes and attendance records belong to a subject." action="Add a subject" onAction={() => open({ type: 'subject' })}/></Dialog>;
  }
  function submit(event) {
    event.preventDefault();
    setError('');
    const form = new FormData(event.currentTarget);
    const get = (key) => String(form.get(key) ?? '').trim();
    let next;
    let notice = 'Changes saved.';
    if (type === 'profile') {
      next = { ...state, profile: { name: get('name'), university: get('university'), program: get('program'), semester: get('semester') } };
    }
    if (type === 'notes' || type === 'unit') {
      const updated = type === 'notes' ? { ...subject, notes: get('notes') } : { ...subject, units: replace(subject.units ?? [],
        { id: item?.id || uid(), title: get('title'), topics: get('topics').split('\n').map((line) => line.trim()).filter(Boolean) }) };
      if (type === 'unit' && !get('title')) { setError('Enter a name for this unit.'); return; }
      next = { ...state, subjects: replace(state.subjects, updated) };
    }
    if (type === 'subject') {
      const title = get('title'), code = get('code');
      const baselinePresent = +get('baselinePresent'), baselineHeld = +get('baselineHeld');
      const threshold = +get('threshold');
      if (!title) { setError('Enter a subject name.'); return; }
      if (baselinePresent > baselineHeld) { setError('Attended classes can’t be more than classes held.'); return; }
      if (state.subjects.some((s) => s.id !== item?.id && !s.archived && (s.title.toLowerCase() === title.toLowerCase() || (code && s.code?.toLowerCase() === code.toLowerCase())))) {
        setError('An active subject already uses that name or code.'); return;
      }
      next = { ...state, subjects: replace(state.subjects, { ...item, id: item?.id || uid(), title, code,
        baselinePresent, baselineHeld, threshold, description: get('description'), color: get('color'), archived: form.has('archived') }) };
      notice = item ? 'Subject updated.' : 'Subject added.';
    }
    if (type === 'event') {
      const input = { ...item, subjectId: get('subjectId'), kind: get('kind'), start: get('start'), end: get('end'), room: get('room'),
        day: repeat ? +get('day') : null, date: repeat ? null : get('date') };
      if (input.start >= input.end) { setError('End time must be after start time.'); return; }
      const collision = state.events.filter((other) => state.subjects.some((s) => s.id === other.subjectId && !s.archived)).some((other) => overlaps(input, other));
      const fingerprint = JSON.stringify(input);
      if (collision && override !== fingerprint) { setOverride(fingerprint); setError('This overlaps another class. Save again if you want to keep both.'); return; }
      next = { ...state, events: replace(state.events, { ...input, id: item?.id || uid() }) };
      notice = item ? 'Class updated.' : 'Class added.';
    }
    if (type === 'task') {
      if (!get('title')) { setError('Enter a title for this assignment.'); return; }
      const status = get('status');
      const beforeComplete = status === 'Completed'
        ? item?.status === 'Completed' ? item.beforeComplete : item?.status
        : undefined;
      next = { ...state, tasks: replace(state.tasks, { id: item?.id || uid(), title: get('title'), subjectId: get('subjectId'),
        type: get('type'), priority: get('priority'), status, beforeComplete, due: get('due'), effort: get('effort'), description: get('description') }) };
      notice = item ? 'Assignment updated.' : 'Assignment added.';
    }
    if (type === 'record') {
      if (get('date') > today) { setError('You can’t log attendance for a future date.'); return; }
      next = { ...state, records: upsertRecord(state.records, { id: item?.id, subjectId: item?.eventId ? item.subjectId : get('subjectId'),
        date: item?.eventId ? item.date : get('date'), eventId: item?.eventId ?? null, status: get('status') }) };
      notice = 'Attendance saved.';
    }
    apply(next, notice);
  }
  return <Dialog title={Titles[type][Number(Boolean(item))]} close={close}>
    <form onSubmit={submit} onChange={() => { setOverride(null); setError(''); }}>
      <div className="form-grid">
        {type === 'profile' && <>
          <Field label="Name" wide><input name="name" defaultValue={state.profile.name} maxLength={65} placeholder="Your name"/></Field>
          <Field label="University or college" wide><input name="university" defaultValue={state.profile.university} maxLength={100} placeholder="Optional"/></Field>
          <Field label="Program"><input name="program" defaultValue={state.profile.program} maxLength={90} placeholder="B.Tech CSE"/></Field>
          <Field label="Semester"><input name="semester" defaultValue={state.profile.semester} maxLength={40} placeholder="Semester 4"/></Field>
        </>}
        {type === 'notes' && <Field label="Subject notes" wide><textarea name="notes" rows="8" maxLength={12000} defaultValue={subject.notes}/></Field>}
        {type === 'unit' && <>
          <Field label="Unit name" wide><input name="title" defaultValue={item?.title} required maxLength={80}/></Field>
          <Field label="Topics" hint="Enter one topic per line." wide><textarea name="topics" rows="6" maxLength={3000} defaultValue={item?.topics?.join('\n')}/></Field>
        </>}
        {type === 'subject' && <>
          <Field label="Subject name" wide><input name="title" defaultValue={item?.title} required maxLength={90} placeholder="Data Structures"/></Field>
          <Field label="Course code"><input name="code" defaultValue={item?.code} maxLength={30} placeholder="CS201"/></Field>
          <Field label="Colour"><select name="color" defaultValue={item?.color || COLORS[state.subjects.length % COLORS.length]}>{COLORS.map((c) => <option key={c} value={c}>{c[0].toUpperCase() + c.slice(1)}</option>)}</select></Field>
          <Field label="Attendance target (%)" wide><input name="threshold" type="number" min="0.01" max="100" step="0.01" defaultValue={item?.threshold ?? 75} required/></Field>
          <Field label="Already held" hint="Before using Studex"><input name="baselineHeld" type="number" min="0" max="10000" step="1" defaultValue={item?.baselineHeld ?? 0}/></Field>
          <Field label="Already attended" hint="Out of classes already held"><input name="baselinePresent" type="number" min="0" max="10000" step="1" defaultValue={item?.baselinePresent ?? 0}/></Field>
          <Field label="About this subject" wide><textarea name="description" rows="2" maxLength={600} defaultValue={item?.description}/></Field>
          {item && <label className="wide check-field"><input type="checkbox" name="archived" defaultChecked={item.archived}/>Archive subject (keeps historical records)</label>}
        </>}
        {['event', 'task', 'record'].includes(type) && <>
          {type === 'task' && <Field label="Title" wide><input name="title" defaultValue={item?.title} required maxLength={120} placeholder="What do you need to do?"/></Field>}
          <Field label="Subject" wide><select name="subjectId" defaultValue={item?.subjectId || subjectId} disabled={type === 'record' && !!item?.eventId} required={type !== 'task'}>
            <SubjectOptions subjects={type === 'task' ? state.subjects : subjects} optional={type === 'task'}/>
          </select></Field>
        </>}
        {type === 'event' && <>
          <Field label="Repeats"><select value={repeat ? 'weekly' : 'once'} onChange={(e) => setRepeat(e.target.value === 'weekly')}><option value="weekly">Every week</option><option value="once">One time</option></select></Field>
          {repeat ? <Field label="Day"><select name="day" defaultValue={item?.day ?? dayOf(date)}>{DAYS.map((d, i) => <option value={i} key={d}>{d}</option>)}</select></Field> :
            <Field label="Date"><input name="date" type="date" defaultValue={item?.date || date} required/></Field>}
          <Field label="Starts"><input name="start" type="time" defaultValue={item?.start || '09:00'} required/></Field>
          <Field label="Ends"><input name="end" type="time" defaultValue={item?.end || '10:00'} required/></Field>
          <Field label="Room"><input name="room" maxLength={80} defaultValue={item?.room} placeholder="Room or meeting link"/></Field>
          <Field label="Class type"><select name="kind" defaultValue={item?.kind || 'Lecture'}>{kindOptions.map((k) => <option key={k}>{k}</option>)}</select></Field>
        </>}
        {type === 'task' && <>
          <Field label="Due date"><input name="due" type="date" defaultValue={item?.due}/></Field>
          <Field label="Type"><select name="type" defaultValue={item?.type || kind || 'Assignment'}>{TASK_TYPES.map((t) => <option key={t}>{t}</option>)}</select></Field>
          <Field label="Priority"><select name="priority" defaultValue={item?.priority || 'Medium'}>{['Low', 'Medium', 'High'].map((t) => <option key={t}>{t}</option>)}</select></Field>
          <Field label="Status"><select name="status" defaultValue={item?.status || 'Not started'}>{STATUSES.map((t) => <option key={t}>{t}</option>)}</select></Field>
          <Field label="Estimated effort (minutes)" wide><input name="effort" type="number" min="1" max="10000" defaultValue={item?.effort} placeholder="Optional"/></Field>
          <Field label="Description" wide><textarea name="description" rows="3" maxLength={4000} defaultValue={item?.description}/></Field>
        </>}
        {type === 'record' && <>
          <Field label="Class date"><input name="date" type="date" max={today} defaultValue={item?.date || date} disabled={!!item?.eventId} required/></Field>
          <Field label="Status"><select name="status" defaultValue={item?.status || 'Present'}><option>Present</option><option>Absent</option></select></Field>
          {item && <div className="audit wide"><strong>Record history</strong><p>Recorded {new Date(item.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
            {item.history?.map((h, i) => <p key={i}>{new Date(h.at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}: previously {h.status.toLowerCase()} on {niceDate(h.date)} for {state.subjects.find((s) => s.id === h.subjectId)?.title || 'a subject'}</p>)}</div>}
        </>}
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="dialog-actions">
        {item && type === 'task' && <Button variant="danger-text" icon={Trash2} onClick={() => open({ type: 'removeTask', item })}>Delete</Button>}
        {item && type === 'unit' && <Button variant="danger-text" icon={Trash2} onClick={() => open({ type: 'removeUnit', subject, item })}>Delete</Button>}
        <Button variant="secondary" onClick={close}>Cancel</Button><Button icon={Check} type="submit">{override ? 'Save anyway' : 'Save'}</Button>
      </div>
    </form>
  </Dialog>;
}

function ClassDialog({ action, state, today, apply, close, open }) {
  const { item, date } = action;
  const subject = state.subjects.find((s) => s.id === item.subjectId);
  const record = state.records.find((r) => r.eventId === item.id && r.date === date);
  return <Dialog title={subject?.title || 'Class'} subtitle={item.kind + (item.date ? ' · One-time class' : ' · Repeats weekly')} close={close}>
    <div className="class-meta"><DayLabel date={date}/><TimeRange item={item}/><span className="day-label"><MapPin size={15}/>{item.room || 'No room set'}</span></div>
    <div className="class-attendance">
      <strong>Attendance</strong>
      {record && <Badge color={record.status === 'Present' ? 'mint' : 'rose'}>{record.status}</Badge>}
      {date > today ? <p className="muted small">You can record attendance on or after the class date.</p> : <div className="actions">
        {['Present', 'Absent'].map((status) => <Button key={status} variant={status === 'Present' ? 'primary' : 'secondary'} onClick={() => apply({ ...state, records: upsertRecord(state.records, {
          eventId: item.id, subjectId: item.subjectId, date, status,
        }) }, 'Marked ' + status.toLowerCase() + '.')}>{'Mark ' + status.toLowerCase()}</Button>)}
      </div>}
    </div>
    <div className="dialog-actions">
      <Button variant="danger-text" onClick={() => open({ type: 'removeEvent', item, date })}>Remove</Button>
      <Button variant="secondary" onClick={() => open({ type: 'event', item, date })}>Edit {item.date ? 'class' : 'series'}</Button>
    </div>
  </Dialog>;
}

function UploadDialog({ action, state, today, apply, close }) {
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event) {
    event.preventDefault();
    if (!file) { setError('Choose a file first.'); return; }
    const data = new FormData(event.currentTarget);
    setBusy(true); setError('');
    try {
      const mime = await verifyFile(file);
      const hash = await fileHash(file);
      if (state.files.some((item) => item.hash === hash)) throw new Error('This file is already in your library.');
      const details = { id: uid(), mime, hash, name: file.name, size: file.size, date: today,
        title: String(data.get('title')).trim() || file.name, subjectId: String(data.get('subjectId')) };
      if (mime === 'text/plain') details.text = (await file.slice(0, 128_000).text()).slice(0, 40_000);
      if (mime === 'application/pdf') {
        try {
          const result = await pdfText(file);
          details.pages = result.pages; details.text = result.text.slice(0, 40_000);
        } catch (err) {
          if (err.message?.includes('pages')) throw err;
          details.textUnavailable = true;
        }
      }
      await putFile(details.id, file);
      if (!apply({ ...state, files: [...state.files, details] }, 'Material uploaded.')) await deleteFile(details.id);
    } catch (err) { setError(err.message || 'Could not store this file.'); }
    finally { setBusy(false); }
  }
  return <Dialog title="Upload material" subtitle="Store and organise a file in this browser. Up to 20 MB per file." close={close} busy={busy}>
    <form onSubmit={submit}>
      <label className="file-picker"><Upload size={21}/><span>{file?.name || 'Choose a PDF, slide deck, document, or image'}</span>
        <input type="file" accept={fileAccept} disabled={busy} onChange={(e) => { setFile(e.target.files[0] || null); setError(''); }}/></label>
      <div className="form-grid">
        <Field label="Display name" wide><input name="title" maxLength={100} placeholder="Defaults to the filename" disabled={busy}/></Field>
        <Field label="Subject" wide><select name="subjectId" disabled={busy} defaultValue={action.subjectId || ''}><SubjectOptions subjects={state.subjects} optional/></select></Field>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="dialog-actions"><Button variant="secondary" disabled={busy} onClick={close}>Cancel</Button>
        <Button icon={Upload} disabled={busy} type="submit">{busy ? 'Saving…' : 'Upload material'}</Button></div>
    </form>
  </Dialog>;
}

function FileDialog({ item, state, apply, close, open }) {
  const [error, setError] = useState('');
  async function download() {
    try {
      const file = item.hash ? await getFile(item.id) : new Blob([item.text ?? ''], { type: item.mime });
      if (!file) throw new Error('The original file is no longer stored in this browser.');
      const link = document.createElement('a');
      const url = URL.createObjectURL(file);
      link.href = url; link.download = item.name; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
    } catch (err) { setError(err.message || 'The file couldn’t be opened.'); }
  }
  function save(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const title = String(data.get('title')).trim();
    if (!title) { setError('Enter a display name.'); return; }
    apply({ ...state, files: replace(state.files, { ...item, title, subjectId: String(data.get('subjectId')) }) }, 'Material updated.');
  }
  return <Dialog title="Material details" subtitle={item.name + (item.pages ? ' · ' + item.pages + ' pages' : '')} close={close}>
    <form onSubmit={save}><div className="form-grid">
      <Field label="Display name" wide><input name="title" maxLength={Math.max(100, item.title.length)} defaultValue={item.title} required/></Field>
      <Field label="Subject" wide><select name="subjectId" defaultValue={item.subjectId}><SubjectOptions subjects={state.subjects} optional/></select></Field>
    </div>
      {item.text ? <pre className="file-preview">{item.text.slice(0, 2400)}{item.text.length > 2400 ? '\n…' : ''}</pre> :
        <p className="muted small file-hint">No text preview available. Download the original to view it.</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="dialog-actions">
        <Button variant="danger-text" icon={Trash2} onClick={() => open({ type: 'removeFile', item })}>Delete</Button>
        <Button variant="secondary" icon={Download} onClick={download}>Download</Button>
        <Button icon={Check} type="submit">Save details</Button>
      </div>
    </form>
  </Dialog>;
}

function ConfirmDialog({ action, state, today, apply, close }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const { type, item, subject, date } = action;
  const options = {
    removeFile: ['Delete material?', 'The file and its searchable text will be removed from this browser.'],
    removeTask: ['Delete assignment?', 'This assignment will be removed from your workspace.'],
    removeUnit: ['Delete unit?', 'The unit and its topics will be removed from the subject.'],
    removeEvent: ['Remove class?', 'Existing attendance records will stay in your history.'],
    reset: [action.demo ? 'Load example data?' : 'Start with a blank workspace?', 'This replaces your current workspace and deletes any files you uploaded in this browser.'],
  };
  async function execute(single = false) {
    setBusy(true); setError('');
    try {
      if (type === 'removeFile') {
        if (item.hash) await deleteFile(item.id);
        apply({ ...state, files: state.files.filter((f) => f.id !== item.id) }, 'Material deleted.');
      } else if (type === 'removeTask') {
        apply({ ...state, tasks: state.tasks.filter((t) => t.id !== item.id) }, 'Assignment deleted.');
      } else if (type === 'removeUnit') {
        apply({ ...state, subjects: replace(state.subjects, { ...subject, units: subject.units.filter((u) => u.id !== item.id) }) }, 'Unit deleted.');
      } else if (type === 'removeEvent') {
        apply({ ...state, events: single ? replace(state.events, { ...item, skipped: [...(item.skipped ?? []), date] })
          : state.events.filter((e) => e.id !== item.id) }, 'Class removed.');
      } else if (type === 'reset') {
        await clearFiles();
        apply(freshState(action.demo, today), action.demo ? 'Example workspace loaded.' : 'Your workspace is ready.');
      }
    } catch (err) { setError(err.message || 'This change couldn’t be applied.'); }
    finally { setBusy(false); }
  }
  return <Dialog title={options[type][0]} subtitle={options[type][1]} close={close} busy={busy}>
    {error && <p className="form-error" role="alert"><CircleAlert size={16}/>{error}</p>}
    <div className="dialog-actions">
      <Button variant="secondary" onClick={close} disabled={busy}>Cancel</Button>
      {type === 'removeEvent' && !item.date && <Button variant="secondary" onClick={() => execute(true)} disabled={busy}>Just this class</Button>}
      <Button variant="danger" icon={Trash2} onClick={() => execute()} disabled={busy}>{type === 'reset' ? 'Replace workspace' : type === 'removeEvent' && !item.date ? 'Remove series' : 'Remove'}</Button>
    </div>
  </Dialog>;
}

function SearchDialog({ state, go, open, close }) {
  const [query, setQuery] = useState('');
  const results = [
    ...state.subjects.map((item) => ({ type: 'subject', item, label: 'Subject', icon: BookOpen })),
    ...state.tasks.map((item) => ({ type: 'task', item, label: item.type, icon: ClipboardList })),
    ...state.files.map((item) => ({ type: 'file', item, label: 'Material', icon: FileText })),
  ].filter(({ item }) => [item.title, item.code, item.name].some((v) => v?.toLowerCase().includes(query.trim().toLowerCase()))).slice(0, 10);
  return <Dialog title="Search Studex" close={close}>
    <label className="inline-search global-input"><Search size={18}/><input autoFocus aria-label="Search workspace" placeholder="Find subjects, assignments, or files…" value={query} onChange={(e) => setQuery(e.target.value)}/></label>
    <div className="search-results">{query.trim() && (results.length ? results.map(({ type, item, label, icon }) => <button className="history-item" key={type + item.id} onClick={() => type === 'subject' ? go('subject/' + item.id) : open({ type, item })}>
      <Tile icon={icon}/><span><strong>{item.title}</strong><small>{label}</small></span></button>) :
      <Empty icon={Search} title="No results" text="Try a different title or subject code."/>)}</div>
  </Dialog>;
}

export function WorkspaceDialog(props) {
  const { type, item } = props.action;
  if (type === 'import') return <ImportTimetable {...props}/>;
  if (type === 'class') return <ClassDialog {...props}/>;
  if (type === 'upload') return <UploadDialog {...props}/>;
  if (type === 'file') return <FileDialog {...props} item={item}/>;
  if (type === 'search') return <SearchDialog {...props}/>;
  if (type === 'reset' || type.startsWith('remove')) return <ConfirmDialog {...props}/>;
  return <FormDialog {...props}/>;
}
