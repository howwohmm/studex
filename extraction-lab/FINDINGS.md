# Sarvam DocAI — evaluation on 3 real Indian college timetables

Date: 2026-08-13
Fixtures: `fixtures/presidency-2bes07.jpg`, `fixtures/arch-batches-thu-fri.jpg`, `fixtures/vit-slot-grid.jpg`
Ground truth: `out/groundtruth/<stem>.truth.json` (hand-transcribed, pixel-verified, permanent acceptance fixtures)
Raw provider output: `out/<stem>.<mode>.result.json`, flattened in `out/<stem>.clean.json`

Two modes tested per image:

- **digitise** — Sarvam returns layout blocks; tables come back as HTML `<table>` strings (`digitise_blocks`).
- **extract** — Sarvam returns a filled JSON schema (`extract_result`: `program`, `institution`, `period_headers[]`, `slots[]`).

---

## Headline

**No configuration clears a 90% cell-accuracy bar on a real filled timetable.** The single 100% result is `digitise` on the VIT image, and the VIT image is a blank slot-grid *template* — it contains no subjects, no rooms, no faculty, and nothing to get wrong beyond copying a clean printed grid. On the two images that are actual student schedules, the best score any mode achieved was **35%** (presidency / digitise), and one mode on one image **hallucinated an entirely different document**.

The failure that matters most is not the low number. It is that four of the six runs fail *silently*: they return well-formed, confident-looking, plausibly-shaped output that is wrong. A parser cannot tell those apart from a good result without the ground truth. A silently-wrong timetable produces a wrong attendance denominator and breaks trust invisibly — strictly worse than a failed extraction that surfaces an error.

---

## Accuracy table

Counting basis differs per fixture and the percentages are meaningless without it:

- **presidency** — `cells_in_truth = 17` counts **body cells only** (14 scheduled + 3 vertically-merged break columns). The 10 column headers and 5 day labels are scored separately in prose.
- **arch** — `cells_in_truth = 84` counts **every non-empty cell**: 2 merged Day + 2 merged Lunch + 10 Batch letters + 70 period cells.
- **vit** — `cells_in_truth = 91` counts **every non-empty cell**: 7 row labels + 23 header time cells + LUNCH + 60 day-body cells.

`correct + missing + wrong = cells_in_truth`. `fabricated` is counted on top (output cells with no truth counterpart). `span errors` is written as *broken / total merges in truth*.

| Image | Style | Mode | In truth | Correct | Missing | Wrong | Fabricated | Span errors | % correct | Verdict |
|---|---|---|---:|---:|---:|---:|---:|---:|---:|---|
| presidency-2bes07 | dense aSc grid, 7 column-merges + 3 vertical break merges | **digitise** | 17 | 6 | 3 | 8 | **2** | 9 / 10 | **35%** | unusable |
| presidency-2bes07 | " | **extract** | 17 | 2 | 15 | 0 | 0 | 2 / 10 | **12%** | unusable |
| arch-batches-thu-fri | Google-Sheets screenshot, batch rows, no header row | **digitise** | 84 | 0 | 84 | 0 | **60** | 4 / 4 | **0%** | **fabricated** |
| arch-batches-thu-fri | " | **extract** | 84 | 23 | 12 | 49 | **2** | 4 / 4 | **27%** | unusable |
| vit-slot-grid | clean printed slot template, no content | **digitise** | 91 | 91 | 0 | 0 | 0 | 1 / 1 | **100%** | usable-with-fixes |
| vit-slot-grid | " | **extract** | 91 | 47 | 24 | 20 | 0 | 1 / 1 | **52%** | unusable for schedule math |

### Caveats attached to the numbers

