# Studex web preview

Studex is a mobile-friendly academic workspace for Indian university students. The first release uses one subject model to connect the dashboard, timetable, attendance, assignments, and library. The example workspace uses fictional data; **Settings → Start my own workspace** clears it and lets you add your own profile and subjects.

## Run

Use Node.js 22.12 or newer. From this directory:

```sh
npm ci
npm run dev
```

Use a loopback URL on your own machine or HTTPS on a deployed host. File hashes and workspace identifiers use browser APIs that require a secure context. For static hosting, run `npm run build` and serve `dist/` at the site's root. Preview the production build with `npm run preview`.

## What you can try

- **Timetable:** add one-time or weekly classes, switch between day and week, review overlaps, or skip an occurrence. Import English timetable photos or text-based PDFs, CSV or TXT; inspect and edit the extracted rows before saving. For best results, use one class per line. Complex grids, faint photos and scanned PDFs are not reliably parsed; paste a transcription or use the CSV template instead.
- **Attendance:** set a target per subject, enter prior counts, mark a class present or absent, and correct records with preserved history. The forecast assumes each subsequent class has equal weight and uses the exact target for eligibility, not the displayed rounded percentage.
- **Assignments and Exams:** add deadlines, set priorities and statuses, filter by subject, and reopen completed work. Due dates and class days use India Standard Time.
- **Subjects and Library:** keep units, topics, notes, course work and files together. Search filenames, display names, and extracted PDF/TXT text. Uploads are stored locally; files are downloadable but there is no full PDF annotation viewer yet.

### Timetable CSV template

```csv
day,start,end,subject,room
Monday,09:00,10:00,Data Structures,Room 302
Wednesday,11:00,12:30,Database Systems,Lab 2
```

An existing subject is matched by name or course code. Otherwise, a subject is created when you confirm the import. You can also paste lines such as `Monday 09:00–10:00 | Data Structures | Room 302`. Unreadable lines are skipped; review the complete list before confirming.

## Storage and rollout

Your workspace is stored in this browser origin and uploaded originals in IndexedDB. OCR and PDF extraction run locally; academic files are not sent to a service. There is no account, backup, or cross-device sync. Clearing site data removes your workspace.

The selected repository previously contained only pitch materials. This first release adds the browser-local core without changing those materials. Next: authenticated accounts and sync, native iOS and Android clients against the shared model, then richer document processing and AI Tutor. This release does not include those, calendar sync or push reminders. The supplied spec ended during the Library requirements, so later modules need the complete spec before implementation.

## Checks

```sh
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```
