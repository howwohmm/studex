import {
  ArrowDownToLine, ArrowUpRight, BookOpen, CalendarDays, ClipboardList, FileUp,
  GraduationCap, ListTodo, Plus, Sparkles, Target, TrendingUp,
} from 'lucide-react';
import { activeTask, niceDate, orderedTasks, overlaps, scheduleFor, shiftDate, subjectAttendance } from './model.js';
import { Badge, Button, Empty, EventRow, PanelHead, TaskRow, TextLink, Tile } from './ui.jsx';

function HeroArt() {
  return <svg viewBox="0 0 470 246" className="hero-art" aria-hidden="true">
    <defs>
      <linearGradient id="paper" x2=".8" y2="1"><stop stopColor="#fff"/><stop offset="1" stopColor="#d5ccff"/></linearGradient>
      <linearGradient id="cover" x2="1" y2="1"><stop stopColor="#c6b9ff"/><stop offset="1" stopColor="#7863fa"/></linearGradient>
      <linearGradient id="planet" x2="1" y2="1"><stop stopColor="#d4bfff"/><stop offset="1" stopColor="#8c74f7"/></linearGradient>
      <pattern id="dots" width="16" height="16" patternUnits="userSpaceOnUse"><circle cx="3" cy="3" r="1" fill="white" opacity=".19"/></pattern>
      <filter id="shadow"><feDropShadow dx="0" dy="16" stdDeviation="15" floodColor="#231359" floodOpacity=".32"/></filter>
    </defs>
    <path d="M238 0h232v246H238z" fill="url(#dots)" opacity=".55"/>
    <g fill="none" stroke="#ded5ff" opacity=".34">
      <circle cx="298" cy="119" r="110"/><circle cx="298" cy="119" r="94"/><circle cx="298" cy="119" r="132" strokeDasharray="2 6"/>
      <ellipse cx="296" cy="126" rx="153" ry="39" transform="rotate(-23 296 126)"/>
    </g>
    <circle cx="410" cy="58" r="18" fill="url(#planet)" opacity=".93"/><path d="M389 62q21 7 40-11" fill="none" stroke="#fdf6ff" opacity=".68"/>
    <circle cx="164" cy="179" r="6" fill="#c2afff"/><circle cx="395" cy="190" r="4" fill="#a895ff"/><circle cx="198" cy="40" r="3" fill="#e0d5ff"/>
    <path d="M170 65q1.5 11 12 12-10.5 1.5-12 13-1.5-11.5-12-13 10.5-1 12-12Zm231 64q1 8.5 9 10-8 1-9 9-1.5-8-9-9 7.5-1.5 9-10ZM328 20q1 6 7 7-6 1-7 7-1-6-7-7 6-1 7-7Z" fill="#efe8ff"/>
    <g transform="rotate(-13 294 123)" filter="url(#shadow)">
      <path d="M219 92q38-18 77 2 36-20 77-3v82q-40-16-77 2-41-18-77-2Z" fill="#362591" transform="translate(0 8)"/>
      <path d="M216 85q40-19 80 2 39-20 80-2v82q-43-16-80 3-42-20-80-3Z" fill="url(#cover)"/>
      <path d="M225 77q40-15 71 8v75q-33-20-71-8Zm71 8q32-24 71-8v75q-37-12-71 8Z" fill="url(#paper)"/>
      <path d="M237 93q22-6 44 5m-44 9q22-6 44 5m-44 9q23-5 38 3m35-26q22-11 45-5m-45 19q22-11 45-5m-45 19q17-8 32-6" stroke="#9681eb" strokeWidth="2" opacity=".72" strokeLinecap="round" fill="none"/>
      <path d="M296 85v75" stroke="#b29aef" fill="none" strokeWidth="1.5"/>
      <path d="M344 73v32l5-4 6 5V74Z" fill="#7356f1"/>
    </g>
  </svg>;
}

