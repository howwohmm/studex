# StudEx Psychology Brief
**Audience:** Indian college students, 17–22, WhatsApp-native, anxious about the 75% rule, zero trust in college portals.
**Prime directive:** This app converts anxiety into arithmetic. Every mechanic below is a screen-specific build item. Tone is locked: numbers + math, never verdicts. The word is **Bunked**.

Sections are ranked by behavioral impact: activation gates everything (1), then the loop that compounds daily (2), the framing that is the product's language (3), the data-honesty architecture every other number depends on (4), then recovery, streaks, and cliffs.

---

## 1. The First-90-Seconds Aha (Rank 1 — activation gate)

**Mechanism:** Trust in a number comes from three things: it matches the gut, it shows its work, and it can be corrected. Students distrust portals precisely because portal numbers are stale, opaque, and unfixable. StudEx must be the anti-portal in minute one.

**Mechanics:**

- **Time-budget the flow to 90 seconds:** snap (10s) → extraction (10s) → confirm list (30s) → catch-up (25s) → number reveal (5s). Every optional screen (batch pick, API key) is skippable with the primary button; the Claude key lives in Settings only, never onboarding — asking for a key in minute one is a trust killer.
- **Labor illusion during extraction:** show subjects materializing as chips as they're parsed ("Found: Maths… FM… DBMS"), not a spinner. Visible work raises perceived accuracy of the output — critical because the next screen asks them to trust it.
- **Editable confirm list = ownership:** the act of fixing one wrong cell is a feature, not a failure. Correcting the machine transfers ownership of the timetable to the student (IKEA effect) and signals "this app doesn't pretend, unlike the portal."
- **Catch-up seeding does the math they can't:** students don't know their counts — that's the validated insight. So the catch-up screen pre-computes **"classes held"** per subject from semester start date × timetable, and asks only for **"attended"** via a stepper defaulted to held. Microcopy: *"Best guess is fine. You can fix it anytime."* and *"Not sure? Round down."* — rounding down is asymmetric-risk design: a low seed produces pleasant surprises later; a high seed produces false safety and a catastrophic trust failure at detention-list time.
- **Seed per-subject, not globally:** a single global estimate yields uniform percentages that match nobody's gut. Per-subject seeding lets the subject they *know* they've bunked show the lowest number — when the app's ranking matches their gut ranking, the number is believed even if the magnitude is an estimate.
- **Spend the one animated moment here:** first Today render, overall % counts up via `.contentTransition(.numericText())` with the line beneath: *"You're at 81%. You can bunk 6 more and stay above 75%."* This is the first time in their college life they've seen their number. Make it land.
- **Every % is a disclosure:** tapping the number anywhere reveals the fraction — "34 of 42 attended." A bare percentage is a black box like the portal; a checkable fraction is proof.
- **Trust via architecture:** one onboarding line — *"Stays on your phone. No portal, no login."* The contrast with the distrusted ERP is itself the trust cue.

---

## 2. The Daily-Open Habit Loop (Rank 2 — the compounding asset)

**Mechanism:** Don't create a new cue — hijack the existing one. The current habit is: wake up → check phone → ask WhatsApp "what class is next?" StudEx must answer that question *earlier in the same glance*. And deliberately reject variable rewards: for an anxiety-reduction product, the reward must be *reliable certainty* — same glance, same answer, every day. Mystery manufactures the anxiety we're killing.

**Loop:** Cue = morning phone unlock (already universal). Action = glance, not open. Reward = certainty (anxiety relief is negative reinforcement — stronger for this audience than any points system).

**Mechanics:**

- **Lock-screen accessory widget (accessoryRectangular):** "Next: Maths · 9:00 · Room 204." The answer appears before WhatsApp can be opened. This is the single highest-leverage retention surface — the widget is the habit product; the app open is for marking.
- **Home-screen small widget, interactive:** today's remaining classes + bunk budget chip, with App Intents tap-to-mark so a class can be marked Attended/Bunked from the widget and the budget number updates in place — the reward loop closes without an app launch.
- **Exactly two notifications per day, both informational, both toggleable in Settings:**
  - *T–20 before first class:* "First up: Maths at 9:00, Room 204." Welcome because it's actionable (still time to leave the hostel) and it's information they'd otherwise ask a friend for.
  - *30 min after last class, only if unmarked classes exist:* "3 classes from today left to mark." The open loop of unfinished marking (Zeigarnik) provides the pull; the copy stays a count, never a scold.
  - **Never send:** anything during class hours, per-class pings (one glance covered the day), streak warnings, below-75 alerts. Rule: notifications carry information, never judgment.
- **Marking micro-reward:** tap → light impact haptic → the row's % and the header budget animate via `.numericText()` in under 300ms. Action → visible consequence is the tightest possible feedback loop. "You can bunk 5 more" ticking to "4 more" after a Bunked tap makes every mark *mean* something.
- **Honest scope:** StudEx won't kill WhatsApp (it's social); it takes over the two questions with numeric answers — "what's next" (widget) and "can I bunk this?" (budget). Position everything around owning those two moments.

