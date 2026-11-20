# StudEx — complete microcopy pack

Conventions: `{slot}` = runtime interpolation (`\(value)` in Swift). Plural variants via `.stringsdict` where noted. Bands: **ABOVE** = bunk budget ≥ 1 · **CLOSE** = at/over threshold, budget 0 · **BELOW** = under threshold. `{threshold}` defaults to 75. Exactly one exclamation mark exists in the entire pack (flagged).

## 1. Onboarding — capture

| key | text | notes |
|---|---|---|
| `onboarding.headline` | What do you have today? | LOCKED. Large title over capture card. |
| `onboarding.feature.1` | Your day, sorted. | LOCKED. Pair with `calendar` symbol. |
| `onboarding.feature.2` | Know your number. Always. | LOCKED. Pair with `gauge` symbol. |
| `onboarding.feature.3` | Never lose a file again. | LOCKED. Pair with `folder` symbol. |
| `capture.button.scan` | Scan timetable | Primary, prominent. Opens camera. |
| `capture.button.photos` | Choose from Photos | PHPicker. "Photos" is the app name, keep capitalized. |
| `capture.button.pdf` | Pick a PDF | Document picker. |
| `capture.caption` | Crumpled paper, PDF, screenshot from the class group — all fine. | Caption2, secondary. Meets students where the timetable actually lives: WhatsApp. |
| `capture.manual.link` | No timetable handy? Type it in | Plain link below buttons. Routes to empty confirm screen. |
| `permission.camera` | StudEx uses the camera to scan your timetable and to add photos to your subject folders. Everything stays on this device. | `NSCameraUsageDescription`. Factual for App Review. |

## 2. Extraction progress

| key | text | notes |
|---|---|---|
| `extract.step.1` | Reading your timetable | Step labels swap with `.contentTransition(.opacity)`. |
| `extract.step.2` | Finding the classes | |
| `extract.step.3` | Building your week | |
| `extract.step.boost` | Asking Claude nicely | Optional: replaces step 2 only when an API key is set. |
| `extract.wait` | Usually a few seconds. | Caption under the progress indicator. |
| `extract.fail.title` | Couldn't read that | |
| `extract.fail.body` | Blurry, cropped, or a truly ambitious layout. Try a flatter, brighter shot — or type it in. | Blames the timetable, never the person. |
| `extract.fail.retry` | Try another photo | Primary. |
| `extract.fail.manual` | Type it in | Secondary. Same destination as `capture.manual.link`. |

## 3. Confirm timetable

| key | text | notes |
|---|---|---|
| `confirm.title` | Check your week | Nav large title. |
| `confirm.subtitle` | Tap anything that looks off. | Secondary line under title. |
| `confirm.header.day` | Monday … Saturday | Section headers from system weekday symbols. Show Sunday only if a class landed on it. |
| `confirm.row.lowconfidence` | Best guess — tap to check | Orange caption on rows under the confidence cutoff. |
| `confirm.row.add` | Add a class | Trailing row per day section, `plus.circle` symbol. |
| `confirm.batch.question` | Does your class split into batches? | Section header for batch step. |
| `confirm.batch.explainer` | Labs and tutorials often run per batch (A1, B2, …). Pick yours and the other batches stay off your Today. | Footer. |
| `confirm.batch.none` | No batches | First option, default. |
| `confirm.semester.header` | Semester dates | |
| `confirm.semester.start` | First day | Date picker row. |
| `confirm.semester.end` | Last day | Date picker row. |
| `confirm.semester.footnote` | Holidays don't count against you. Add them anytime in Settings. | Section footer. |
| `confirm.save` | Looks right | Primary CTA. Confirms the whole point of an editable list. |

## 4. Mid-semester catch-up

| key | text | notes |
|---|---|---|
| `catchup.title` | Already mid-semester? | |
| `catchup.explainer` | Enter how many classes each subject has held, and how many you made it to. 30 seconds, and your first number is your real number — not a fresh 100% that means nothing. | The sell: real % from minute one. |
| `catchup.hint` | Rough numbers are fine — you can fix them later. | Caption. Survey says nobody knows their exact count; lower the bar. |
| `catchup.field.held` | Classes held | Numeric field label, per subject. |
| `catchup.field.attended` | You attended | Numeric field label, per subject. |
| `catchup.column.held` / `catchup.column.attended` | Held / Attended | Compact column headers if fields render as a grid. |
| `catchup.skip` | Start from today | Toolbar. Says what skipping actually does. |
| `catchup.done` | Show my number | Primary CTA. Sets up the count-up animation payoff on Today. |

