import { useState } from 'react';
import {
  Archive, ArrowDownToLine, BookOpen, CalendarDays, ChartNoAxesCombined, ChevronLeft, ChevronRight,
  ClipboardList, FileText, Filter, FolderOpen, History, LayoutList, ListChecks, Plus, Search, Settings2, Upload,
} from 'lucide-react';
import { activeTask, niceDate, occurrenceLabel, orderedTasks, overlaps, scheduleFor, shiftDate, subjectAttendance, weekStart } from './model.js';
import { attendanceColor, Badge, Button, DayLabel, Empty, EventRow, IconButton, PageTitle, PanelHead, TaskRow, TextLink, Tile } from './ui.jsx';

const riskColor = (status) => ({ 'At risk': 'rose', 'Close to limit': 'amber', 'On track': 'mint' }[status] || 'neutral');
const matches = (needle, ...values) => values.some((v) => String(v ?? '').toLowerCase().includes(needle.trim().toLowerCase()));

export function Timetable({ state, today, open, initialView = 'Day' }) {
  const [selected, select] = useState(today);
  const [view, setView] = useState(initialView);
  const week = Array.from({ length: 7 }, (_, i) => shiftDate(weekStart(selected), i));
  const dates = view === 'Day' ? [selected] : week;
  return <>
    <PageTitle label="Workspace" title="Timetable" text="Plan your week and keep class details in one place.">
      <Button icon={ArrowDownToLine} variant="secondary" onClick={() => open({ type: 'import' })}>Import</Button>
      <Button icon={Plus} onClick={() => open({ type: 'event', date: selected })}>Add class</Button>
    </PageTitle>
    <section className="panel calendar">
      <div className="calendar-head">
        <div className="actions"><IconButton icon={ChevronLeft} label="Previous week" onClick={() => select(shiftDate(selected, -7))}/>
          <IconButton icon={ChevronRight} label="Next week" onClick={() => select(shiftDate(selected, 7))}/>
          <h2>{niceDate(week[0], { month: 'long', year: 'numeric' })}</h2></div>
        <div className="actions"><Button variant="secondary" onClick={() => select(today)}>Today</Button>
          <div className="segmented" role="group" aria-label="Calendar view">{['Day', 'Week'].map((v) => <button key={v} aria-pressed={v === view} onClick={() => setView(v)}>{v}</button>)}</div></div>
      </div>
      <div className="week-days">
        {week.map((date) => <button className={date === selected ? 'selected' : ''} key={date} onClick={() => { select(date); setView('Day'); }}
          aria-label={niceDate(date, { weekday: 'long', day: 'numeric', month: 'long' })} aria-pressed={date === selected}>
          <span>{niceDate(date, { weekday: 'short' })}</span><strong>{Number(date.slice(-2))}</strong>{date === today && <i/>}
        </button>)}
      </div>
      <div className="calendar-body">{dates.map((date) => {
        const classes = scheduleFor(state, date);
        return <section className="calendar-day" key={date}><DayLabel date={date}/>
          {classes.length ? <div className="event-list">{classes.map((item) =>
            <EventRow key={item.id} item={item} subject={state.subjects.find((s) => s.id === item.subjectId)}
              record={state.records.find((r) => r.eventId === item.id && r.date === date)}
              conflict={classes.some((entry) => overlaps(item, entry))}
              onClick={() => open({ type: 'class', item, date })}/>)}</div>
            : view === 'Week' ? <p className="muted small">No classes scheduled.</p> :
              <Empty icon={CalendarDays} title="No classes scheduled" text="One-off events and weekly classes both show up here." action="Add a class" onAction={() => open({ type: 'event', date })}/>}
        </section>;
      })}</div>
    </section>
  </>;
}

