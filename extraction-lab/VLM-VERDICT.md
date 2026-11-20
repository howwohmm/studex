# VLM vs OCR+reconstruction: verdict

**Question:** should StudEx hand timetable extraction to an AI model directly, or keep OCR +
deterministic reconstruction with the model only for cleanup?

**Answer:** give the model the **pixels**, not the OCR text. But the experiment that says so is
weaker than its own numbers look, and the numbers below are not the numbers you can ship. Read
§6 before §5.

Date: 2026-08-13. Fixtures: `presidency-2bes07`, `arch-batches-thu-fri`, `vit-slot-grid`.

---

## 0. The scorer was broken on two of three fixtures. I fixed it. Read this first.

The task said: the CONTROL-perfect run must score 100/100/100, and if it does not, say the scorer
is broken rather than reporting numbers.

**The CONTROL passed.** It also proved almost nothing, because `CONTROL-perfect` only exists for
`presidency-2bes07`. It certifies the scorer on that one fixture. Both other fixtures were
producing garbage, and the control had no way to catch it.

What `score_slots.py` actually reported:

| fixture | what it printed | why it is wrong |
|---|---|---|
| presidency-2bes07 | every arm 100/100/100 | over-lenient period test (see below) |
| arch-batches-thu-fri | **0 truth class slots**, all arms 0/0/0, 29 "hallucinations" | truth rows are spreadsheet row numbers `"22".."31"`; `norm_day()` maps every one to `"?"` and discards all 84 truth cells |
| vit-slot-grid | 91 truth slots, all arms 65.9% recall / **0.0% placement** | truth was never filtered to day rows, so 13 THEORY HOURS + 13 LAB HOURS + 5 ROW_LABEL cells were counted as classes (91 vs the real 60 — and 60/91 = 65.9%, i.e. the arms found *exactly* the real slots and were penalised for not inventing header cells). Placement is 0.0% by construction: truth columns are `MOR1..AFT6`, arms emit `"1".."12"`, and `norm_period()` can never intersect them |

Three engines scoring identically at 0.0% placement while scoring 65.9% on days is not a
measurement, it is a division by the wrong denominator.

**Third defect, the one that actually mattered.** Even on presidency, the period test is
`bool(truth_periods & got_periods)` — *any* overlap passes. A 2-period merged cell reported as a
single period scores as fully correct. That is the entire reason `C-text-only` printed 100%
placement.

**Fix:** `score_slots_strict.py` (new file, `score_slots.py` left untouched as the record of what
was shipped). It expands every slot to one tuple per **(row, period) cell**, so the merge-vs-split
convention disagreement that all three extraction agents flagged in their self-assessments
disappears — a merged slot `["3","4"]` and two separate single-period cells both expand to the
same two cells. Placement then requires the exact cell, not an overlap. `CONTROL-perfect` still
passes 21/21 under it.

Everything below uses the strict scorer.

---

## 1. Three-arm scores (strict, per-cell)

Arms: **A** = image only, VLM alone (r1–r4 are repeat runs). **B** = hybrid, Apple Vision geometry
+ VLM semantics. **C** = OCR text stream only, no geometry.

### presidency-2bes07 — 21 class cells (14 slots, 7 of them 2-period merges)

| run | recall | day acc | **placement** |
|---|---|---|---|
| A-image-only-r1 | 100.0% | 100.0% | **100.0%** (21/21) |
| A-image-only-r2 | 100.0% | 100.0% | **100.0%** |
| A-image-only-r3 | 100.0% | 100.0% | **100.0%** |
| A-image-only-r4 | 100.0% | 100.0% | **100.0%** |
| B-hybrid-vision-ir | 100.0% | 100.0% | **100.0%** |
| C-text-only | 100.0% | 100.0% | **85.7%** (18/21) |
| CONTROL-perfect | 100.0% | 100.0% | 100.0% |

C's 3 lost cells are all the same error: a 2-period merged cell reported as 1 period.
Monday CSE1006 `["7","8"]`→`["8"]`, Thursday PPS1012 `["3","4"]`→`["4"]`, Friday MEC1006
`["3","4"]`→`["4"]`. C's own self-assessment named Monday CSE1006 as its single least-confident
cell. It was right.