## 5. Today

| key | text | notes |
|---|---|---|
| `today.title` | Today | Nav large title. Date as toolbar subtitle via formatter. |
| `today.card.caption` | Overall | Caption above the animated % (`.contentTransition(.numericText())`). |
| `today.verdict.above` | You're at {percent}%. You can bunk {n} more and stay above {threshold}%. | Singular "1 more" via stringsdict. |
| `today.verdict.close` | You're at {percent}%. One bunk puts you under {threshold}%. | Math, not warning. No "careful". |
| `today.verdict.below` | You're at {percent}%. Attend the next {n} to reach {threshold}%. | LOCKED pattern. Number + math only. |
| `today.section.upcoming` | Coming up | |
| `today.section.earlier` | Earlier | |
| `today.badge.now` | NOW | All-caps badge, tint background. Deliberate exception to sentence case. A11y: "happening now". |
| `today.row.multihour` | Hour {i} of {k} | Row subtitle for lab blocks; each contact hour is marked separately. |
| `today.unmarked.prompt` | Did you make it? | On past unmarked rows, next to the two mark buttons. Gentle, no nag. |
| `mark.attended` | Attended | 3-way contact-hour control, option 1. Counts +1/+1. Green. |
| `mark.bunked` | Bunked | Option 2. LOCKED word, never Skipped/Missed. Counts 0/+1. Red. |
| `mark.cancelled` | Cancelled | Option 3. Removed from both sides of the math. Gray. |
| `today.state.attended` / `today.state.bunked` | Attended / Bunked | Marked-state chips. A11y hint: "Tap to change". |
| `today.state.cancelled` | Cancelled | Chip. Subtitle: `today.cancelled.detail`. |
| `today.cancelled.detail` | Doesn't count | Caption under cancelled rows. |
| `today.empty` | Nothing today. Go touch grass. | LOCKED. ContentUnavailableView, `leaf` symbol. |
| `today.toast.recovered` | You're back above {threshold}%! | THE ONLY EXCLAMATION MARK IN THE APP. Fires once, on crossing up through the threshold. |

## 6. Subjects

| key | text | notes |
|---|---|---|
| `subjects.title` | Subjects | Tab + nav title. |
| `subjects.row.subtitle` | {attended} of {held} attended | E.g. "23 of 30 attended". |
| `subjects.toolbar.heatmap` | Your semester | A11y label for the `calendar` toolbar button. |
| `a11y.subject.above` | {subject}. {percent} percent. {attended} of {held} attended. You can bunk {n} more. | VoiceOver for row + gauge. |
| `a11y.subject.close` | {subject}. {percent} percent. {attended} of {held} attended. No bunks to spare. | |
| `a11y.subject.below` | {subject}. {percent} percent. {attended} of {held} attended. Attend the next {n} to reach {threshold} percent. | |
| `subjects.empty` | Set up your subjects to see your %. | LOCKED. Button below reuses `capture.button.scan`. |

## 7. Subject detail

| key | text | notes |
|---|---|---|
| `detail.status.above` | {percent}%. You can bunk {n} more and stay above {threshold}%. | Status card, subject-scoped. |
| `detail.status.close` | {percent}%. One bunk puts you under {threshold}%. | |
| `detail.status.below` | {percent}%. Attend the next {n} to reach {threshold}%. | |
| `detail.status.counts` | {attended} of {held} attended | Secondary line on card. |
| `detail.files.header` | Files | Section header. |
| `detail.add.a11y` | Add to {subject} | A11y label on the `plus` toolbar menu. |
| `detail.add.camera` | Take a photo | Menu, `camera` symbol. |
| `detail.add.photos` | Choose from Photos | Menu, `photo.on.rectangle` symbol. |
| `detail.add.files` | Browse Files | Menu, `folder` symbol. "Files" = app name. |
| `detail.add.note` | Write a note | Menu, `square.and.pencil` symbol. |
| `note.editor.title` / `note.editor.save` | New note / Save | Note editor sheet. Placeholder: "Type your note". |
| `detail.empty` | Empty folder. Drop something in. | LOCKED. ContentUnavailableView. |
| `file.delete.title` | Delete "{filename}"? | Confirmation dialog. |
| `file.delete.body` | It only lives on this phone. Gone is gone. | Honest about local-only. |
| `file.delete.confirm` / `file.delete.cancel` | Delete / Cancel | Delete = destructive role. |

