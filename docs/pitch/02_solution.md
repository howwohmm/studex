# The Solution
### Studex — Working Document

---

## What Studex Does

Studex is a mobile app that answers one question every Indian college student asks every morning: *what do I have today?*

That's the core. Everything else is built around that daily habit.

Three features. Each one targets a specific daily pain point. Claude is the backbone — not a feature on top, but the infrastructure that makes the whole thing work.

---

## Feature 01 — Today View (Smart Schedule)

The home screen shows today's classes. Clean list. Times. Venue. That's it.

The timetable is set up once during onboarding — student takes a photo or uploads a PDF of their timetable, claude extracts everything: subjects, timings, classrooms, days. If it finds shorthand it can't resolve, it asks. Student confirms, dashboard goes live. No manual input, no scrolling.

This is the reason a student opens the app every day. Daily habit = the foundation everything else sits on.

---

## Feature 02 — Subject Folders (Files)

Every subject gets a folder. PDFs, notes, links, past papers — organized by subject, searchable, permanent.

Currently this all lives in WhatsApp and gets buried within hours. Student can dump all files and let AI organize them into clean folders, or set it up manually. Everything stays findable.

This is the feature students use hardest around exams — and the one that keeps them coming back, because once your files are in Studex, you have to come back to get them.

---

## Feature 03 — Bunk Tracker (Attendance)

Students log attendance themselves — attended or not. The app tracks their percentage against the 75% requirement in real time.

The timetable upload itself kicks off the intelligence layer: claude calculates total classes per subject across the whole semester (based on months, exam schedule). From there, every mark feeds into a live prediction: how many classes you can still miss, whether today's bunk is safe or risky, will you be crying by semester end.

No dependence on the college portal. No lag. The student controls their own data and knows exactly where they stand.

---

## The AI Layer

Claude runs underneath every core flow:

- **Timetable extraction** — reads uploaded image or PDF, pulls all structured data, asks follow-up questions for shorthand, confirms before writing to database
- **Conversational onboarding** — profile setup through a chat interface, not a form
- **Attendance intelligence** — bunk predictions, semester-end projections, "can I skip tomorrow" calculations
- **AI mode** — dedicated chat interface where students can ask anything: schedule, materials, attendance status

This is not an AI wrapper. Claude is the product.

---

## Pro Features (₹250/month)

Built on top of the free core:

- **AI material search** — RAG pipeline over all uploaded subject PDFs. Student asks "formula for torque" or "what's in unit 4" — claude searches across their own material.
- **Lecture digests** — upload a lecture PDF or notes, claude converts it into a focused study card with spaced repetition at day 3, 7, and 30.
- **Smart bunk predictions** — full attendance intelligence, semester projections.
- **Deadline alerts + submission reminders.**

---

## What It's Not

Not a college portal replacement. Not an LMS. Not a learning platform.

It doesn't need the college to cooperate. It works regardless of how good or bad a college's infrastructure is. The student is the user, the student is the customer.

---

## Day One Experience

Student signs up. AI chat guides them through profile setup — no boring forms. They upload a photo of their timetable. Claude extracts everything, asks follow-ups if needed, presents it for confirmation. Dashboard goes live. Total time: under two minutes.

No empty state. No "invite your friends to get started." Useful on day one, alone.

---

## What's Next

The next unlock is a WhatsApp agent. It connects to class groups — claude reads every message, extracts files into subject folders, flags exam dates, sets reminders from deadlines, generates a morning digest.

The goal: you never need to open WhatsApp for academics again.

---

## How It Grows

**Right now (MVP):** Schedule, files, attendance. Fast to build, fast to validate.

**Next:** WhatsApp agent. CR tools. Peer notes network.

**Eventually:** Colleges that want to plug in officially can pay for institutional access. Never required for the student product to work.