- **presidency / digitise "6 correct" is generous.** 4 of the 6 (Mon 3+4, Mon 7+8, Tue 1+2, Wed 1+2) are correct text at the correct *starting* column but truncated to one column because the colspan was dropped. Only **2 of 17 cells (12%) are fully clean**: Thursday period 1, and the 11:00 Break rowspan.
- **arch / extract `span_errors` was reported as 24 by the auditor; the correct value is 4.** The auditor claimed "20 multi-column period blocks lost their span". The ground truth is explicit and pixel-verified: this grid has **zero horizontal merges** — a 3-period lab is drawn as three separate bordered cells with identical repeated text. The only merges in the image are 4 vertical ones (2 Day, 2 Lunch), and all 4 are lost (`'FRI'`, `'Lunch'` and `'Academic Block'` each appear **0 times** in `extract_result`). The repeated-cell collapse is a real defect but it is *period undercounting*, not span loss — see below.
- **vit / extract "wrong" rule.** A slot is counted wrong when the time attached to it contradicts the printed theory time for the code it carries. That is columns AFT2–AFT5 × 5 days = 20 slots. This is the attendance-math hazard, not a cosmetic mismatch.
- The ground truth for arch originally stated "There are 9 [Self Study cells]" then enumerated 8. **8 is correct** and is what reconciles to the 84-cell total; the fixture records the correction.

---

## Confirmed defects, with evidence

### 1. presidency / digitise — invented a class that is not on the page (FATAL)

At **Wednesday period 4 (12:10–1:00 PM)** the image shows an empty white cell. Verified: the interior has zero ink (grayscale minimum 251/255, versus minimum 1 in the neighbouring text-bearing cell), with the left divider drawn at x≈502. Wednesday is the only weekday where periods 3 and 4 are *not* merged, which is why the blank exists.

Sarvam emitted `Qiv03 | CSE_Sakthivel | Prashanth S P` there — a hybrid of two unrelated cells. `CSE_Sakthivel` appears on the page only as a *faculty* line under CSE1006 (Mon p7, Tue p1, Thu p6), never as a subject. `Prashanth S P` appears exactly once on the whole page, as faculty on Friday p6 under CIV1008. No cell anywhere pairs them. **This is a phantom class that would appear on a student's Wednesday.**

### 2. presidency / digitise — a duplicated subject at slots that are blank (FATAL)

The image contains exactly two `CIV1008` cells: Wednesday p7 (Dayalan J) and Friday p6 (Prashanth S P). Sarvam emitted **three** — Tuesday col 7 (with Dayalan J), Wednesday col 7 (no faculty), Thursday col 5 (no faculty). At least one is an invented occurrence at a slot that is empty on the page. Two of the three also drop the faculty line, breaking the 3-line room/subject/faculty cell contract.

### 3. presidency / digitise — every colspan dropped, columns left-pack (FATAL)

The timetable has 10 period columns and exactly 7 two-period horizontal merges (Mon 3+4, Mon 7+8, Tue 1+2, Tue 3+4, Wed 1+2, Thu 3+4, Fri 3+4). **The output HTML contains zero `colspan` attributes.** Each merge collapsed to one `<td>`, remaining content left-packed, and trailing empty `<td>`s padded each row back to width 11 — so the row still *looks* structurally valid while the period indices have shifted.

Concretely, Tuesday: `DivL04|MAT1003|PUNIV01748 / Jayarama` lands at column 2 (period 2) instead of period 3; `ENG2001|Pushpraj Singh` lands at period 3 instead of period 6; `ECE2007|Gowri K` lands at period 4 instead of period 7. A parser that reads period from column index gets a wrong time for every one of them, with no error raised.

### 4. presidency / digitise — one-day row drift; Friday emitted empty (MAJOR)

From Wednesday onward, content is shifted up one day: Wed p7 (CIV1008/Dayalan J) is emitted inside the Tuesday row; Thu 3+4 (PPS1012/Manni Garg) inside Wednesday; Fri 3+4 (MEC1006/Ramachandra C G) inside Thursday. The **Friday row is emitted as 10 empty `<td>`s** despite the image showing two occupied Friday cells. A student would see Friday as a free day.

### 5. presidency / digitise — break-column vertical merges mangled (MAJOR)