### arch-batches-thu-fri — 70 class cells (10 batch rows × 7 periods)

| run | recall | row acc | **placement** | spurious cells |
|---|---|---|---|---|
| A-image-only-r1 | 100.0% | 100.0% | **100.0%** (70/70) | 0 |
| B-hybrid-vision-ir | 100.0% | 100.0% | **100.0%** | 0 |
| C-text-only | 100.0% | 88.6% | **84.3%** (59/70) | 11 |

Note: the arms emit **no batch field at all** — five different batch rows all just say "Thursday".
Batch identity had to be reconstructed from slot order (a new batch row begins each time periods
restart at 1). That is the most generous reading available to the arms, and it is a reconstruction,
not a measurement. It also flags a real contract bug: the slot schema cannot express a
batch-partitioned timetable.

### vit-slot-grid — 60 class cells (5 days × 12 periods, no merges)

| run | recall | day acc | **placement** |
|---|---|---|---|
| A-image-only-r1 | 100.0% | 100.0% | **100.0%** |
| B-hybrid-vision-ir | 100.0% | 100.0% | **100.0%** |
| C-text-only | 100.0% | 100.0% | **100.0%** |

Every cell here is an unmerged 1×1 holding a short code (`A1 / L1`). This is the easy fixture, and
text-only ties. That is the finding, not a footnote: **geometry only earns its keep where cells
merge.**

### Aggregate — 151 cells

| arm | placement |
|---|---|
| A (image only) | **151/151 = 100.0%** |
| B (hybrid) | **151/151 = 100.0%** |
| C (text only) | **137/151 = 90.7%** |

---

## 2. Consistency across the four repeat runs

A model that is right 70% of the time at random cannot be shipped. So: what varied across r1–r4?

**Placement: perfectly stable.** All four runs produced identical 21/21 cell placements. Zero
variance on the thing that matters most.

**Text: not stable.** Diffing all fields across r1–r4:

- `A-image-only-r2` wrote the room as **`QIv03`** (capital I) where r1, r3, r4, B and C all wrote
  **`Qiv03`** (lowercase i).
- That token appears in **9 of 14 slots**. One run in four got 9 room fields "wrong".
- Every other field — subject, faculty, day, periods — was byte-identical across all four runs.

So the variance is concentrated entirely in one ambiguous glyph, and it is a **1-in-4 flip rate**
on it. I checked the pixels myself rather than trusting either side (crop of the Wednesday P1–2
cell at 8×, and the `DivL04` cell for comparison): **the second glyph is a full-height dotless bar
in both cells.** At ~8px type in a JPEG, the dot on a lowercase `i` is one pixel and may simply not
have survived compression — so `Qiv03` is plausible, and so is `QIv03`, and the image does not
settle it. r2 was not marked wrong by reality. It was marked wrong by disagreeing with a
transcription made by the same model family. See §6.

**Read this correctly:** structure was deterministic, transcription was not. Those need different
defences. Repeated sampling fixes glyphs. It does not test structure, because structure never
varied.

---

## 3. Against the OCR engines already measured

Presidency day-placement, 14 class slots:

| engine | day placement | notes |
|---|---|---|
| **A / B (VLM, image)** | **14/14** | and 21/21 on full period placement |
| apple-vision | 14/14 | hand-verified; day only, never scored on period spans |
| **C (VLM on OCR text)** | **14/14** | but only 18/21 on period cells |
| paddlemobile | 7/14 | |
| rapidai-table | 7/14 | |
| rapidtable | 5/14 | |
| surya | 4/14 | |
| sarvam-digitise | 4/14 | |
| dots.ocr | 2/14 | **topped text-F1 at 83.2%** |
| granitedocling | 2/14 | |
| tesseract | 0/14 | |

Two things to take from this table.

**dots.ocr is the whole argument.** Best text extraction in the lab, 2/14 on placement. Text
accuracy and placement accuracy are close to uncorrelated on this task. Any evaluation that reports
text F1 is measuring the wrong thing.

