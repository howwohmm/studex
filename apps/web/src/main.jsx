import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  BookOpen, CalendarDays, ChartNoAxesCombined, ChevronDown, ChevronRight,
  ClipboardList, FolderClosed, House, Menu, Plus, Search, Settings2, X,
} from 'lucide-react';
import '@fontsource-variable/dm-sans';
import '@fontsource-variable/manrope';
import { dateKey, freshState } from './model.js';
import { getFile, loadWorkspace, reconcileFileKeys, saveWorkspace } from './storage.js';
import { pdfMaterialText } from './files.js';
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
const pageFor = (route) => route === 'timetable/week' ? 'timetable' : route.startsWith('subject/') ? 'subjects'
  : route.startsWith('attendance/') ? 'attendance' : route;
const mobileNav = [...nav, ['subjects', 'Subjects', BookOpen]];
const scrollToTop = () => {
  window.scrollTo(0, 0);
  document.querySelector('.workspace-main')?.scrollTo(0, 0);
};

function NavLink({ path, label, shortLabel, icon: Icon, route, go }) {
  const active = pageFor(route) === path;
  return <a href={'#/' + path} className={'nav-link' + (active ? ' active' : '')} aria-label={shortLabel ? label : undefined} aria-current={active ? 'page' : undefined}
    onClick={(event) => { if (!event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) { event.preventDefault(); go(path); } }}>
    <Icon size={19}/><span>{shortLabel || label}</span>{active && <i/>}
  </a>;
}

function App() {
  const [state, setState] = useState(() => loadWorkspace() ?? freshState());
  const [today, setToday] = useState(() => dateKey());
  const [route, setRoute] = useState(readRoute);
  const [action, setAction] = useState(null);
  const [note, setNote] = useState(null);
  const [sidebar, setSidebar] = useState(false);
  const [originals, setOriginals] = useState(null);
  const subject = route.startsWith('subject/') ? state.subjects.find((s) => s.id === route.split('/')[1]) : null;
  const currentPage = pageFor(route);
  const page = nav.find(([id]) => id === currentPage)?.[1] ??
    (currentPage === 'settings' ? 'Settings' : currentPage === 'subjects' ? 'Subjects' : 'Page not found');
  const initials = state.profile.name.trim().split(/\s+/).slice(0, 2).map((v) => v.charAt(0)).join('').toUpperCase() || 'S';
  const missingOriginals = new Set(originals?.files === state.files
    ? state.files.filter((file) => file.hash && !originals.keys.has(file.id)).map((file) => file.id) : []);

  useEffect(() => {
    const updateRoute = () => { setRoute(readRoute()); setAction(null); setSidebar(false); scrollToTop(); };
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
        if (latest) { setState(latest); setNote({ message: 'Workspace updated in another tab.' }); }
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
    const timer = setTimeout(() => setNote(null), note.undo || note.error ? 8000 : 2800);
    return () => clearTimeout(timer);
  }, [note]);
  useEffect(() => {
    let active = true;
    const refresh = () => { void reconcileFileKeys().then((keys) => {
      if (active) setOriginals({ files: state.files, keys: new Set(keys) });
    }, () => { if (active) setOriginals(null); }); };
    refresh();
    window.addEventListener('focus', refresh);
    return () => { active = false; window.removeEventListener('focus', refresh); };
  }, [state.files]);
  useEffect(() => {
    const pending = state.files.filter((file) => file.textState === 'pending');
    if (!pending.length) return;
    let active = true;
    let running = false;
    async function retry() {
      if (!navigator.onLine || running) return;
      running = true;
      try {
        for (const item of pending) {
          const file = await getFile(item.id);
          if (!file) continue;
          const extracted = await pdfMaterialText(file).catch(() => ({ textState: 'unavailable' }));
          if (!active || extracted.textState === 'pending') return;
          const current = loadWorkspace();
          if (!current?.files.some((entry) => entry.id === item.id && entry.textState === 'pending')) continue;
          const updated = { ...current, files: current.files.map((entry) => entry.id === item.id ? { ...entry, ...extracted } : entry) };
          saveWorkspace(updated);
          setState(updated);
        }
      } catch { /* Preserve pending work if browser storage is unavailable. */ }
      finally { running = false; }
    }
    void retry();
    window.addEventListener('online', retry);
    return () => { active = false; window.removeEventListener('online', retry); };
  }, [state.files]);

  function go(next) {
    setAction(null); setSidebar(false);
    if (readRoute() !== next) window.location.hash = '/' + next;
    else scrollToTop();
  }
  function apply(next, message, undo, undoMessage = 'Attendance restored.') {
    const updated = typeof next === 'function' ? next(loadWorkspace() ?? state) : next;
    try {
      saveWorkspace(updated);
      setState(updated); setAction(null); setNote({ message, undo, undoMessage });
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

  const props = { state, today, go, open: setAction, toggleTask, missingOriginals };
  const notice = note && <div className={'toast' + (note.error ? ' error' : '')}>
    <span role={note.error ? 'alert' : 'status'}>{note.message}</span>
    {note.undo && <button type="button" onClick={() => apply(note.undo, note.undoMessage)}>Undo</button>}
    <button className="toast-dismiss" type="button" aria-label="Dismiss notification" onClick={() => setNote(null)}><X size={16}/></button>
  </div>;
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
        {currentPage === 'timetable' && <Timetable key={route} {...props} initialView={route === 'timetable/week' ? 'Week' : 'Day'}/>}
        {currentPage === 'attendance' && <Attendance key={route} {...props} initialSubject={route.split('/')[1]}/>}
        {route === 'assignments' && <Assignments {...props}/>}
        {route === 'library' && <Library {...props}/>}
        {route === 'settings' && <Settings {...props}/>}
        {route.startsWith('subject/') && <SubjectPage key={route} {...props} subject={subject}/>}
        {route === 'subjects' && <Subjects {...props}/>}
        {!['overview', 'timetable', 'attendance', 'assignments', 'library', 'subjects', 'settings'].includes(currentPage) &&
          <section className="panel setup-panel"><h1>Page not found</h1><p>This page isn’t part of your workspace.</p><Button onClick={() => go('overview')}>Back to overview</Button></section>}
      </main>
    </div>
    <div className="mobile-dock">
      {notice}
      <nav className="bottom-nav" aria-label="Quick navigation">
        {mobileNav.map(([path, label, Icon]) => <NavLink key={path} path={path} label={path === 'assignments' ? 'Tasks' : label}
          shortLabel={path === 'attendance' ? 'Attend' : undefined} icon={Icon} route={route} go={go}/>)}
        <button className="mobile-add" aria-label="Quick actions" onClick={() => setAction({ type: 'quick' })}><Plus size={20}/><span>Add</span></button>
      </nav>
    </div>
    {action && <WorkspaceDialog key={action.type + (action.item?.id || '')} action={action} state={state} today={today} go={go} open={setAction} apply={apply} missingOriginals={missingOriginals} close={() => setAction(null)}/>}
  </div>;
}

createRoot(document.getElementById('root')).render(<StrictMode><App/></StrictMode>);

if (import.meta.env.PROD && import.meta.env.VITE_STUDEX_OFFLINE !== 'false' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(import.meta.env.BASE_URL + 'offline-worker.js').catch(() => {});
  }, { once: true });
}