## 8. Heatmap (Your semester)

| key | text | notes |
|---|---|---|
| `heatmap.title` | Your semester | Nav title. |
| `heatmap.filter.all` | All subjects | Default filter pill; subject names replace it when filtered. |
| `heatmap.legend.attended` | Attended | Green. |
| `heatmap.legend.mixed` | Mixed | Green/red split cell. |
| `heatmap.legend.bunked` | Bunked | Red. |
| `heatmap.legend.none` | No classes | Quiet fill. |
| `heatmap.legend.holiday` | Holiday | Quiet fill, distinct. |
| `heatmap.stat.streak` | Streak | Stats row. Value: `{n} days` (stringsdict for "1 day"). Consecutive days with everything attended. |
| `heatmap.stat.attended` | Attended | Value: raw count. |
| `heatmap.stat.bunked` | Bunked | Value: raw count. |
| `heatmap.sheet.title` | — | Tapped day's date via system formatter, e.g. "Tue, 12 Aug". |
| `heatmap.sheet.summary` | {a} attended · {b} bunked | Sheet subtitle, above that day's class list. |
| `heatmap.sheet.empty` | No classes this day. | |
| `heatmap.sheet.holiday` | Holiday — nothing counts. | |
| `heatmap.sheet.future` | Hasn't happened yet. | Future-day tap. Cells render near-transparent; a11y: "{date}, future". |

## 9. Settings

| key | text | notes |
|---|---|---|
| `settings.title` | Settings | Tab + nav title. |
| `settings.section.semester` | Semester | |
| `settings.row.dates` | Semester dates | Value: `{start} – {end}`. |
| `settings.row.holidays` | Holidays | Value: count. Pushes editor. |
| `settings.footer.semester` | Your % counts teaching days between these dates. Holidays and cancelled classes don't count at all. | The semester-math explainer. |
| `holidays.title` | Holidays | Editor nav title. |
| `holidays.add` | Add holiday | Date or range picker row. |
| `holidays.empty` | No holidays yet. | |
| `holidays.delete` | Remove | Swipe action. |
| `holidays.footer` | Classes on these days vanish from the math — and from Today. | |
| `settings.section.attendance` | Attendance | |
| `settings.row.threshold` | Minimum attendance | Value: `{threshold}%`. Picker 50–95, default 75. |
| `settings.footer.threshold` | 75% is the usual rule. If your college wants something else, set it here and every number follows. | |
| `settings.section.notifications` | Notifications | |
| `settings.row.reminders` | Class reminders | Toggle. |
| `settings.row.leadtime` | Remind me | Value: `{n} minutes before`. |
| `settings.footer.notifications` | One notification before each class. That's the lot. | |
| `settings.section.scanning` | Smarter scanning | |
| `settings.row.claudekey` | Claude API key | Secure field, placeholder "Paste key". When set, value reads "Key added". |
| `settings.row.removekey` | Remove key | Red, appears when key set. |
| `settings.footer.claudekey` | Optional. Claude helps read messy timetables when the on-device scan struggles. Your key stays in the Keychain on this device. Timetable images go to Claude only during a boosted scan. | Contains LOCKED phrase verbatim. Honest about what leaves the device and when. |
| `settings.section.timetable` | Timetable | |
| `settings.row.edit` | Edit timetable | Reopens confirm list. |
| `settings.row.rescan` | Scan timetable again | Triggers alert below. |
| `rescan.alert.title` | Replace your timetable? | |
| `rescan.alert.body` | The weekly schedule is rebuilt from the new scan. Subjects, attendance history and files stay put. | Says exactly what survives. |
| `rescan.alert.confirm` / `rescan.alert.cancel` | Scan / Cancel | |
| `settings.section.about` | About | |
| `settings.row.version` | Version | Value: `{version}`. |
| `settings.footer.about` | Local-only. No account, no cloud, nobody watching. | |
| `settings.row.reset` | Erase everything | Red, own section at bottom. Alert in §15. |

## 10. Notifications