**Apple Vision ties the VLM on days but was never tested on spans.** Its 14/14 is day-placement,
hand-verified. Nobody has shown it can resolve a merged 2-period cell. The three arms differ
*only* on span width and row assignment — precisely the axis on which Apple Vision has no score.
Do not read "apple-vision 14/14" as "apple-vision solves this".

---

## 4. Cost per extraction (INR)

| option | ₹/extraction | ₹/1,000 | table evidence | verdict |
|---|---|---|---|---|
| Apple Vision / ML Kit on-device | **0** | 0 | 14/14 day, spans untested | free, iOS-only for Vision |
| Gemini 2.5 Flash-Lite — free tier | **0** | 0 | none published | **free tier content is "used to improve our products"** |
| Qwen3.7-Flash (OpenRouter) | 0.0144 | 14 | **none** | cheapest in the study, zero evidence |
| Amazon Nova Lite | 0.0258 | 26 | **none** | cheapest with a no-train guarantee; token estimate unverified |
| **Gemini 2.5 Flash-Lite — paid, batch** | **0.021** | **21** | none for Flash-Lite | if extraction can be async |
| **Gemini 2.5 Flash-Lite — paid, Tier 1** | **0.0423** | **42** | none for Flash-Lite | **recommended default** |
| GPT-5-nano | 0.0435 | 44 | GPT-5.2 = 86.6 OmniDocBench | 2.46× image-token multiplier hurts this workload |
| Qwen3-VL-32B | 0.0473 | 47 | 235B = 88.9–89.2, best-evidenced open | strongest non-Google option |
| Qwen3-VL-235B | 0.1183 | 118 | 88.90–89.15 | matches Gemini-3 Pro at 1/10 the price |
| Gemini 3.1 Flash-Lite | 0.1439 | 144 | none | sensible next-gen upgrade |
| Gemini 2.5 Flash | 0.2261 | 226 | none | 5× Flash-Lite, 4× tighter free RPD |
| Mistral OCR 3 | 0.19/page | 190 | **olmOCR Tables 60.6** | disqualified — worse than free local models |
| Gemini 3.1 Pro | 1.1511 | 1,151 | 89.2–90.3, best frontier general VLM | 27× Flash-Lite; fallback only |

**Per student.** A timetable is extracted roughly **once per semester**. Budget 3 self-consistency
calls + 1 retry = 4 calls on paid Flash-Lite:

> **≈ ₹0.17 per student per semester.** 10,000 students = **₹1,700 a semester.**

Cost is not a constraint on this decision and should not be allowed to shape it. The ₹42/1,000 paid
tier over the ₹0 free tier buys the contractual *"not used to improve our products"* guarantee.
These are student timetables — identifiable to a college, a batch, and named faculty. Pay the ₹42.

Note the awkward shape of that table: **the cheapest options have no table-structure evidence at
all, and the options with evidence were not the ones tested here.** Nothing in this lab tested
Flash-Lite. §6.

---

## 5. Recommended architecture

**Do not build the OCR + deterministic reconstruction pipeline.** That is arm C, and it is the arm
that lost — 90.7% placement against 100%, and it lost in the way that hurts most (§5.1).

**Do not add an OCR geometry sidecar to the VLM either.** Arm B was supposed to test that and did
not: **B's output is content-identical to A's on all three fixtures** (byte-identical files on
presidency and vit; slot-for-slot identical on arch). B's own self-assessment explains why — the
Apple Vision IR's column indices were wrong on most merged cells, three of them straddling Break
columns, which is structurally impossible, so B discarded the IR and re-derived everything from the
image. B did not tie A. **B collapsed into A.**

### The pipeline

1. **Client (Expo)** — capture, crop, deskew, downscale to ~1080px longest edge (the fixture
   resolution the arms succeeded at), reject blurry/cropped frames before spending anything.
2. **On-device OCR — ML Kit Text Recognition** (Android + iOS, free, on-device; Apple Vision on
   iOS if you want the better engine). Use it for **two things only**: a pre-flight "is this a
   timetable" gate, and a **token bag for hallucination checking**. Do *not* use it for geometry.
   ML Kit is the cross-platform answer — Apple Vision cannot be your primary path in an Expo app.
