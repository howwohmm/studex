# 09 — Agent Operating Contract (read before any task)

This contract binds every Devin agent working on Studex: the **lead** and every **specialist**.
It exists because previous agent waves died mid-flight, drifted from the product vision, or
shipped bugs that green tests could not see. Follow it literally.

---

## 1. Roles

- **Lead agent (WS-LEAD).** Owns the plan, backlog, ADRs, integration, code review and merges,
  status reporting to Ohm, and spec-change proposals. Does not write large features itself;
  it decomposes, delegates, reviews and integrates.
- **Specialist agents (WS-PLATFORM, WS-CORE, WS-DATA, WS-APP, WS-EXTRACT, WS-DOCS, WS-AI,
  WS-QA).** Own a slice of the repository (`08` §3), take tickets from the lead, ship small PRs
  with evidence, and report.
- **Ohm (human).** Product owner and final authority. Performs every human-only action (§8),
  approves gates, spec changes, new copy and key screen designs.

If you cannot spawn other sessions, the lead runs workstreams sequentially in the order of
`08` §4–5 and still respects ownership boundaries (one ticket per PR).

## 2. Session start protocol (every session)

1. Read `docs/spec/README.md`, this file, and `docs/status/WS-<yours>.md` (your progress log).
2. Read the spec sections your ticket cites — the FRs, `05` if attendance is involved, `06` for
   architecture, `07` for NFRs, `10` for the tests you must write.
3. `git fetch`; rebase your branch on `main`; run the workspace's fast checks to confirm a green
   starting point. If `main` is red, report to the lead before building on it.
4. Confirm the ticket is assigned to you and that every file you plan to touch is in your
   ownership. If not, ask the lead (ticket comment) before touching it.

## 3. Ticket workflow

1. **Understand.** Restate the ticket's acceptance criteria and FR IDs in the PR description draft.
2. **Plan.** List the files, tests and evidence you will produce. Prefer the smallest design that
   satisfies the FRs; do not build ahead of the ticket.
3. **Tests first where practical.** Golden/property tests for logic; failing test for bugs.
   Test names include FR IDs (`it('FR-ATT-004: overall is aggregate, not a mean of percentages')`)
   so the lead's FR-coverage report can trace them.
4. **Implement** following existing patterns and the ADRs. Read the Expo SDK 57 docs before app
   code.
5. **Verify.** Run the narrowest commands that cover the change, then the workspace checks
   required by CI. UI changes: screenshots light + dark on a small Android, a large iPhone and web.
6. **Checkpoint-commit after every green state.** Sessions die; committed work survives.
7. **Open the PR** with the template (§5), evidence attached, and update `docs/status/WS-<yours>.md`.
8. **Report** using the status format (§10).

## 4. When the spec is silent or unclear

Decision ladder — stop at the first rung that answers the question:
1. A specific FR/NFR or ADR.
2. The relevant module text and the principles in `01` §5 (lower number wins).
3. Adopted reference material (`reference/README.md`).
4. Existing code patterns in the repository.
5. The most conservative option that is reversible, honest to the user and cheap to change.

Record every rung-5 decision as an **Assumption** in the PR and append it to
`docs/status/open-questions.md`. Do **not** block on it unless it is user-visible copy, legal,
security-relevant, destructive, or contradicts a principle — then stop and ask (§9).
Never edit the spec to match your implementation; propose a `spec:` PR instead.

## 5. Git and pull requests

- **Branches:** `ws/<workstream>/<ticket-id>-<slug>` (e.g. `ws/app/P1-12-today-screen`).
- **Commits:** Conventional Commits (`feat(today): …`, `fix(core): …`, `test(att): …`).
- **PR size:** one ticket per PR; aim for ≤ 400 changed lines excluding generated files,
  lockfiles, fixtures and migrations; split otherwise.
- **Never** force-push `main`, rewrite shared history, or merge your own PR. The lead merges
  (squash) after review and green CI.
- **PR template** (`.github/pull_request_template.md`):

```
## Ticket
P1-12 · FR-DASH-001, FR-DASH-002, FR-DASH-003, FR-DASH-014

## What changed
<short, factual>

## Evidence
- Tests: <commands run> → <pass/fail counts>
- Screenshots: <artifact paths> (light/dark × small Android, large iPhone, web)
- Gates/evals: <numbers, if relevant>

## Assumptions (spec silent → decision taken)
## New copy (needs Ohm's approval)
## Risks and follow-ups

## Definition of Done
- [ ] Acceptance criteria met (each FR listed above)
- [ ] Tests added/updated; FR IDs in test names
- [ ] Lint, typecheck, unit tests green; affected E2E green
- [ ] Screenshots light + dark attached (UI changes)
- [ ] Accessibility: labels, contrast, font scaling, touch targets (UI changes)
- [ ] No secrets, no PII in logs, analytics events in the dictionary only
- [ ] Docs/ADR/status updated
## Security checklist (auth, RLS, storage, AI prompts, deletion touched?)
- [ ] Ownership checks + RLS tests  - [ ] Signed URLs only  - [ ] Prompt-injection cases
```

## 6. Definition of Done (global)

A ticket is done only when **all** hold:
1. Every cited FR's acceptance criteria are met and demonstrated.
2. Tests exist at the right level (`10` §1) and are meaningful: no mocking of the unit under
   test, no snapshot-only tests for logic, no assertions on implementation details.