export function Attendance({ state, today, open, initialSubject = '' }) {
  const subjects = state.subjects.filter((subject) => !subject.archived);
  const [filter, setFilter] = useState(initialSubject);
  const history = [...state.records].filter((r) => !filter || filter === r.subjectId)
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  return <>
    <PageTitle label="Workspace" title="Attendance" text="Know where you stand, how many classes you can miss, and how to recover.">
      <Button icon={Plus} onClick={() => open({ type: 'record', date: today })}>Log attendance</Button>
    </PageTitle>
    {subjects.length ? <div className="cards-grid">
      {subjects.map((subject) => {
        const info = subjectAttendance(state, subject);
        return <section className="panel attendance-card" key={subject.id}>
          <div className="attendance-head"><Tile icon={ChartNoAxesCombined} color={subject.color}/><div><h2>{subject.title}</h2><p>{subject.code || 'Subject'} · {subject.threshold}% target</p></div>
            <IconButton icon={Settings2} label={'Edit ' + subject.title + ' attendance target'} onClick={() => open({ type: 'subject', item: subject })}/></div>
          <div className="attendance-value"><strong>{info.held ? info.percent.toFixed(1) + '%' : '—'}</strong><Badge color={riskColor(info.status)}>{info.status}</Badge></div>
          <div className="progress" aria-hidden="true"><span className={'accent-' + (info.status === 'At risk' ? 'rose' : subject.color)} style={{ width: (info.percent ?? 0) + '%' }}/></div>
          <p className="attendance-count">{info.present} attended · {info.held - info.present} missed · {info.held} held</p>
          <div className="forecast"><p>{!info.held ? 'Log a class to see your forecast.' : info.status === 'At risk'
            ? info.recover === null ? 'A perfect target cannot be recovered after an absence.' : `If enough classes remain, attend ${info.recover} in a row to reach your target.`
            : info.miss ? `You can miss ${info.miss} ${info.miss === 1 ? 'class' : 'classes'} in a row and stay eligible.` : 'Attend your next class to stay eligible.'}</p>
            {info.held > 0 && <small>A calculation based on recorded classes only; it doesn’t account for your timetable or term end.</small>}</div>
        </section>;
      })}
    </div> : <section className="panel"><Empty icon={ChartNoAxesCombined} title="No active subjects" text="Add a subject before you log attendance." action="Add a subject" onAction={() => open({ type: 'subject' })}/></section>}
    <section className="panel history attendance-history">
      <PanelHead title="Attendance history" subtitle="Review or correct individual records">
        <select aria-label="Filter attendance history by subject" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="">All subjects</option>{state.subjects.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
        </select>
      </PanelHead>
      {history.length ? <div className="history-list">{history.map((item) => {
        const occurrence = occurrenceLabel(item.occurrence || state.events.find((entry) => entry.id === item.eventId));
        const possibleDuplicate = !item.eventId && !item.extra && state.records.some((row) => row.eventId && row.subjectId === item.subjectId && row.date === item.date);
        return <button className="history-item attendance-entry" key={item.id} onClick={() => open({ type: 'record', item })}>
          <Tile icon={History}/><span><strong>{state.subjects.find((s) => s.id === item.subjectId)?.title}</strong>
            <small>{niceDate(item.date)} · {occurrence || (item.eventId ? 'Scheduled class' : 'Extra class')}{item.history?.length ? ' · Corrected' : ''}</small>
            {possibleDuplicate && <small className="missing-original">Check for a duplicate mark</small>}</span>
          <Badge color={attendanceColor(item.status)}>{item.status}</Badge><ChevronRight size={16}/></button>;
      })}</div>
        : <Empty icon={History} title="No individual records yet" text="Classes you mark present or absent appear here. Baseline counts are kept on the subject."/>}
    </section>
  </>;
}

export function Assignments({ state, today, open, toggleTask }) {
  const [filter, setFilter] = useState('Open');
  const [query, setQuery] = useState('');
  const [subjectId, setSubject] = useState('');
  const subjectFor = (id) => state.subjects.find((s) => s.id === id);
  const tasks = orderedTasks(state.tasks.filter((t) =>
    (filter === 'All' || (filter === 'Open' && activeTask(t) && t.type !== 'Exam') ||
      (filter === 'Finished' && !activeTask(t)) || (filter === 'Exams' && t.type === 'Exam')) &&
    (!subjectId || t.subjectId === subjectId) && matches(query, t.title, t.description, subjectFor(t.subjectId)?.title)));
  return <>
    <PageTitle label="Workspace" title="Assignments" text="Keep deadlines, revision, and exams in view.">
      <Button icon={Plus} onClick={() => open({ type: 'task', kind: filter === 'Exams' ? 'Exam' : 'Assignment' })}>{filter === 'Exams' ? 'New exam' : 'New assignment'}</Button>
    </PageTitle>
    <section className="panel">
      <div className="filter-bar">
        <div className="segmented" role="group" aria-label="Assignment filter">{['Open', 'Finished', 'Exams', 'All'].map((v) => <button key={v} aria-pressed={v === filter} onClick={() => setFilter(v)}>{v}</button>)}</div>
        <div className="actions"><label className="inline-search"><Search size={16}/><input placeholder="Search assignments" aria-label="Search assignments" value={query} onChange={(e) => setQuery(e.target.value)}/></label>
          <select aria-label="Filter assignments by subject" value={subjectId} onChange={(e) => setSubject(e.target.value)}>
            <option value="">All subjects</option>{state.subjects.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
          </select></div>
      </div>
      {tasks.length ? <div className="task-list large-list">{tasks.map((task) => <TaskRow key={task.id} task={task} today={today} subject={subjectFor(task.subjectId)}
        onOpen={() => open({ type: 'task', item: task })} onToggle={() => toggleTask(task.id)}/>)}</div>
        : <Empty icon={ListChecks} title="No matching work" text="Add a deadline or change the current filters."/>}
    </section>
  </>;
}

export function Library({ state, open, missingOriginals }) {
  const [query, setQuery] = useState('');
  const [subject, setSubject] = useState('');
  const files = state.files.filter((file) => (!subject || subject === file.subjectId) && matches(query, file.title, file.name, file.text))
    .sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title));
  return <>
    <PageTitle label="Workspace" title="Library" text="Organise course materials by subject and find them when you need them.">
      <Button icon={Upload} onClick={() => open({ type: 'upload', subjectId: subject })}>Upload material</Button>
    </PageTitle>
    <section className="panel">
      <div className="filter-bar">
        <label className="inline-search"><Search size={17}/><input placeholder="Search the library" aria-label="Search the library" value={query} onChange={(e) => setQuery(e.target.value)}/></label>
        <div className="actions"><Filter size={17}/><select aria-label="Filter materials by subject" value={subject} onChange={(e) => setSubject(e.target.value)}>
          <option value="">All subjects</option>{state.subjects.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
        </select></div>
      </div>
      {files.length ? <div className="history-list">{files.map((file) => <button className="history-item library-item" key={file.id} onClick={() => open({ type: 'file', item: file })}>
        <Tile icon={FileText} color={state.subjects.find((s) => s.id === file.subjectId)?.color ?? 'blue'}/><span><strong>{file.title}</strong><small>{file.name} · {niceDate(file.date)}</small>
          {missingOriginals.has(file.id) && <small className="missing-original">Original missing</small>}</span>
        <Badge>{state.subjects.find((s) => s.id === file.subjectId)?.title || 'Unfiled'}</Badge><ChevronRight size={16}/></button>)}</div>
        : <Empty icon={FolderOpen} title="No materials found" text="Upload notes, slides, or PDFs, or try a different search." action="Upload material" onAction={() => open({ type: 'upload', subjectId: subject })}/>}
    </section>
  </>;
}

export function Subjects({ state, go, open }) {
  const [archived, setArchived] = useState(false);
  const subjects = state.subjects.filter((s) => Boolean(s.archived) === archived);
  return <>
    <PageTitle label={state.profile.semester || 'Academic workspace'} title="Subjects" text="Everything for a course, organised in one place.">
      <Button icon={Archive} variant="secondary" aria-pressed={archived} onClick={() => setArchived(!archived)}>{archived ? 'Show active' : 'Show archived'}</Button>
      <Button icon={Plus} onClick={() => open({ type: 'subject' })}>Add subject</Button>
    </PageTitle>
    {subjects.length ? <div className="cards-grid">{subjects.map((subject) => <button className="panel subject-card" key={subject.id} onClick={() => go('subject/' + subject.id)}>
      <Tile icon={BookOpen} color={subject.color}/><div><strong>{subject.title}</strong><small>{subject.code || 'Personal subject'}</small></div><ChevronRight size={17}/>
    </button>)}</div> : <section className="panel"><Empty icon={BookOpen} title={archived ? 'No archived subjects' : 'No subjects yet'} text="A subject connects your timetable, attendance, notes, and work."
      action={!archived ? 'Add a subject' : undefined} onAction={() => open({ type: 'subject' })}/></section>}
  </>;
}

export function SubjectPage({ state, subject, today, go, open, toggleTask }) {
  if (!subject) return <section className="panel"><Empty title="Subject not found" action="Back to subjects" onAction={() => go('subjects')}/></section>;
  const files = state.files.filter((f) => f.subjectId === subject.id);
  const tasks = orderedTasks(state.tasks.filter((t) => t.subjectId === subject.id));
  const units = subject.units ?? [];
  const attendance = subjectAttendance(state, subject);
  return <>
    <TextLink onClick={() => go('subjects')}>All subjects</TextLink>
    <PageTitle label={subject.archived ? 'Archived subject' : subject.code || 'Subject'} title={subject.title} text={subject.description || 'Your coursework, materials and progress for this subject.'}>
      <Button icon={Settings2} variant="secondary" onClick={() => open({ type: 'subject', item: subject })}>Edit subject</Button>
      <Button icon={Plus} onClick={() => open({ type: 'task', subjectId: subject.id })}>Add assignment</Button>
    </PageTitle>
    <section className="panel subject-attendance"><PanelHead title="Attendance" subtitle={attendance.held
      ? attendance.percent.toFixed(1) + '% · ' + attendance.present + ' of ' + attendance.held + ' attended' : 'No held classes recorded'}>
      <TextLink onClick={() => go('attendance/' + subject.id)}>View attendance</TextLink>
    </PanelHead></section>
    <div className="overview-grid">
      <section className="panel"><PanelHead title="Coursework"><Tile icon={ClipboardList} color={subject.color}/></PanelHead>
        {tasks.length ? <div className="task-list">{tasks.map((task) => <TaskRow task={task} today={today} subject={subject} key={task.id}
          onOpen={() => open({ type: 'task', item: task })} onToggle={() => toggleTask(task.id)}/>)}</div> : <Empty icon={ClipboardList} title="No coursework yet"/>}</section>
      <section className="panel"><PanelHead title="Materials"><TextLink onClick={() => open({ type: 'upload', subjectId: subject.id })}>Upload</TextLink></PanelHead>
        {files.length ? <div className="history-list">{files.map((file) => <button className="history-item" key={file.id} onClick={() => open({ type: 'file', item: file })}>
          <Tile icon={FileText} color={subject.color}/><span><strong>{file.title}</strong><small>{file.name}</small></span><ChevronRight size={16}/></button>)}</div> : <Empty icon={FolderOpen} title="No materials yet"/>}</section>
      <section className="panel"><PanelHead title="Units & topics"><TextLink onClick={() => open({ type: 'unit', subject })}>Add unit</TextLink></PanelHead>
        {units.length ? <div className="history-list">{units.map((unit) => <button className="history-item" key={unit.id} onClick={() => open({ type: 'unit', subject, item: unit })}>
          <Tile icon={BookOpen} color={subject.color}/><span><strong>{unit.title}</strong><small>{unit.topics?.join(' · ') || 'No topics yet'}</small></span><ChevronRight size={16}/></button>)}</div> : <Empty icon={BookOpen} title="No units yet" text="Break this subject into the topics you need to cover."/>}</section>
      <section className="panel"><PanelHead title="Academic notes"><TextLink onClick={() => open({ type: 'notes', subject })}>Edit notes</TextLink></PanelHead>
        {subject.notes ? <p className="subject-notes">{subject.notes}</p> : <Empty icon={LayoutList} title="No notes yet"/>}</section>
    </div>
  </>;
}

export function Settings({ state, open }) {
  const profile = state.profile;
  return <>
    <PageTitle label="Your account" title="Settings" text="Personalise your academic workspace."/>
    <div className="settings-grid">
      <section className="panel"><PanelHead title="Academic profile" subtitle="Used to personalise your workspace">
        <Button variant="secondary" icon={Settings2} onClick={() => open({ type: 'profile' })}>Edit profile</Button></PanelHead>
        <dl className="details-list">{[['Name', profile.name], ['Institution', profile.university], ['Program', profile.program], ['Semester', profile.semester],
          ['Term start', profile.termStart && niceDate(profile.termStart, { day: 'numeric', month: 'short', year: 'numeric' })],
          ['Term end', profile.termEnd && niceDate(profile.termEnd, { day: 'numeric', month: 'short', year: 'numeric' })],
          ['Time zone', 'Asia/Kolkata']].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || 'Not set'}</dd></div>)}</dl>
      </section>
      <section className="panel local-settings"><PanelHead title={state.demo ? 'Example workspace' : 'Local workspace'} subtitle="Your changes and files are stored in this browser."/>
        <p>{state.demo ? 'The current workspace includes sample classes, subjects and deadlines. Start fresh when you’re ready to add your own.' : 'There is no sign-in or device sync in this preview. Clearing your browser’s site data removes your workspace.'}</p>
        <div className="actions">
          <Button variant="secondary" onClick={() => open({ type: 'reset', demo: false })}>{state.demo ? 'Start my own workspace' : 'Clear workspace'}</Button>
          <Button variant="secondary" onClick={() => open({ type: 'reset', demo: true })}>{state.demo ? 'Reset example data' : 'Load example data'}</Button>
        </div>
      </section>
    </div>
  </>;
}