| key | text | notes |
|---|---|---|
| `notif.preprompt.title` | One heads-up per class | Pre-permission sheet, before the system prompt. |
| `notif.preprompt.body` | Before each class: subject, room, and two buttons to mark it. No streak nags, no marketing. Ever. | |
| `notif.preprompt.allow` | Allow notifications | Primary → system prompt. |
| `notif.preprompt.later` | Not now | Plain button. |
| `notif.class.title` | {subject} in {minutes} min | E.g. "DBMS in 10 min". |
| `notif.class.body` | {time} · Room {room} | E.g. "9:00 am · Room LT-2". |
| `notif.class.body.noroom` | Starts at {time} | Fallback when no room extracted. |
| `notif.action.attended` | Attended | Notification action. LOCKED word. |
| `notif.action.bunked` | Bunked | Notification action. LOCKED word. |

## 11. Siri & Shortcuts

| key | text | notes |
|---|---|---|
| `intent.phrase.number` | What's my number in ${applicationName} | App Shortcut phrases must embed the app name token. |
| `intent.phrase.bunk` | Can I bunk in ${applicationName} | Prompts for subject if not given. |
| `intent.phrase.next` | What's next in ${applicationName} | |
| `siri.verdict.above` | You're at {percent} percent overall. You can bunk {n} more and stay above {threshold}. | Spoken; no "%" symbol. |
| `siri.verdict.close` | You're at {percent} percent overall. One bunk puts you under {threshold}. | |
| `siri.verdict.below` | You're at {percent} percent overall. Attend the next {n} to reach {threshold}. | |
| `siri.bunk.above` | {subject} is at {percent} percent. You've got {n} bunks in the budget. | |
| `siri.bunk.close` | {subject} is at {percent} percent. Bunk it and you're under {threshold}. | Math, not judgment. |
| `siri.bunk.below` | {subject} is at {percent} percent. Attend the next {n} to reach {threshold}. | |
| `siri.next` | Next: {subject} at {time}, room {room}. | |
| `siri.next.none` | Nothing today. Go touch grass. | LOCKED line, reused verbatim. |

## 12. TipKit tips

| key | text | notes |
|---|---|---|
| `tip.mark.title` | Tap to mark | First run, anchored to first class row. |
| `tip.mark.body` | Attended or Bunked — one tap and the math updates. | |
| `tip.swipe.title` | Even faster | After ~3 taps. |
| `tip.swipe.body` | Swipe right for Attended, left for Bunked. | |
| `tip.heatmap.title` | The whole semester | Anchored to calendar toolbar button on Subjects. |
| `tip.heatmap.body` | Tap the calendar to see every day — streaks and all. | |

## 13. Widgets

| key | text | notes |
|---|---|---|
| `widget.gallery.name` | Your number | Widget gallery display name. |
| `widget.gallery.desc` | Attendance at a glance, verdict included. | |
| `widget.caption` | Overall | Small caption above the big %. |
| `widget.verdict.above` | Safe | Small widget verdict word. |
| `widget.verdict.close` | Tight | |
| `widget.verdict.below` | Attend {n} | Number + math, compressed. E.g. "71%" over "Attend 3". |
| `widget.line.above` | Bunk budget: {n} | Medium widget verdict line. |
| `widget.line.close` | No bunks to spare | |
| `widget.line.below` | Attend the next {n} for {threshold}% | |
| `widget.next` | Next: {subject} · {time} · {room} | Medium only. Room omitted if unknown. |
| `widget.next.none` | Nothing today. Go touch grass. | LOCKED line, reused verbatim. |

## 14. Error toasts

| key | text | notes |
|---|---|---|
| `toast.extract.fail` | Couldn't read that one. Try a sharper shot. | Quick toast (re-scan context); full-screen failure is §2. |
| `toast.file.big` | Too big. Files up to {n} MB only. | |
| `toast.key.invalid` | That key didn't work. Check for typos and paste again. | Shown on key validation failure in Settings. |

## 15. Delete & reset confirmations

| key | text | notes |
|---|---|---|
| `subject.delete.title` | Delete {subject}? | |
| `subject.delete.body` | Its attendance history and files go too. No undo. | |
| `subject.delete.confirm` / `subject.delete.cancel` | Delete / Cancel | Destructive role. |
| `reset.title` | Erase everything? | From `settings.row.reset`. |
| `reset.body` | Subjects, attendance, files — the lot. It only exists on this phone, so it's really gone. | Local-only honesty doubles as the warning. |
| `reset.confirm` / `reset.cancel` | Erase everything / Cancel | Destructive role; consider `confirmationDialog` for the extra step. |
| `key.remove.title` | Remove key? | |
| `key.remove.body` | Scanning falls back to on-device only. | |
| `key.remove.confirm` / `key.remove.cancel` | Remove / Cancel | |