3. **Server — one call to Gemini 2.5 Flash-Lite (paid tier) with the image**, under a strict JSON
   schema that forces **one object per (day, period) cell**. Do not let the model emit a `periods`
   array. Every span error C made was hidden inside a `periods` array; per-cell output makes span
   errors visible instead of silent.
4. **Self-consistency, 3 samples.** Cells where samples disagree are flagged, not guessed. Cost
   stays ≈₹0.13. This is aimed squarely at the r2 finding — glyph transcription is where the
   variance actually lives.
5. **Cross-check against the OCR token bag.** Any subject/room token the VLM emitted that ML Kit
   never saw anywhere on the page is a hallucination candidate. This is the one job OCR is
   genuinely good at here, and it is cheap.
6. **Structural invariants, enforced in code, not prompt.** No class in a Break/Lunch column; no
   two classes in the same (row, period); period labels read from the printed header, never
   inferred by counting columns (the presidency header skips period 5 — anything counting columns
   silently shifts 6/7/8).
7. **A confirmation screen the student cannot skip.** Render the reconstructed grid over their
   photo, flagged cells highlighted, tap to fix. **This is the actual reliability mechanism.**
   Everything above it just reduces how many taps are needed.
8. **Keep the source image and a pipeline version stamp** so every timetable can be re-extracted
   when the models improve. They will.

Escalation: if ≥2 cells stay flagged after self-consistency, retry once on Gemini 3.1 Flash-Lite
(₹144/1,000). At this volume the escalation tier is free in practice.

**Before shipping any of it:** run Flash-Lite single-shot against all three fixtures with
`score_slots_strict.py`. Nothing in this lab has tested the model you would actually deploy.

### 5.1 Why text-only losing 9.3% is worse than 9.3% sounds

C's arch failure is not noise, it is **row drift**, and it is product-lethal. All 11 errors are one
contiguous confusion between Thursday batch A and batch B:

```
truth   Thu-A p4,5,6 = Material Studies (FP Workshop)      C said  Drawing
truth   Thu-A p7     = Self Study                          C said  Drawing
truth   Thu-B p1,2,3 = Digital Design & Communication      C said  Material Studies
truth   Thu-B p4..7  = Drawing                             C said  Self Study / DD&C
```

C's **recall was 100%** — it read every subject correctly. It put them in the wrong students' rows.
A batch-A student is sent to a Drawing studio when their class is in the FP Workshop, and the app
tells them so in clean, confident, correctly-formatted JSON. There is no visible defect for the
student to catch.

This is the exact failure the literature names: row retrieval is the weak axis (NGTR finds row
accuracy consistently below column accuracy for both GPT-4o and Gemini, because rows are
near-identical entities while columns carry distinguishing semantics). Losing 2D adjacency — which
is precisely what "OCR text stream, no geometry" means — attacks the axis that is already weakest.

---

## 6. What is wrong with this experiment

Blunt version: **the scores in §1 are real, and they do not support shipping a VLM unsupervised.**

### 6.1 The biggest weakness: this measured an agent, not an API call

Arms A and B were **agentic extractions**, not single-shot inferences. From the agents' own
self-assessments: **420–540 seconds each**, iteratively cropping individual day rows, inspecting
cell dividers at **2× to 16× zoom**, computing pixel column boundaries by hand
(`x158, then ~85px per column`), cross-checking glyphs side by side across cells.

The cost table prices a **single-shot call to Gemini 2.5 Flash-Lite at ₹0.0423**.

These are not the same act, and one does not predict the other. What was measured is *"can a
frontier model, given unlimited time and arbitrary zoom, read this grid"* — the answer is yes,
100%. What must be known is *"can a cheap model read it in one pass"* — **untested, on every
fixture, for every candidate model in §4.**