Of the 3 five-row break merges, one arrived intact (11:00 Break, `rowspan="5"`). The **Lunch Break** column split into three separate `rowspan=1` cells all labelled `"Break"` (wrong label *and* wrong structure), sitting in the Tue/Wed/Thu rows only. The **2:50 Break** column is absent from all five rows entirely.

### 6. presidency / extract — generation stopped after two slots (FATAL)

`extract_result.slots` contains **exactly 2 entries, both `day: "Monday"`.** No Tuesday, Wednesday, Thursday or Friday object exists anywhere. 12 scheduled cells are simply gone. The JSON file is valid and fully closed — this is not byte truncation, and `digitise_blocks` in the same response *does* contain Tue–Fri text. The loss happened in the structuring step, not in OCR. Most likely an output-token cap or an early stop.

Both Monday slots that did arrive are verifiably correct (`LFL03/ECE2007/PUNIV01973 / PUNIV01955`, `LGL01/CSE1006/CSE_Sakthivel`), but both had their 2-period merges truncated to one period — so even the captured data reports Monday 12:10–1:00 PM and 4:00–5:00 PM as free when they are occupied.

**Note the asymmetry: extract fails quiet (zero fabrication, just stops), digitise fails silent-and-wrong (invents a class, scrambles columns).** By the "silently wrong is worse" criterion, digitise is the more dangerous failure here despite scoring higher.

### 7. arch / digitise — wholesale hallucination of a different document (FATAL)

The image is an architecture batch timetable: 10 rows × 10 columns, Thursday and Friday batches A–E. Sarvam returned a **6-column × 9-row table about Indian driving-licence fees**, with row labels `DRIVING`, `Driving License (in Samarthan)`, `Driving Test Fee (Rs., Lakhs in Crore)*`, `FP Workshop-Accident Block-I/II`; column headers `A (Mr./Mrs/Miss/Ms.)`, `B (Dr./Prof. Librarian)`, `C (Mr./Mrs) (M.K. Kulkarni)`; and a `<tfoot>` reading `TOTAL DRIVING FEE FOR ALL CLASSES OF DRIVERS IN INDIA`.

This is hallucination over *this* image, not a wrong-document mixup — the provenance is traceable pixel by pixel:

| On the page | In the output |
|---|---|
| `24.08.2023` (the Thursday date) | `₹ 24,08,203` |
| `25.08.2023` (the Friday date) | `₹ 25,21,967` |
| `Academic Block-I/II` | `Accident Block-I/II` |
| `Mr. Jayesh Sarmalkar` | the place-name `Samarthan` |
| `Mr. Nitin Kulkarni` | `(M.K. Kulkarni)` |
| room numbers 301 / 303 / 313 / 338 | `33`, `33:1` |
| footnote `* ATTENDANCE IS MANDATORY FOR ALL SESSIONS…` | `TOTAL DRIVING FEE FOR ALL CLASSES OF DRIVERS IN INDIA` |

It also invented a `<thead>` header row, which **cannot exist** — the image is a crop whose top edge sits on the table's own top border, so no header is visible anywhere. The only string shared with the image, `FP Workshop`, appears as an invented *row label*, not as cell content.

Not one truth cell survives, so there is no cell-to-cell mapping to score: every truth cell is MISSING, every output cell is FABRICATED, and `cells_wrong = 0` legitimately. `bbox` is a single block covering the whole 1080×789 image — no per-cell or per-row geometry, so nothing can be re-anchored or salvaged. **Nothing here is parseable and nothing is recoverable by post-processing.**

### 8. arch / extract — both grid axes collapsed (FATAL)