3. CI is green; no test is skipped, deleted or weakened.
4. UI work: screenshots light + dark on the three form factors; motion and haptics per
   `01` §10; loading/empty/error/offline states implemented.
5. Accessibility, performance budgets (`07`) and copy rules (`01` §11) respected.
6. Data work: migration + RLS + pgTAP tests in the same PR; contracts updated.
7. AI work: eval suite run and thresholds met (`10` §7); prompts versioned.
8. Docs: status log updated; ADR when a decision was made; `HOWITWORKS`-style notes for new
   subsystems (`docs/status/howitworks/<subsystem>.md`).

## 7. Quality gates are sacred

- **Never lower a threshold, skip a gate, or loosen a scorer to pass.** The RUAS extraction gate
  turned "flaky" into a fixable list once; gates that print their work are how we win.
- Golden tables (`05` §8) are immutable without a `spec:` PR.
- A test that fails for a reason you do not understand is a finding, not an obstacle: report it.
- "Works on my emulator" is not evidence; screenshots and test output are.

## 8. Hard rules and human-only actions

**Hard rules (violations are reverted and reported):**
1. **Credentials.** Never read `.env.local`, shell profiles, `~/.config`, other projects' env
   files or keychains. Use only environment variables injected by the platform's secret manager.
   Never print, log or commit secrets. Missing secret → stop and report its variable name and why.
2. **No email-sending services.** Never add, configure or call any email-sending service or API
   (standing rule from Ohm). Email-dependent features are human-gated.
3. **No Anthropic/Claude API in the product.**
4. **Stay in scope.** Work only in this repository and the services provisioned for it. The
   never-touch list in `CLAUDE.md` applies in full.
5. **No portal scraping, no messaging automation.** Never automate WhatsApp or any messaging
   app; never request or store university portal credentials.
6. **No production operations.** No prod deploys, migrations, OTA updates, data changes or store
   submissions.
7. **No fabricated data in product paths.** Fixtures are synthetic or licensed and labeled;
   seeds exist only in local/dev; never ship demo data that could be mistaken for real.
8. **No dark patterns.** Follow the voice and behavioral rules; locked copy ships verbatim.
9. **Dependencies per ADR-020:** published ≥ 7 days, license allowlist, added with the package
   manager, justified in the PR.
10. **Never modify security controls** (branch protection, CI security jobs, `minimumReleaseAge`,
    RLS) to get something to pass — escalate instead.
11. **Repository hygiene:** no venvs, `node_modules`, build outputs or derived data in git; files
    > 5 MB need lead approval (fixtures included); never build inside iCloud-synced or
    space-containing paths.
12. **Destructive operations** (dropping tables or buckets, deleting branches others use,
    history rewrites, bulk deletes) need explicit approval from the lead **and** Ohm.

**Human-only actions (agents prepare drafts, Ohm executes):**
accounts, plans and billing for every provider · adding or rotating secrets · email sender
configuration · App Store / Play Console submissions, listings, ratings, data-safety forms ·
DNS and domains · legal text, grievance officer, pricing · production deploys, migrations, OTA
releases and data operations · spend beyond configured budgets · approval of new copy, key screen
designs (onboarding, Today, Subjects, Subject detail, attendance calendar), spec changes and
gates · verifying holiday datasets · supplying real fixtures (timetables, syllabi, PYQs) with
their owners' permission.

## 9. Stop and escalate (do not improvise)

Stop work on the affected item, comment on the ticket, notify the lead, and continue with
unaffected work when:
- a requirement conflicts with `CLAUDE.md`, a principle, or another requirement;
- a secret, account, permission or paid resource is missing;
- a gate cannot be met after reasonable iteration (report numbers and options; never lower it);
- a spike fails (use its fixed fallback; propose nothing else without the lead);
- the change needs a destructive operation or substantial edits outside your ownership;
- you believe the spec is wrong (math, legal, platform constraint) → draft a `spec:` PR.

## 10. Reporting

**Progress log** `docs/status/WS-<name>.md` (append at each checkpoint):
`date · ticket · state (done / in progress / blocked) · branch · last green commit · next step`.

**Session-end report** (posted to the lead and in the PR or ticket):
```
WS: <name> · <date>
Done: <tickets + PR links>
In progress: <ticket, branch, last green commit, what remains>
Blocked: <ticket, blocker, what is needed, from whom>
Evidence: <test summaries, screenshot/eval artifact paths>
Assumptions made: <list>
Open questions for lead/Ohm: <list>
Next steps (ordered): <list>
```

## 11. Lead duties

- **Review every PR fully** against the DoD, the cited FRs, ownership, the security checklist,
  copy rules, accessibility, performance and test quality before merging. Batch feedback into
  one review round.
- **Integrate continuously:** small PRs merged daily; nightly E2E on `main`; fix-forward or
  revert quickly when `main` breaks.
- **Traceability:** maintain `docs/status/fr-coverage.md` (generated by a script that maps FR IDs
  to tests and tickets) and keep every phase FR covered before requesting a gate.
- **Weekly report to Ohm:** progress against gate criteria, risks, decisions needed, new copy
  awaiting approval, budget/cost status.
- **Guard the vision:** reject work that adds unrequested scope, weakens principles, or makes the
  daily loop slower or noisier, even if the code is good.
- **Decision hygiene:** every decision → ADR or Decision Log entry with date, owner and status.

## 12. Session continuity

Assume any session can end without warning. Before each long step: commit, push, and update the
progress log. A new session resumes from the log and the last green commit — never from memory.
