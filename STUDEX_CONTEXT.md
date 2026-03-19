# Studex — Context Prompt
### Paste this at the start of any AI tool, builder, or conversation.

---

## What We're Building

**Studex** is a mobile app for Indian college students that answers one question every morning: *what do I have today?*

Three core features:
- **Today View** — today's class schedule, clean and instant. Timetable extracted from photo/PDF via claude.
- **Subject Folders** — files organized by subject, never lost in WhatsApp again. AI organizes on dump.
- **Bunk Tracker** — real-time attendance % tracked against the 75% college rule. Full semester predictions.

Claude is the backbone — not a feature on top. Student-first. Works without college cooperation.

Free core always. Pro tier at ₹250/month (~$3).

---

## Who's Building It

**Om Mishra** — founder, CS student at Ramaiah University, Bengaluru. Lived this problem every day. Built and shelved v1. Reviving with more technical depth. Vibe codes daily — 15+ projects shipped. Udyam registered.

**Technical co-founder seat** — open. Single most critical unlock.

Learns from: Saurabh Garg (C4E), Heet Tike, Ankit Sharma, the Blulearn gang.

---

## Current Stage

- Product documented. Pitch deck built.
- MVP target: ~1 week using AI-assisted build tools.
- First users: 10 confirmed (Mruja, Dhvani, Prajval, Sumi, Pranita, Vishal, Srishti, Shraddha, Sumit, Puskar).
- Beachhead: Ramaiah University, Bengaluru — CR-first rollout.
- Revenue: pre-revenue, pre-launch.
- Applications filed: a16z Speedrun, Z Fellows, Eigenprize. Udyam registered.

---

## Tech Stack

- **iOS MVP**: SwiftUI + Core Data + Xcode.
- **AI**: Claude API for timetable extraction, onboarding chat, attendance intelligence, material search.
- **Backend**: Supabase for auth/database.
- Keep it simple. Speed of build matters more than architectural elegance right now.

---

## The AI Layer (Important)

Claude runs underneath every core flow:

1. **Timetable extraction** — student uploads photo or PDF → claude extracts subjects, timings, classrooms, days → asks follow-ups for shorthand → student confirms → dashboard live.
2. **Conversational onboarding** — profile setup via chat interface, not a form.
3. **Attendance intelligence** — bunk predictions, semester-end projections, "can I skip tomorrow."
4. **AI mode** — chat interface for anything: schedule, materials, attendance queries.
5. **Pro: AI material search** — RAG pipeline over uploaded subject PDFs.
6. **Pro: Lecture digests** — PDF/notes → focused study card with spaced repetition (day 3, 7, 30).

---

## Product Principles

1. **Less chaotic** — every feature passes one test: does this make the student's day less chaotic?
2. **Useful on day one** — no empty states, no "invite friends to get started," valuable alone immediately.
3. **Student-first** — the college doesn't need to cooperate.
4. **No feature creep** — MVP has exactly three features. Nothing else until those three are daily habits.

---

## What the MVP Needs to Do

A student can:
1. Sign up with any email
2. Go through AI chat onboarding (profile setup)
3. Upload timetable photo/PDF → claude extracts → confirm → dashboard live
4. See today's classes on home screen
5. Upload and organize files by subject
6. Log attendance and see live percentage with predictions

That's it. Anything beyond this is Phase 2.

---

## The One Metric That Matters

**Do students open this app every day without being reminded?**

Kill signal: fewer than 5 of 10 original users opening daily after 4 weeks = rebuild or stop.

---

## What Not to Do

- Don't suggest manual timetable input — the AI extraction IS the onboarding.
- Don't suggest enterprise features or admin dashboards right now.
- Don't suggest paid acquisition or big launch strategies.
- Don't over-engineer the backend.
- Don't add social features until the core utility is proven.
- Don't change the pricing — it's ₹250/month, not ₹49-99.

---

## What's Next (Vision)

**WhatsApp agent** — connects to class groups. Claude reads every message, extracts files, flags exam dates, sets reminders. Student gets a morning digest. Never opens WhatsApp for academics again.

**Attendance prediction** — proactive nudges based on your pattern, weather, current %.

**Exam crunch mode** — UI switches 2 weeks before exams. Surfaces unread PDFs, builds revision plan.

**CR tools** — dashboard for Class Reps to share files and announcements directly into studex.

**Peer notes network** — upload notes, claude structures them, searchable by whole batch.

**2-year vision:** Studex becomes the communication layer for the batch. WhatsApp stays for personal life.