---

## 3. Loss Aversion + Budget Framing (Rank 3 — the product's language)

**Mechanism:** "83%" is a state; "2 bunks left" is a resource being spent. Mental accounting turns bunking from a moral failure into a purchase decision — which is exactly the neutral-tone stance. And students can't do the denominator math (76% → how many can I miss?); performing that conversion *is* the product. Percentages answer "where am I" (status); budgets answer "what can I do" (action).

**Placement rules:**

- **Today header:** action surface → budget leads. Overall % present but the sentence is the star: *"81% overall. 6 bunks in budget."*
- **Today class rows:** the decision point. A tiny per-subject chip on each row — "FM: 1 left" — puts the stake of *this specific class* at the exact moment of the bunk decision. This is the highest-value placement in the app.
- **Subjects rows:** scanning/comparison surface → % + green/red status dot ranks subjects by risk; budget as the secondary chip ("can miss 3").
- **Subject detail:** the full ledger — Gauge with a visible 75% tick, fraction (34/42), budget, and forward math.
- **Budget-zero state:** never render "0 left" as doom. Flip to the recovery voice: *"No bunks left in FM. Attend the next one to stay at 75%."*

**Refuse:** weaponized loss aversion — "Don't lose your 80%!" manufactures the anxiety this app exists to remove. The budget is agency framing, not threat framing.

---

## 4. Marking Friction + Honesty Architecture (Rank 4 — data integrity is oxygen)

**Mechanism:** Fogg's B=MAP — motivation at 6 PM after labs is near zero, so ability must be maximal: one tap. And the state model must make truth cheaper than flattery, because a number built on lies stops matching reality within two weeks and the entire product dies silently.

**The four states (non-negotiable):**

1. **Unmarked** (default, hollow circle) — counts in *neither* numerator nor denominator. Auto-bunking the forgetful corrupts the number downward and punishes busy days; auto-attending corrupts it upward into portal-grade fiction. Unresolved count shows as a quiet badge on Today.
2. **Attended** — green check, one tap.
3. **Bunked** — red mark, one tap, *equal size, adjacent, identical haptic* to Attended. Any celebratory differential for Attended is a guilt gradient — refused.
4. **Cancelled** — long-press/swipe menu, excluded from both numerator and denominator. This state is essential in Indian colleges (prof absent, mass cancellation, surprise holiday). Without it students face lie-or-lie: mark Attended (inflates) or Bunked (self-harm) — they'll pick Attended and the number drifts into fiction.

**Mechanics:**

- **Reward accuracy, not virtue:** marking Bunked instantly pays the user with an updated budget ("4 left") — the truthful tap buys planning power; a lie buys nothing visible. Make honesty's payoff render on-screen.
- **End-of-day sweep:** after last class, Today shows "Mark remaining 3 Attended" — one tap for the most common truth, with per-row override still visible.
- **Mistake tolerance:** every mark shows an undo toast ("FM marked Bunked — Undo"); any past day is editable from the heatmap. Fixable mistakes → fearless fast tapping.

---

## 5. Below-75 Recovery Psychology (Rank 5 — retaining the core persona)