- **Day collapse.** `day == "THURS"` on all 24 slots. The string `FRI` / `FRIDAY` appears **zero times** in `extract_result`. The entire Friday half (35 period cells) is attributed to Thursday, where it collides with the real Thursday rows.
- **Period axis does not exist.** `period_labels` holds the *batch letter* (`"A"`…`"E"`) and `batch` is `null` on all 24 slots. The strings `P1`…`P7` appear zero times, and `period_headers` is an empty array. There is no time or period identity on any slot, so none of the 70 period cells is placeable in time. A schedule cannot be derived from this output at all.
- **Period undercounting.** 24 slots were emitted where the image has 27 distinct subject blocks — and each block collapses 1–6 identical adjacent cells into one entry with no span. This is exactly the failure the fixture warns about: a 3-period lab drawn as three separate identical cells becomes one slot of unknown length. Attendance math on this is off by a factor of up to 6.

### 9. arch / extract — location data replaced with borrowed room numbers (FATAL, silent)

`FP Workshop` appears **0 times** in `extract_result`. `Academic Block` appears **0 times**. `Room No.` appears 0 times.

The four FP Workshop locations were either dropped or backfilled with a room number borrowed from a *neighbouring* cell. The clearest case: Thursday batch D (sheet row 25) P1–P3 is `Material Studies / ( Mr. Jayesh Sarmalkar) / FP Workshop` — **no room**. Sarvam reports `room: "313"`. Room 313 is the *Drawing* room from the adjacent block in the same row (P4–P6, Mr. Niteen Rangdal). Friday batch D (row 30) gets the same treatment with `room: "303"` where the page says FP Workshop.

This is the worst class of error in the whole eval: a well-formed room number that will send a student to the wrong building, with nothing in the output to indicate uncertainty.

Also confirmed in the same output: `Digital Design & Communication` truncated to `Communication` (row 26 P4–P7), and `Ms. Shweta Rangnekar` misspelled `Ms. Shweta Rangarnekar` — both silent, both plausible-looking.

### 10. vit / digitise — perfect text, two structural quirks (usable-with-fixes)

All 91 non-empty cells are transcribed exactly, including every trap the fixture plants:

- the leading-zero inconsistency between rows (`8:00 AM` in THEORY vs `08:00 AM` in LAB) preserved verbatim;
- the anomalous 9-minute theory period `6:51 PM to 7:00 PM` reproduced, not "corrected";
- the single genuinely empty cell (THEORY / MOR6) emitted as an empty `<th></th>`;
- every multi-letter code intact — `TAA1`, `TBB2`, `TCC2`, `TDD2`, `V1`, `V2`;
- all 60 day-body cells and all 10 lab-only cells (`L6`…`L60`) present.

Two things a parser must handle, both deterministic:

1. **The grid is returned as two separate `<table>` blocks** split at the LUNCH column — block 1 = ROW_LABEL + MOR1–MOR6, block 3 = AFT1–AFT6 with **no day-label column**. They must be re-joined by row index (the row order is identical and stable; bboxes confirm the split at x≈691/716).
2. **LUNCH arrives as an out-of-table `sidebar` block** with text `"L\nU\nN\nC\nH"`, not as a `rowspan="7"` cell. Text is right; structure is not. That is the 1 span error.

### 11. vit / extract — 20 slots carry the wrong time (FATAL, silent)

Every day cell in this grid holds **two** codes with **two different real times** — a theory code (`A2`) and a lab code (`L31`) — because the theory and lab header rows have different ranges. `extract_result` flattens each cell to one slot with one time, and it picks inconsistently: **morning columns get THEORY times, afternoon columns get LAB times.**

The result: `MON / F2 / 2:51 PM to 3:40 PM`. `F2` is a theory code and the printed theory time for that column is **3:00 PM to 3:50 PM**. Off by 9 minutes at the start and 10 at the end, silently, on **20 slots** (columns AFT2–AFT5 × 5 days). AFT1 escapes only by coincidence — theory and lab both read 2:00–2:50 there.

Compounding:

- **All 10 lab-only cells dropped.** `L6, L12, L18, L24, L30, L36, L42, L48, L54, L60` produce no slot — 50 slots emitted against 60 body cells.
- **Lab codes misfiled as rooms.** Every slot carries `room: "L1"`, `room: "L31"`, etc. There are no rooms in this image at all; `L31` is a lab *slot code*. A downstream app would print a room that does not exist.
- **`period_headers` merged the two header rows into one 12-entry list**, so the theory/lab distinction that gives the grid its meaning is destroyed in the output.
- `program` and `institution` are both `null`; `THEORY HOURS`, `LAB HOURS` and `LUNCH` are absent.