External evidence says do not extrapolate. On PulseBench-Tab, excluding the benchmark author's own
model, the best system (Gemini 3.1, a general VLM) reproduces a table **perfectly only 28.6% of the
time**. Three fixtures at 100% is not consistent with that prior — it is explained by the agentic
loop, and possibly by §6.2. Any plan that reads §1 as "VLMs get 100%" and skips the confirmation
screen is the confident-wrongness failure this lab exists to prevent.

### 6.2 Circularity: the ground truth was written by the same model family as arms A and B

**This is real and it is exactly as bad as it sounds in one place, and not bad at all in another.**

**Where it bites — text fields.** The clearest case is the `Qiv03` room string, in 9 of 14
presidency slots. Truth says `Qiv03`. A-r1/r3/r4, B and C say `Qiv03`. A-r2 says `QIv03` and is
scored wrong. I cropped the pixels rather than take either side: the glyph is a **full-height
dotless bar**, identical to the same glyph in `DivL04`. It is genuinely unresolvable at this
resolution. So the "correct" answer for the hardest character in the fixture is *the answer the
same model family happened to choose*, and r2 was penalised for a disagreement the image does not
adjudicate. **Every text-field score here is inflated by an unknown amount.** Room and faculty
strings should be treated as unvalidated.

**Where it does not bite — day placement.** Day placement was independently corroborated by
apple-vision at 14/14, hand-verified, by a different engine on a different architecture. The arms'
100% day accuracy stands.

**Where it partly holds — span widths.** The presidency truth records *verified grid line
positions* (column boundaries at x = 63, 158, 244, 330, 415, 502, 586, 673, 758, 845, 930, 1016).
Those are geometric measurements, not transcription judgments, and span width follows from them.
That makes span-width truth substantially better grounded than room-string truth — but it was still
measured by the same family, and no second engine confirmed it.

**Net:** trust the placement numbers more than the text numbers. Trust neither as a production
estimate, for the reason in §6.1.

### 6.3 Arm B is not an independent arm

B is content-identical to A on all three fixtures (§5). The hybrid arm never actually ran as a
hybrid — it saw the Vision IR, judged it wrong, and threw it away. (Byte-identical files are also
consistent with a harness artifact — the same output written twice — which would be worse, not
better; B's self-assessment describes genuine convergence, but this was not verified. Either way
B carries no independent evidence.) So **"does OCR geometry help?"
has not been answered by a clean experiment.** What is known is only that *this* IR, on *these*
fixtures, was wrong on merged cells and contributed nothing. A different geometry source could
still help. n=1 pipeline, not a law.

### 6.4 Smaller, still real

- **n = 3 fixtures, 151 cells.** One institution's layout each. No handwriting, no photographed
  paper, no rotation, no glare — all three are clean digital screenshots. Real student uploads are
  phone photos of a projector screen or a noticeboard, which is a materially harder distribution
  and is entirely unrepresented.
- **Only presidency has repeat runs.** Consistency (§2) is measured on one fixture, the smallest.
- **The slot schema cannot represent batch-partitioned timetables** (arch). Batch identity had to
  be reconstructed from output ordering. Fix the contract before trusting any arch number.
- **`score_slots.py` was broken for two of three fixtures** and printed confident numbers anyway,
  including a 0.0% that looked like a devastating model failure and was a column-vocabulary
  mismatch. The control passed throughout. Controls only cover the fixture they exist on.

---

## 7. Bottom line

- **Pixels beat OCR text.** 100% vs 90.7% placement, and text-only fails by **row drift** —
  silent, confident, and invisible to the student (§5.1).
- **Geometry matters; an OCR geometry *sidecar* did not.** The hybrid arm discarded its own IR as
  wrong and reproduced the image-only answer exactly. Untested, not disproven.
- **Structure was deterministic across 4 runs; transcription was not** (1-in-4 flip on one glyph).
  Defend them separately.
- **Cost is irrelevant** at ≈₹0.17/student/semester. Do not let it drive the architecture.
- **Nothing here tested the model you would ship.** The arms were 7–9 minute agentic reads with
  16× zoom. Benchmark Flash-Lite single-shot against `score_slots_strict.py` before committing.
- **Ship the confirmation screen.** On this evidence it is not a fallback, it is the product.