export default function Overview({ state, today, go, open, toggleTask }) {
  const subjectFor = (id) => state.subjects.find((item) => item.id === id);
  const events = scheduleFor(state, today);
  const classCount = events.filter((event) => event.kind !== 'Break' &&
    !state.records.some((record) => record.eventId === event.id && record.date === today && record.status === 'Cancelled')).length;
  const tasks = orderedTasks(state.tasks.filter(activeTask));
  const assignments = tasks.filter((task) => task.type !== 'Exam');
  const attended = state.subjects.filter((s) => !s.archived).map((subject) => ({ ...subject, ...subjectAttendance(state, subject) }));
  const atRisk = attended.filter((s) => s.status === 'At risk').length;
  const health = [...attended].sort((a, b) => (a.held ? a.percent - a.threshold : Infinity) - (b.held ? b.percent - b.threshold : Infinity));
  const totals = attended.reduce((sum, row) => ({ present: sum.present + row.present, held: sum.held + row.held }), { present: 0, held: 0 });
  const date = niceDate(today, { weekday: 'long', day: 'numeric', month: 'long' });
  const name = state.profile.name.trim().split(/\s+/)[0];
  const due = assignments.filter((item) => item.due >= today && item.due <= shiftDate(today, 7)).length;
  const nextExams = tasks.filter((item) => item.type === 'Exam' && item.due >= today);
  const setup = !state.demo && !state.events.length;
  const hasSubjects = attended.length > 0;

  return <div className="overview">
    <section className="hero">
      <HeroArt/>
      <div className="hero-copy">
        <div className="hero-date"><Sparkles size={14} />{state.demo ? 'Example workspace · Sample data' : date}</div>
        <h1>{state.demo ? 'Welcome to Studex.' : name ? `Hello, ${name}.` : 'Make today count.'}</h1>
        <p>{state.demo ? 'Explore a sample semester, or start a workspace with your own subjects and classes.' :
          classCount ? `You have ${classCount} ${classCount === 1 ? 'class' : 'classes'} today.` : 'No classes on your timetable today.'}</p>
        {state.demo ? <Button variant="hero-button" icon={Plus} onClick={() => open({ type: 'reset', demo: false })}>Set up my semester<ArrowUpRight size={15} /></Button>
          : <Button variant="hero-button" icon={CalendarDays} onClick={() => go('timetable')}>View timetable<ArrowUpRight size={15} /></Button>}
      </div>
    </section>
    {setup && <section className="panel setup-panel">
      <h2>Set up your semester</h2>
      <p>{hasSubjects ? 'Next, add your weekly timetable or import it from a file.' : 'Add your term dates, then create subjects or import a timetable to create them automatically.'}</p>
      <div className="actions">
        <Button icon={hasSubjects ? ArrowDownToLine : BookOpen} onClick={() => open({ type: hasSubjects ? 'import' : 'subject' })}>{hasSubjects ? 'Import timetable' : 'Add a subject'}</Button>
        <Button variant="secondary" onClick={() => open({ type: hasSubjects ? 'event' : 'import', date: today })}>{hasSubjects ? 'Add a class' : 'Import instead'}</Button>
        {!state.profile.edited && <Button variant="secondary" onClick={() => open({ type: 'profile' })}>Set up profile</Button>}
      </div>
    </section>}
    {(!setup || hasSubjects || state.tasks.length > 0 || state.records.length > 0) && <><div className="stats">
      <button className="stat" onClick={() => go('timetable')}><Tile icon={CalendarDays}/><span><small>Classes today</small><strong>{classCount}</strong></span><ArrowUpRight size={16} className="stat-arrow"/></button>
      <button className="stat" onClick={() => go('attendance')}><Tile icon={TrendingUp} color="mint"/><span><small>Overall attendance</small><strong>{totals.held ? (100 * totals.present / totals.held).toFixed(1) + '%' : '—'}</strong></span><ArrowUpRight size={16} className="stat-arrow"/></button>
      <button className="stat" onClick={() => go('assignments')}><Tile icon={ClipboardList} color="amber"/><span><small>Due within 7 days</small><strong>{due}</strong></span><ArrowUpRight size={16} className="stat-arrow"/></button>
    </div>
    <div className="overview-grid">
      <section className="panel">
        <PanelHead title="Today’s timetable" subtitle="Your classes at a glance"><TextLink onClick={() => go('timetable/week')}>Full week</TextLink></PanelHead>
        {events.length ? <div className="event-list">{events.map((item) => <EventRow key={item.id} item={item} subject={subjectFor(item.subjectId)}
          record={state.records.find((record) => record.eventId === item.id && record.date === today)}
          conflict={events.some((entry) => overlaps(item, entry))}
          onClick={() => open({ type: 'class', item, date: today })}/>)}</div>
          : <Empty icon={CalendarDays} title="Nothing scheduled today" text="Add a class or import your timetable to get started." action="Add a class" onAction={() => open({ type: 'event', date: today })}/>}
      </section>
      <section className="panel">
        <PanelHead title="Attendance health" subtitle="Where you stand by subject"><TextLink onClick={() => go('attendance')}>View all</TextLink></PanelHead>
        {attended.length ? <div className="health">
          {health.slice(0, 4).map((s) => <div className="health-row" key={s.id}><div><strong>{s.title}</strong><span className={s.status === 'At risk' ? 'overdue' : ''}>{s.held ? s.percent.toFixed(1) + '%' : '—'}</span></div>
            <div className="progress" role="meter" aria-label={s.title + ' attendance'} aria-valuemin={0} aria-valuemax={100} aria-valuenow={s.percent ?? 0} aria-valuetext={s.held ? s.percent.toFixed(1) + '% attendance' : 'No attendance records'}>
              <span className={s.status === 'At risk' ? 'accent-rose' : 'accent-violet'} style={{ width: (s.percent ?? 0) + '%' }}/></div></div>)}
          {atRisk > 0 && <p className="health-note"><span />{atRisk} {atRisk === 1 ? 'subject is' : 'subjects are'} below the attendance target</p>}
          {health.length > 4 && <p className="muted small">Showing 4 of {health.length} subjects.</p>}
        </div> : <Empty icon={Target} title="Track your attendance" text="Set a target for each subject and log classes as you go." action="Add a subject" onAction={() => open({ type: 'subject' })}/>}
      </section>
      <section className="panel">
        <PanelHead title="Upcoming work" subtitle="Stay ahead of your deadlines"><TextLink onClick={() => go('assignments')}>All assignments</TextLink></PanelHead>
        {assignments.length ? <div className="task-list">{assignments.slice(0, 3).map((task) => <TaskRow key={task.id} task={task} today={today} subject={subjectFor(task.subjectId)} onOpen={() => open({ type: 'task', item: task })} onToggle={() => toggleTask(task.id)}/>)}</div>
          : <Empty icon={ListTodo} title="You’re all caught up" action="Add an assignment" onAction={() => open({ type: 'task' })}/>}
      </section>
      <section className="panel">
        <PanelHead title="Quick actions" subtitle="Get something done in one step"/>
        <div className="quick-list">
          {[[hasSubjects ? 'Log attendance' : 'Add a subject', Target, 'violet', hasSubjects ? 'record' : 'subject'], ['New assignment', Plus, 'amber', 'task'], ['Upload material', FileUp, 'blue', 'upload'], ['Import timetable', ArrowDownToLine, 'mint', 'import']].map(([label, Icon, color, type]) =>
            <button key={type} onClick={() => open({ type, date: today })}><Tile icon={Icon} color={color}/><strong>{label}</strong><ArrowUpRight size={15}/></button>)}
        </div>
      </section>
    </div></>}
    {nextExams.length > 0 && <section className="panel exam-strip"><Tile icon={GraduationCap} color="blue"/><div><strong>{nextExams[0].title}</strong><p>Next exam · {niceDate(nextExams[0].due)}</p></div>
      <Button variant="secondary" icon={BookOpen} onClick={() => open({ type: 'task', item: nextExams[0] })}>Exam details</Button></section>}
    {state.demo && <p className="demo-foot"><Badge color="violet">Example data</Badge> Try the workspace here or start your own from Settings.</p>}
  </div>;
}