Worth stating plainly: this image is a **blank slot template**, not a filled schedule. There are no subjects, rooms or faculty on it. `extract` reporting `subject_code: "A1"` and `room: "L1"` is a schema misassignment, not extraction of real data.

---

## Which mode won on which timetable style

| Style | Winner | Margin | Honest read |
|---|---|---|---|
| **Clean printed slot template** (vit) — crisp borders, no merges except one vertical, uniform short cells | **digitise** | 100% vs 52% | Outright win. digitise is essentially perfect; extract actively damages the data by flattening two header rows into one and attaching the wrong times. |
| **Spreadsheet screenshot** (arch) — screen-rendered, no header row, repeated identical cells, batch rows | **extract** | 27% vs 0% | "Wins" only because digitise produced the single worst result in the eval. extract is still unusable: no period axis, all of Friday relabelled Thursday, FP Workshop and Academic Block gone, a fabricated room number. |
| **Dense merged print grid** (presidency) — aSc-generated, 7 colspans, 3 rowspans, 3-line cells | **neither** | 35% vs 12% | digitise scores higher but fails *dangerously* (invented class, drifted rows, scrambled columns). extract fails *safely* (stops after 2 slots, zero fabrication). If forced to pick one to build on, extract's failure mode is the one you can detect. |

Cross-cutting: **digitise has clearly better character-level OCR.** On presidency it got every hard glyph right — the lowercase `i` in `Qiv03` and `DivL04`, the one-character-apart room codes `LFL03` / `LGL03` / `LGL01`, the literal underscore in `CSE_Sakthivel`, and both `PUNIV##### / PUNIV#####` faculty pairs. Its failure is **entirely table geometry**, not reading. `extract` never fabricates characters but loses whole rows, whole axes, and whole fields.

---

## Does anything clear a 90% cell-accuracy bar?

**No — not on any real timetable.**

- Only one of six runs clears 90%: `digitise` on vit, at 100%. That image is a blank template with no schedule content, so it tests OCR and grid-following and nothing else.
- On the two images that are real student schedules, the ceiling is **35%** and **27%**.
- Combining modes does not help. The failures are not complementary — they overlap on the axis that matters. On presidency, digitise loses column identity *and* extract loses 88% of rows; there is no cell where one mode's confidence could repair the other. On arch, digitise output is fiction, so there is nothing to cross-check extract against.
- The lab's inherited gate is stricter than a 90% cell bar: **keyF1 ≥ 0.90 with zero wrong batches.** arch/extract alone produces 35 slots on the wrong day and zero batch identity (`batch` is `null` on every slot while `period_labels` holds the batch letter). That is an automatic gate failure on the batch criterion regardless of the cell score.

---

## Failure modes a downstream parser must handle

Ordered by how much damage they do while looking correct:

1. **Fabricated cells that pass every shape check.** A hybrid class built from two unrelated cells (presidency/digitise), a room number borrowed from the cell next door (arch/extract). Both are well-formed, plausible, and undetectable without ground truth.
2. **Whole-document hallucination.** An entirely different table returned with a confident structure, a `<thead>` that cannot exist, and traceable pixel-to-nonsense mangling (arch/digitise). A validator must reject on *domain plausibility*, not just on well-formedness — no timetable contains `₹ 24,08,203`.
3. **Dropped colspans with left-packing.** Rows still come back at the correct width because trailing empty `<td>`s pad them, so shape validation passes while every period index after the first merge is shifted left (presidency/digitise). Never derive period from column index without verifying the row's `colspan` sum equals the header width.
4. **Wrong time attached to a correct code.** Two header rows with different ranges, and the extractor picks one inconsistently per half of the grid (vit/extract, 20 slots). Cell text is right; the schedule is wrong.
5. **Axis collapse.** All days flattened to one (`THURS` × 24), or the period axis replaced by the batch axis (arch/extract). Assert on distinct-day count and on period identity before ingesting anything.
6. **Silent truncation of generation.** Valid, fully-closed JSON containing only 2 of 14 slots (presidency/extract). Never treat parseable JSON as complete — assert expected row/day coverage against the grid the digitise pass saw.
7. **Repeated-cell collapse → period undercount.** Three identical adjacent cells become one slot with no span (arch/extract). Duration must come from geometry, never from de-duplicated text.
8. **Row drift.** Content shifted one day up from the middle of the table onward, leaving the last day empty (presidency/digitise). A fully empty weekday should be treated as suspicious, not as a free day.
9. **Vertical merges arriving as loose blocks.** LUNCH as an out-of-table `sidebar` (vit/digitise); break columns split into 3 mislabelled cells or dropped (presidency/digitise). Break columns must be reconstructed from the header, not from the body.
10. **Field-semantics drift.** Lab codes filed as `room` (vit/extract, 50/50 slots), batch letters filed as `period_labels` (arch/extract, 24/24). Every field needs a domain check, not just a type check.
11. **Quiet field loss.** Faculty line dropped on 2 cells (presidency/digitise); `FP Workshop`, `Academic Block-I/II`, `Room No.` all reduced to zero occurrences (arch/extract). Location is not optional data.

---

## Recommendation

**Sarvam DocAI cannot be the primary extractor for StudEx — not in `digitise`, not in `extract`, not with both together.**

Reasoning:

- On the only two fixtures that are real filled timetables, both modes are unusable and one is actively fabricating. The single 100% result is on a blank template and does not generalise.
- The two modes do not compensate for each other. `digitise` reads characters well but destroys table geometry and, on one image, invented a whole document. `extract` never invents characters but drops rows, collapses axes, misfiles fields, and stops generating mid-output. There is no merge strategy that repairs one with the other, because on every fixture at least one of the two produced output with no trustworthy anchor.
- The dangerous failures are silent. Four of the six runs return output that would parse cleanly and populate the app with wrong data. For an attendance product, that is worse than a hard failure — the user finds out weeks later, from a wrong percentage.

**What Sarvam *is* good for: OCR text supply.** Its character-level reading on the dense print grid was genuinely strong — the lowercase-`i` room codes, the three near-identical room codes, the underscore in a faculty label, the staff-ID pairs, and on VIT every leading-zero quirk and the anomalous 9-minute period, all verbatim. That is the hard part of OCR and it did it.

So the defensible role is: **use Sarvam as a text/OCR layer feeding a geometry engine we own** — detect grid lines and cell boxes ourselves (ML Kit blocks + a coordinate-based grid inferencer, or ruling-line detection), assign every text run to a cell by coordinates, and derive periods and spans from geometry. This is precisely the July lesson already written into the README: *geometry first, generation only as refiner.* This eval is that lesson repeating.

Concrete next steps, in order:

1. **Build the geometry-first inferencer** and re-score against these three fixtures plus `ruas-cse-sem4`. Ground truth is now locked in `out/groundtruth/`.
2. **Add a rejection layer before any ingest**, asserting: distinct-day count matches the grid; every row's `colspan` sum equals the header width; no fully-empty weekday when other days are populated; no room string that does not match a room pattern seen elsewhere in the same document; slot count within tolerance of the cell count the geometry pass found. Any failure → surface a confirm-screen to the student, never write silently.
3. **Diagnose the presidency/extract early stop** (output-token cap vs early stop). Its header extraction and per-cell fidelity were already at gate quality; if recall is the only bug, `extract` becomes worth re-testing as a refiner. That is currently the cheapest possible upside in the whole eval.
4. **Do not run `digitise` on spreadsheet screenshots at all** until there is a rejection layer. arch/digitise is the proof case: confident, well-formed, 100% fiction.
