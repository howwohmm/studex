import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  BookOpen, CalendarDays, ChartNoAxesCombined, ChevronDown, ChevronRight,
  ClipboardList, FolderClosed, House, Menu, Plus, Search, Settings2, X,
} from 'lucide-react';
import '@fontsource-variable/dm-sans';
import '@fontsource-variable/manrope';
import { dateKey, freshState } from './model.js';
import { loadWorkspace, saveWorkspace } from './storage.js';
import { WorkspaceDialog } from './dialogs.jsx';
import Overview from './overview.jsx';
import { Assignments, Attendance, Library, Settings, SubjectPage, Subjects, Timetable } from './pages.jsx';
import { Badge, Button, IconButton } from './ui.jsx';
import './styles.css';

const nav = [
  ['overview', 'Overview', House], ['timetable', 'Timetable', CalendarDays], ['attendance', 'Attendance', ChartNoAxesCombined],
  ['assignments', 'Assignments', ClipboardList], ['library', 'Library', FolderClosed],
];
const readRoute = () => window.location.hash.slice(1).replace(/^\//, '') || 'overview';

function NavLink({ path, label, icon: Icon, route, go }) {
  const active = route === path || (path === 'subjects' && route.startsWith('subject/'));
  return <a href={'#/' + path} className={'nav-link' + (active ? ' active' : '')} aria-current={active ? 'page' : undefined}
    onClick={(event) => { if (!event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) { event.preventDefault(); go(path); } }}>
    <Icon size={19}/><span>{label}</span>{active && <i/>}
  </a>;
}

function App() {
  const [state, setState] = useState(() => loadWorkspace() ?? freshState());
  const [today, setToday] = useState(() => dateKey());
  const [route, setRoute] = useState(readRoute);
  const [action, setAction] = useState(null);
  const [note, setNote] = useState(null);
  const [sidebar, setSidebar] = useState(false);
  const subject = route.startsWith('subject/') ? state.subjects.find((s) => s.id === route.split('/')[1]) : null;
  const page = nav.find(([id]) => id === route)?.[1] || (route === 'settings' ? 'Settings' : route !== 'overview' ? 'Subjects' : 'Overview');
  const initials = state.profile.name.trim().split(/\s+/).slice(0, 2).map((v) => v.charAt(0)).join('').toUpperCase() || 'S';

  useEffect(() => {
    const updateRoute = () => { setRoute(readRoute()); setAction(null); setSidebar(false); window.scrollTo(0, 0); };
    const keyboard = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault(); setAction((current) => current || { type: 'search' });
      }
      if (event.key === 'Escape') setSidebar(false);
    };
    const refreshDate = () => setToday(dateKey());
    const sync = (event) => {
      if (event.key === 'studex-workspace-v1') {
        const latest = loadWorkspace();
        if (latest) { setState(latest); setAction(null); }
      }
    };
    const interval = setInterval(refreshDate, 30_000);
    window.addEventListener('hashchange', updateRoute);
    window.addEventListener('keydown', keyboard);
    window.addEventListener('focus', refreshDate);
    window.addEventListener('storage', sync);
    return () => {
      clearInterval(interval); window.removeEventListener('hashchange', updateRoute);
      window.removeEventListener('keydown', keyboard); window.removeEventListener('focus', refreshDate);
      window.removeEventListener('storage', sync);
    };
  }, []);
  useEffect(() => {
    if (!note) return;
    const timer = setTimeout(() => setNote(null), note.error ? 8000 : 3500);
    return () => clearTimeout(timer);
  }, [note]);

  function go(next) {
    setAction(null); setSidebar(false);
    if (readRoute() !== next) window.location.hash = '/' + next;
    else window.scrollTo(0, 0);
  }
  function apply(next, message) {
    try {
      saveWorkspace(next);
      setState(next); setAction(null); setNote({ message });
      return true;
    } catch {
      setNote({ message: 'Could not save to this browser. Check available storage and try again.', error: true });
      return false;
    }
  }
  function toggleTask(id) {
    const tasks = state.tasks.map((task) => task.id === id ? { ...task, status: task.status === 'Completed' ? (task.beforeComplete || 'Not started') : 'Completed',
      beforeComplete: task.status === 'Completed' ? undefined : task.status } : task);
    apply({ ...state, tasks }, tasks.find((t) => t.id === id)?.status === 'Completed' ? 'Assignment completed.' : 'Assignment reopened.');
  }

  const props = { state, today, go, open: setAction, toggleTask };
  return <div className="app-shell">
    <a className="skip-link" href="#main-content" onClick={(event) => { event.preventDefault(); document.getElementById('main-content').focus(); }}>Skip to content</a>
    {sidebar && <button className="sidebar-scrim" aria-label="Close menu" onClick={() => setSidebar(false)} />}
    <aside className={'sidebar' + (sidebar ? ' is-open' : '')} aria-label="Workspace sidebar">
      <div className="brand-row">
        <a href="#/overview" className="brand" onClick={(event) => { event.preventDefault(); go('overview'); }}><img src="/studex.svg" alt="" width="37" height="37"/>Studex<span>.</span></a>
        <div className="sidebar-close"><IconButton icon={X} label="Close navigation" onClick={() => setSidebar(false)}/></div>
      </div>
      <button className="workspace-switch" onClick={() => go('settings')}>
        <span className="workspace-glyph"><BookOpen size={17}/></span><span><strong>Student workspace</strong><small>{state.profile.semester || 'Personal workspace'}</small></span><ChevronDown size={14}/>
      </button>
      <nav aria-label="Main navigation" className="desktop-nav">
        <div className="nav-group"><p>Workspace</p>{nav.map(([path, label, icon]) => <NavLink key={path} {...{ path, label, icon, route, go }}/>)}</div>
        <div className="nav-group"><p>Academics</p><NavLink path="subjects" label="Subjects" icon={BookOpen} route={route} go={go}/></div>
      </nav>
      <div className="side-bottom"><NavLink path="settings" label="Settings" icon={Settings2} route={route} go={go}/></div>
      <button className="profile-button" onClick={() => go('settings')}><span className="avatar">{initials}</span>
        <span><strong>{state.profile.name || 'Your profile'}</strong><small>{state.demo ? 'Example workspace' : 'Saved in this browser'}</small></span><ChevronRight size={15}/></button>
    </aside>
    <div className="workspace-main">
      <header className="topbar">
        <div className="crumbs">
          <div className="mobile-menu"><IconButton icon={Menu} label="Open navigation" aria-expanded={sidebar} onClick={() => setSidebar(!sidebar)}/></div>
          <span className="crumb-start">Workspace</span><ChevronRight className="crumb-sep" size={14}/><strong>{subject?.title || page}</strong>
        </div>
        <div className="top-actions">
          {state.demo && <span className="top-demo"><Badge color="violet">Demo workspace</Badge></span>}
          <button type="button" className="search-button" onClick={() => setAction({ type: 'search' })} aria-label="Search Studex"><Search size={17}/><span>Search anything…</span><kbd>Ctrl K</kbd></button>
          <Button className="button primary top-new" icon={Plus} onClick={() => setAction({ type: 'task' })}>New assignment</Button>
        </div>
      </header>
      <main id="main-content" tabIndex={-1} className="page-content">
        {route === 'overview' && <Overview {...props}/>}
        {route === 'timetable' && <Timetable {...props}/>}
        {route === 'attendance' && <Attendance {...props}/>}
        {route === 'assignments' && <Assignments {...props}/>}
        {route === 'library' && <Library {...props}/>}
        {route === 'settings' && <Settings {...props}/>}
        {route.startsWith('subject/') && <SubjectPage key={route} {...props} subject={subject}/>}
        {!['overview', 'timetable', 'attendance', 'assignments', 'library', 'settings'].includes(route) && !route.startsWith('subject/') && <Subjects {...props}/>}
      </main>
    </div>
    <nav className="bottom-nav" aria-label="Quick navigation">
      {nav.map(([path, label, Icon]) => <NavLink key={path} path={path} label={label === 'Assignments' ? 'Tasks' : label} icon={Icon} route={route} go={go}/>)}
    </nav>
    {action && <WorkspaceDialog key={action.type + (action.item?.id || '')} action={action} state={state} today={today} go={go} open={setAction} apply={apply} close={() => setAction(null)}/>}
    {note && <div role={note.error ? 'alert' : 'status'} className={'toast' + (note.error ? ' error' : '')}>{note.message}</div>}
  </div>;
}

createRoot(document.getElementById('root')).render(<StrictMode><App/></StrictMode>);