**Mechanism:** The ostrich effect — people avoid checking information they expect to be bad (investors don't open portfolios in down markets). If StudEx becomes where bad feelings live, the below-75 student — the *core* persona — avoids it, then deletes it. The antidote: never show a bad number without its exit, and keep the visual temperature at calculator, not verdict.

**Mechanics:**

- **Number + plan is one atomic component:** "71%" never renders alone. Always the locked pattern: *"You're at 71%. Attend the next 3 to reach 75%."* On Subjects rows, the below-75 chip reads "needs 3" — even a glance delivers a plan, not just an alarm.
- **Recovery as a countdown:** on subject detail below 75%, the budget chip becomes a live "Next 3 → 75%" counter that decrements with each Attended mark, and the count-up animation now works *for* hope: 71 → 72% ticking upward per class is the progress principle rendered in one control.
- **Chunk long recoveries:** if the true number is 14, show the total and this week's slice — "14 to go. This week: 5 scheduled." Goal-gradient: sub-goals within reach keep engagement alive.
- **Visual treatment:** background stays systemBackground, tint stays systemBlue; red is confined to the small status dot/percentage tint (semantic, quiet). No red cards, no warning triangles, no "at risk"/"danger"/"warning" — verdict words trigger avoidance; arithmetic words trigger planning.
- **Pull, never push:** below-75 information appears only when the student navigates to it. A "you dropped below 75%" notification is the single fastest uninstall in this category. Zero exceptions.
- **Honest impossibility:** if needed classes exceed remaining scheduled classes, say it flat: *"75% isn't reachable this sem. Max possible: 73%. Each class raises it."* Honesty here preserves trust for next semester — and 73% vs 71% still matters for condonation.

---

## 6. Streaks + Heatmap Done Right (Rank 6 — motivation without a leash)

**The rule (the question answered):** The streak counts **consecutive scheduled days you marked your day** — Attended, Bunked, or Cancelled all count equally. **A within-budget bunk never touches the streak.** Three reasons: the daily behavior the app actually needs is honest marking; an attendance streak would punish budgeted bunking, contradicting the product's core stance that a planned bunk is legitimate; and if bunking broke streaks, students would mark Bunked days as Attended to save the streak — corrupting the data that everything else depends on. Honesty must never have a price.

**Mechanics:**

- **Call it a "marking streak"** in the UI so its meaning is unambiguous.
- **Auto-bridge non-days:** Sundays, holidays, and Break Mode days pause, never break, the streak.
- **48-hour grace:** retro-marking yesterday preserves the streak — kills Snapchat-style streak dread (which is manufactured anxiety) while keeping the daily pull.
- **Contain the stakes:** the streak lives only on the heatmap screen (calendar toolbar button on Subjects) — not on Today, not in widgets, never in notifications. When a streak ends, the counter just shows the current run; no "you lost 47 days" mourning copy anywhere.
- **Heatmap semantics:** green cell = fully attended day, red = day containing a Bunked, gray = no class, hollow = unmarked — per locked green/red semantics. The caption above does the tone work: *"June: 41 attended · 4 Bunked · within budget."* Facts in the grid, "you're fine" in the caption — red becomes information, not accusation.
- **Milestones, dry:** 7/30/100 marked days get one inline line ("30 days of real numbers"), no confetti — the one animated moment is already spent.

---

## 7. Retention Cliffs (Rank 7 — three cliffs, one mechanic each)

- **Semester break → Break Mode.** After 7+ consecutive no-class days (or user-set dates in Settings), offer it: streak and notifications freeze, Today reads *"On break. See you Jan 2."* On return, exploit the fresh-start effect: a "New semester?" flow archives the old semester (files stay — locked promise), re-snaps or reuses the timetable, and ends with a **semester receipt** card — *"Sem 4: 312 classes · 84% · 21 Bunked, all within budget"* — shareable as an image to WhatsApp (peak-end moment, user-initiated, the only social surface; never leaderboards, which turn attendance into shame comparison).
- **Timetable changes → cheap correction.** The first wrong class on Today is a credibility wound; the second is a deletion. Swipe any Today row → **"Just today"** (one-off cancel/move) vs **"Every week"** (recurring edit) — mid-sem slot shuffles are constant in Indian colleges and must cost one swipe, not a re-onboarding. Settings keeps "Re-snap timetable," diffing against existing subjects so history survives.
- **Post-exam / comfortably-safe apathy → flip monitoring into spending.** When every subject is safe, the Today header leads with the asset: *"8 bunks in the bank."* The safe student's use case is *planning* bunks (fest, trip, sleep) — serve it and the app stays relevant exactly when attendance pressure is gone. Exam windows auto-quiet like Break Mode. Structurally, the Subjects/files tab is the bridge across attendance-dead zones: notes matter most during exams, when marking matters least — "Never lose a file again" carries retention until classes resume.

---

## TOP 10 BUILD DIRECTIVES

1. On the onboarding catch-up screen, pre-fill each subject's "held" count from semester start date × timetable and let the student adjust only "attended" with a stepper under the microcopy "Best guess is fine. Not sure? Round down."
2. Spend the app's one animated moment on the first Today render: count the overall % up with `.contentTransition(.numericText())` beneath "You're at 81%. You can bunk 6 more and stay above 75%."
3. Make every percentage in the app tappable to disclose its fraction ("34 of 42 attended"), because a checkable number is the anti-portal proof this audience needs.
4. Ship an interactive small widget and lock-screen accessoryRectangular showing next class + room + bunk budget with tap-to-mark, so the 7 AM glance that used to be a WhatsApp message becomes StudEx.
5. Send exactly two daily notifications — "First up: Maths at 9:00, Room 204" 20 minutes before first class, and "3 classes from today left to mark" 30 minutes after the last (only if unmarked) — both toggleable, never during class, never about streaks or bad numbers.
6. On Today rows, make Attended and Bunked equal-size adjacent one-tap targets with identical haptics, put Cancelled behind long-press (excluded from all math), count Unmarked nowhere, and offer "Mark remaining 3 Attended" after the last class.
7. Place budget sentences at decision points (Today header "6 bunks in budget," per-class chips "FM: 1 left") and percentages at status surfaces (Subjects rows, detail Gauge with a 75% tick).
8. Below 75%, render number and plan as one atomic component — "You're at 71%. Attend the next 3 to reach 75%." — with a live decrementing counter on subject detail, red confined to the status dot, and zero notifications about it, ever.
9. On the heatmap screen, define the streak as consecutive scheduled days marked (Attended, Bunked, or Cancelled all count), auto-bridge holidays with a 48-hour retro-mark grace, and label it "marking streak" so a within-budget bunk never costs anything.
10. Build the three cliff mechanics: Break Mode (Today reads "On break. See you Jan 2.", streaks and notifications freeze), swipe-to-edit on Today rows splitting "Just today" from "Every week," and a New Semester flow ending in a shareable semester-receipt card.