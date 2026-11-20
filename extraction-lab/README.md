# extraction-lab

Track 1 of the rebuild: lock the timetable OCR + extraction pipeline **before** it
touches the app. Every candidate provider gets the same job — turn
`fixtures/ruas-cse-sem4.jpg` (a real RUAS B.Tech timetable photo) into structured slots —
and gets scored against `fixtures/ruas-cse-sem4.groundtruth.json`.

**Gate (inherited from the July build, non-negotiable): keyF1 ≥ 0.90, zero wrong
batches.** A silently-wrong batch = wrong denominator = broken trust. The scorer must
print its MATCH / MISS / SPURIOUS table — a gate that shows its work turns "flaky" into
a fixable list.

## Candidates to test (no Anthropic API — budget gone)

| Adapter | What | Cost | Notes |
|---|---|---|---|
| `mlkit` | Google ML Kit Text Recognition, on-device | free | text blocks + bounding boxes, NO table structure — needs a coordinate-based grid inferencer; needs a dev build to test on-device (can't run in this lab standalone — test via the app) |
| `cloudflare` | Cloudflare Workers AI `toMarkdown` (image/PDF → markdown) | free tier | Ohm tested it — "lightspeed". Markdown tables parse trivially IF the grid survives conversion |
| `sarvam` | Sarvam AI vision/parse APIs | cheap, Indian | Ohm to get a key into `.env.local` himself |
| combos | e.g. cloudflare toMarkdown + sarvam cleanup of low-confidence cells | | the July lesson: geometry first, generation only as refiner |

## What the timetable throws at you (from the July build's real-world findings)

Saturday classes exist · labs span 2–3 merged columns (a merged cell IS a 150-min lab) ·
batch-tagged slots (Batch 1/Batch 2 — attendance must count only the student's batch) ·
"Contact Hour" cells (excluded from % by default) · electives with split rooms
`D-306 (B1) / D-404 (B2)` · same subject twice in one day · no end date printed.

## Structure

- `fixtures/` — the RUAS photo + ground truth (more timetables welcome; add friends' ones)
- `adapters/` — one file per provider, all returning the same `ExtractedSlot[]` shape
- `score.ts` — keyF1 scorer (port the matching rules from
  `~/projects/studex-hub/studex-vault/00-canonical/studex-ios/specs/briefs/extract.md` §7)
- `run.ts` — `npx tsx run.ts <adapter> <image>` → prints the score table

Keys live in `.env.local` (Ohm-managed, never read by Claude, gitignored).
