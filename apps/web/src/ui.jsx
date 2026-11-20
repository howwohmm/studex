import { cloneElement, useId, useLayoutEffect, useRef } from 'react';
import { ArrowRight, BookOpen, CalendarDays, ChevronRight, Clock3, MapPin, X } from 'lucide-react';
import { niceDate, shiftDate, timeLabel } from './model.js';

export function Button({ children, icon: Icon, variant = 'primary', type = 'button', ...props }) {
  return <button type={type} className={'button ' + variant} {...props}>{Icon && <Icon size={17} aria-hidden="true" />}{children}</button>;
}
export function IconButton({ icon: Icon, label, ...props }) {
  return <button type="button" className="icon-button" title={label} aria-label={label} {...props}><Icon size={18} aria-hidden="true" /></button>;
}
export function Badge({ children, color = 'neutral' }) {
  return <span className={'badge tint-' + color}>{children}</span>;
}
export const attendanceColor = (status) => status === 'Present' ? 'mint' : status === 'Absent' ? 'rose' : 'neutral';
export function Tile({ icon: Icon, color = 'violet' }) {
  return <span className={'tile tint-' + color}><Icon size={19} aria-hidden="true" /></span>;
}
export function TextLink({ children, onClick, direction = 'right' }) {
  const Icon = direction === 'forward' ? ArrowRight : ChevronRight;
  return <button className="text-link" type="button" onClick={onClick}>{children}<Icon size={15} aria-hidden="true" /></button>;
}
export function Empty({ icon: Icon = BookOpen, title, text, action, onAction }) {
  return <div className="empty"><Tile icon={Icon}/><strong>{title}</strong>{text && <p>{text}</p>}{action && <Button variant="secondary" onClick={onAction}>{action}</Button>}</div>;
}
export function PageTitle({ label, title, text, children }) {
  return <div className="page-title"><div><p className="eyebrow">{label}</p><h1>{title}</h1><p>{text}</p></div>{children && <div className="actions">{children}</div>}</div>;
}
export function PanelHead({ title, subtitle, children }) {
  return <div className="panel-head"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>{children}</div>;
}
export function Dialog({ title, subtitle, close, busy, children }) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const dialog = ref.current;
    const opener = document.activeElement;
    dialog.showModal();
    const firstField = dialog.querySelector('[data-initial-focus], .field input:not([type=file]):enabled, .field textarea:enabled, .field select:enabled');
    firstField?.focus({ preventScroll: true });
    return () => {
      dialog.close();
      if (opener instanceof HTMLElement && opener !== document.body && opener.isConnected) opener.focus({ preventScroll: true });
    };
  }, []);
  return <dialog ref={ref} className="dialog" aria-labelledby="dialog-title"
    onCancel={(event) => { event.preventDefault(); if (!busy) close(); }}
    onClick={(event) => { if (event.target === ref.current && !busy) close(); }}>
    <div className="dialog-inner">
      <div className="dialog-title"><div><h2 id="dialog-title">{title}</h2>{subtitle && <p>{subtitle}</p>}</div><IconButton icon={X} label="Close dialog" onClick={close} disabled={busy} /></div>
      {children}
    </div>
  </dialog>;
}
export function Field({ label, children, hint, wide }) {
  const id = useId();
  return <div className={'field' + (wide ? ' wide' : '')}><label htmlFor={id}>{label}</label>
    {cloneElement(children, { id, 'aria-describedby': hint ? id + '-hint' : undefined })}
    {hint && <small id={id + '-hint'}>{hint}</small>}
  </div>;
}
export function SubjectOptions({ subjects, optional }) {
  return <><option value="">{optional ? 'No subject' : 'Select a subject'}</option>
    {subjects.map((s) => <option key={s.id} value={s.id}>{s.title}{s.archived ? ' (archived)' : ''}</option>)}</>;
}
export function EventRow({ item, subject, record, conflict, onClick }) {
  return <button type="button" className="event-row" onClick={onClick}>
    <span className="event-time"><strong>{timeLabel(item.start)}</strong><small>{timeLabel(item.end)}</small></span>
    <span className={'event-line accent-' + (subject?.color ?? 'violet')} />
    <span className="event-detail"><strong>{item.title || subject?.title || item.kind}</strong><small><MapPin size={12} />{item.room || 'Room not set'} <span>·</span> {item.kind}</small>
      {conflict && <small className="overdue">Overlapping slots</small>}</span>
    <Badge color={record ? attendanceColor(record.status) : subject?.color ?? 'neutral'}>{record?.status ?? item.kind}</Badge>
  </button>;
}
export function dueLabel(due, today) {
  if (!due) return 'No due date';
  if (due === today) return 'Due today';
  if (due === shiftDate(today, 1)) return 'Due tomorrow';
  return 'Due ' + niceDate(due);
}
export function TaskRow({ task, subject, today, onOpen, onToggle }) {
  const done = task.status === 'Completed';
  const cancelled = task.status === 'Cancelled';
  return <div className={'task-row' + (done ? ' is-done' : '')}>
    <label className="task-check"><input type="checkbox" aria-label={(done ? 'Reopen ' : 'Complete ') + task.title} checked={done} disabled={cancelled} onChange={onToggle}/></label>
    <button className="task-title" onClick={onOpen}><strong>{task.title}</strong><small>{subject?.title ?? task.type} <span>·</span> <span className={!done && !cancelled && task.due && task.due < today ? 'overdue' : ''}>{dueLabel(task.due, today)}</span></small></button>
    <Badge color={task.priority === 'High' ? 'rose' : task.priority === 'Medium' ? 'amber' : 'neutral'}>{task.priority}</Badge>
  </div>;
}
export function DayLabel({ date }) {
  return <span className="day-label"><CalendarDays size={15} />{niceDate(date, { weekday: 'long', day: 'numeric', month: 'long' })}</span>;
}
export function TimeRange({ item }) {
  return <span className="day-label"><Clock3 size={15} />{timeLabel(item.start)} – {timeLabel(item.end)}</span>;
}
