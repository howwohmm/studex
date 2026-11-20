# Studex web preview

Studex is a mobile-friendly academic workspace for Indian university students. The first release uses one subject model to connect the dashboard, timetable, attendance, assignments, and library. The example workspace uses fictional data; **Settings → Start my own workspace** clears it and lets you add your own profile and subjects.

## Run

Use Node.js 22.12 or newer. From this directory:

```sh
npm ci
npm run dev
```

Use a loopback URL on your own machine or HTTPS on a deployed host. File hashes and workspace identifiers use browser APIs that require a secure context. For static hosting, run `npm run build` and serve `dist/` at the site's root. Preview the production build with `npm run preview`.

The production build can reopen offline after the first complete online load on hosts that allow service workers. It caches the workspace shell and PDF reader, not the photo-OCR engine. Use `VITE_STUDEX_OFFLINE=false npm run build` on a host that blocks service workers, including Devin Apps and browser previews.

## What you can try

- **Timetable:** add one-time or weekly classes and breaks, switch between day and week, review overlaps, or skip an occurrence. Optional profile term dates bound weekly slots. Import English timetable photos or text-based PDFs, CSV or TXT; inspect and edit the extracted rows before saving. Complex grids, faint photos and scanned PDFs are not reliably parsed; paste a transcription or use the CSV template instead.
- **Attendance:** set a target per subject, enter prior counts, and mark a shared timetable occurrence from either screen. Cancelled slots are excluded, and you can undo attendance marks or correct them in history. The record-only forecast uses the exact target for eligibility, not the rounded display; it does not account for the remaining schedule.
- **Assignments and Exams:** both appear in open work and deadline counts, with overdue items shown separately. Set priorities and statuses, filter by subject, reopen completed work, and undo deletion. Due dates and class days use India Standard Time.
- **Subjects and Library:** keep units, topics, notes, course work and files together. Search filenames, display names, and extracted PDF/TXT text. Uploads are stored locally; files are downloadable but there is no full PDF annotation viewer yet.

### Timetable CSV template

```csv
day,start,end,subject,room
Monday,09:00,10:00,Data Structures,Room 302
Wednesday,11:00,12:30,Database Systems,Lab 2
```

An existing subject is matched by name or course code. Otherwise, a subject is created when you confirm the import. You can also paste lines such as `Monday 09:00–10:00 | Data Structures | Room 302`. Unreadable lines are skipped; review the complete list before confirming.

## Storage and rollout

Your workspace is stored in this browser origin and uploaded originals in IndexedDB. If a Library entry loses its original, re-upload the same file to restore it without losing its details. Browsers with Web Locks remove leftover originals that no longer have an entry. OCR and PDF extraction run locally; academic files are not sent to a service. If PDF extraction needs a connection to load the reader, it retries after reconnecting. There is no account, backup, or cross-device sync. Clearing site data removes your workspace; replacing the example workspace removes uploaded materials.

The selected repository previously contained only pitch materials. This first release adds the browser-local core without changing those materials. Next: authenticated accounts and sync, native iOS and Android clients against the shared model, then richer document processing and AI Tutor. This release does not include those, calendar sync or push reminders. The supplied spec ended during the Library requirements, so later modules need the complete spec before implementation.

## Checks

```sh
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```
