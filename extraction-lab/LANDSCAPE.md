# OCR / table-extraction landscape for StudEx timetables

Date: 2026-08-13
Fixtures: `fixtures/presidency-2bes07.jpg` (dense aSc print grid, merged periods),
`fixtures/arch-batches-thu-fri.jpg` (Google-Sheets screenshot, batch rows),
`fixtures/vit-slot-grid.jpg` (blank printed slot template).
Ground truth: `out/groundtruth/*.truth.json` (hand-transcribed, pixel-verified).
Scorer: `score.py` (token-set Jaccard >= 0.5, one-to-one matching). Raw table: `out/scores.json`.

**16 engines scored. Nothing clears the 0.90 F1 gate on a real dense timetable. Nothing
beats Apple Vision once you check whether the classes land on the right day.**

---

## 0. Read this before the leaderboard

`score.py` matches cells **by text content only. It is position-blind.** It never checks
which row or column a cell landed in. A timetable can score 97% recall and still put every
class on the wrong day, and the scorer will call it a winner.

That is not hypothetical. It is what happened to the engine that tops the F1 table.

I ran a second, position-aware check: parse each engine's HTML into rows, find the weekday
label attached to each row, and verify that each ground-truth class cell lands in a row
labelled with the correct day. Presidency has 14 real class cells (excluding the 3
vertically-merged break columns, which belong to no single day).

### Day-placement accuracy — presidency-2bes07 (14 class cells)

| Engine | Right day | Wrong day | Not found | Failure shape |
|---|---:|---:|---:|---|
| **apple-vision** | **13** | 1 | 0 | one Wed class read into Tue |
| **rapidai-table** | **13** | 1 | 0 | one Wed class read into Tue |
| paddlemobile | 6 | 7 | 1 | day label detached from row |
| paddle-ppstructure | 4 | 6 | 4 | day label detached / shifted |
| rapidtable | 3 | 8 | 3 | day label detached, some drift |
| **dotsocr** | **2** | **11** | 1 | **off-by-one row shift: mon→tue, tue→wed, wed→thu…** |
| granitedocling | 0 | 12 | 2 | no day label on any class row |
| surya | 0 | 14 | 0 | no day label on any class row |
| paddleocrvl | 0 | 11 | 3 | everything collapsed into 2 rows |
| tatr | 0 | 9 | 5 | no day label on any class row |
| tesseract | 0 | 4 | 10 | cells fused, days destroyed |
| docling | — | — | — | found **no table at all** on this image |

Two distinct failure modes, and they are not equally bad:

- **Wrong day (dotsocr, paddleocrvl).** The output is confident, well-formed, and lies.
  dotsocr shifts every row from Tuesday onward down by one day. A student opens the app and
  sees Tuesday's classes on Wednesday. Nothing in the output signals a problem. **This is
  the failure mode that kills the product.**
- **Day label not attached (surya, granitedocling, tatr, paddlemobile).** The structure is
  unusable, but the error is loud — a reconstruction layer can detect "no day label on this
  row" and refuse. Recoverable with work; not actively deceptive.

### The same check on vit-slot-grid (65 day-row cells) — the calibration

| Engine | Right day | Wrong | Not found |
|---|---:|---:|---:|
| apple-vision | 65 | 0 | 0 |
| dotsocr | 65 | 0 | 0 |
| rapidai-table | 65 | 0 | 0 |
| granitedocling | 65 | 0 | 0 |
| docling | 62 | 0 | 3 |
| rapidtable | 51 | 2 | 12 |
| paddlemobile | 35 | 30 | 0 |
| paddle-ppstructure | 35 | 30 | 0 |

dotsocr is **perfect** on the clean, fully-ruled, unmerged VIT template and **catastrophic**
on the dense merged Presidency grid. So the honest claim is narrow and specific:

> VLM row alignment holds on clean regular grids and collapses on sparse grids with
> horizontal merges and empty cells — which is exactly what a real Indian college timetable
> is. The benchmark fixture that makes engines look good is the one with no content in it.

**Judge every engine on the Presidency row of every table below. The other two fixtures
flatter everyone.**

---

## 1. Full scored comparison — all engines, all fixtures

Ranked by average F1 within each fixture block. `span` = fraction of merged truth cells whose
multi-column span survived.

### presidency-2bes07 — dense aSc grid (17 truth cells: 14 classes + 3 break columns)

| Engine | F1 | Recall | Precision* | Span | Found | Missed | Unmatched |
|---|---:|---:|---:|---:|---:|---:|---:|
| apple-vision | 68.0% | **100.0%** | 51.5% | 40% | 17 | 0 | 16 |
| sarvam-digitise | 60.0% | 88.2% | 45.5% | 30% | 15 | 2 | 18 |
| dotsocr | 54.2% | 94.1% | 38.1% | 30% | 16 | 1 | 26 |
| rapidtable | 45.9% | 82.4% | 31.8% | 60% | 14 | 3 | 30 |
| rapidai-table | 42.0% | **100.0%** | 26.6% | **100%** | 17 | 0 | 47 |
| paddlemobile | 41.9% | 76.5% | 28.9% | 40% | 13 | 4 | 32 |
| surya | 39.1% | **100.0%** | 24.3% | **100%** | 17 | 0 | 53 |
| granitedocling | 35.1% | 58.8% | 25.0% | 10% | 10 | 7 | 30 |
| doctr † | 34.1% | 82.4% | 21.5% | 30% | 14 | 3 | 51 |
| docling † | 34.0% | 94.1% | 20.8% | 30% | 16 | 1 | 61 |
| paddle-ppstructure | 31.3% | 76.5% | 19.7% | 40% | 13 | 4 | 53 |
| tesseract | 21.4% | 35.3% | 15.4% | 40% | 6 | 11 | 33 |
| tatr | 20.7% | 52.9% | 12.9% | 20% | 9 | 8 | 61 |
| paddleocrvl | 14.5% | 76.5% | 8.0% | 80% | 13 | 4 | 149 |
| sarvam-extract | 13.8% | 11.8% | 16.7% | 0% | 2 | 15 | 10 |
| easyocr † | 8.3% | 23.5% | 5.1% | 30% | 4 | 13 | 75 |

\* **Presidency precision is a scoring artifact — ignore it.** The ground truth contains only
class cells and the 3 break columns. It has no column headers, no time strings and no day
labels. Every engine that correctly reads "Monday", "9:00 - 10:00 AM" or "PRESIDENCY
UNIVERSITY" is punished for it. **Judge this fixture on recall, then on the day-placement
table in section 0.**

† Scored via the flat-`texts` fallback — see section 5. Not a table result.

### arch-batches-thu-fri — spreadsheet screenshot (84 truth cells)

| Engine | F1 | Recall | Precision | Span | Found | Missed | Unmatched |
|---|---:|---:|---:|---:|---:|---:|---:|
| **dotsocr** | **96.0%** | **98.8%** | 93.3% | 75% | 83 | 1 | 6 |
| tatr | 95.1% | 91.7% | **98.7%** | 75% | 77 | 7 | 1 |
| docling | 95.1% | 92.9% | 97.5% | 25% | 78 | 6 | 2 |
| granitedocling | 90.3% | 94.0% | 86.8% | 0% | 79 | 5 | 12 |
| surya | 88.8% | 94.0% | 84.0% | 75% | 79 | 5 | 15 |
| apple-vision | 87.0% | 83.3% | 90.9% | 75% | 70 | 14 | 7 |
| paddlemobile | 84.8% | 83.3% | 86.4% | 50% | 70 | 14 | 11 |
| rapidtable | 84.0% | 75.0% | 95.5% | 25% | 63 | 21 | 3 |
| paddle-ppstructure | 77.2% | 72.6% | 82.4% | 50% | 61 | 23 | 13 |
| rapidai-table | 63.4% | 98.8% | 46.6% | 75% | 83 | 1 | 95 |
| paddleocrvl | 62.9% | 98.8% | 46.1% | 75% | 83 | 1 | 97 |
| tesseract | 54.2% | 76.2% | 42.1% | 50% | 64 | 20 | 88 |
| sarvam-extract | 42.6% | 27.4% | 95.8% | 0% | 23 | 61 | 1 |
| doctr † | 8.9% | 13.1% | 6.7% | 0% | 11 | 73 | 153 |
| easyocr † | 1.1% | 2.4% | 0.7% | 50% | 2 | 82 | 270 |
| **sarvam-digitise** | **0.0%** | **0.0%** | **0.0%** | 0% | 0 | 84 | 59 |

### vit-slot-grid — blank printed slot template (91 truth cells)

| Engine | F1 | Recall | Precision | Span | Found | Missed | Unmatched |
|---|---:|---:|---:|---:|---:|---:|---:|
| sarvam-digitise | **99.4%** | 98.9% | 100.0% | 0% | 90 | 1 | 0 |
| **dotsocr** | **99.4%** | 98.9% | 100.0% | 0% | 90 | 1 | 0 |
| paddlemobile | 98.3% | 97.8% | 98.9% | 0% | 89 | 2 | 1 |
| granitedocling | 96.8% | 98.9% | 94.7% | 0% | 90 | 1 | 5 |
| paddle-ppstructure | 95.6% | 95.6% | 95.6% | 0% | 87 | 4 | 4 |
| docling | 95.0% | 94.5% | 95.6% | 0% | 86 | 5 | 4 |
| apple-vision | 92.3% | 85.7% | 100.0% | 0% | 78 | 13 | 0 |
| rapidtable | 85.1% | 84.6% | 85.6% | 0% | 77 | 14 | 13 |
| sarvam-extract | 81.0% | 68.1% | 100.0% | 0% | 62 | 29 | 0 |
| easyocr † | 68.9% | 90.1% | 55.8% | 0% | 82 | 9 | 65 |
| surya | 66.2% | 49.5% | 100.0% | 0% | 45 | 46 | 0 |
| paddleocrvl | 65.9% | 98.9% | 49.5% | **100%** | 90 | 1 | 92 |
| rapidai-table | 65.0% | 98.9% | 48.4% | 0% | 90 | 1 | 96 |
| tatr | 51.9% | 46.2% | 59.2% | 0% | 42 | 49 | 29 |
| tesseract | 42.5% | 48.4% | 37.9% | 0% | 44 | 47 | 72 |
| doctr † | 7.0% | 5.5% | 9.8% | 0% | 5 | 86 | 46 |

Every engine scored 0% span here except paddleocrvl. The VIT sheet's only merge is the
LUNCH column; the whole field misses it.

---

## 2. Leaderboards

### By average F1

| # | Engine | Avg F1 | Avg recall | Avg prec | Presidency F1 | Worst F1 |
|---:|---|---:|---:|---:|---:|---:|
| 1 | dotsocr (dots.ocr-8bit) | **83.2%** | 97.3% | 77.1% | 54.2% | 54.2% |
| 2 | apple-vision | 82.4% | 89.7% | 80.8% | 68.0% | **68.0%** |
| 3 | paddlemobile | 75.0% | 85.9% | 71.4% | 41.9% | 41.9% |
| 4 | docling | 74.7% | 93.8% | 71.3% | 34.0% | 34.0% |
| 5 | granitedocling | 74.0% | 83.9% | 68.9% | 35.1% | 35.1% |
| 6 | rapidtable | 71.7% | 80.7% | 70.9% | 45.9% | 45.9% |
| 7 | paddle-ppstructure | 68.0% | 81.6% | 65.9% | 31.3% | 31.3% |
| 8 | surya | 64.7% | 81.2% | 69.4% | 39.1% | 39.1% |
| 9 | rapidai-table | 56.8% | **99.2%** | 40.5% | 42.0% | 42.0% |
| 10 | tatr | 55.9% | 63.6% | 56.9% | 20.7% | 20.7% |
| 11 | sarvam-digitise | 53.1% | 62.4% | 48.5% | 60.0% | 0.0% |
| 12 | paddleocrvl | 47.8% | 91.4% | 34.5% | 14.5% | 14.5% |
| 13 | sarvam-extract | 45.8% | 35.8% | 70.8% | 13.8% | 13.8% |
| 14 | tesseract | 39.4% | 53.3% | 31.8% | 21.4% | 21.4% |
| 15 | easyocr † | 26.1% | 38.7% | 20.5% | 8.3% | 8.3% |
| 16 | doctr † | 16.7% | 33.6% | 12.7% | 34.1% | 7.0% |

### By average recall

| # | Engine | Avg recall | Avg F1 | Day-placement on presidency |
|---:|---|---:|---:|---|
| 1 | rapidai-table | **99.2%** | 56.8% | **13/14 correct** |
| 2 | dotsocr | 97.3% | 83.2% | **2/14 — one-day shift** |
| 3 | docling | 93.8% | 74.7% | no table found on presidency |
| 4 | paddleocrvl | 91.4% | 47.8% | 0/14 |
| 5 | apple-vision | 89.7% | 82.4% | **13/14 correct** |
| 6 | paddlemobile | 85.9% | 75.0% | 6/14 |
| 7 | granitedocling | 83.9% | 74.0% | 0/14 |
| 8 | paddle-ppstructure | 81.6% | 68.0% | 4/14 |
| 9 | surya | 81.2% | 64.7% | 0/14 |
| 10 | rapidtable | 80.7% | 71.7% | 3/14 |
| 11 | tatr | 63.6% | 55.9% | 0/14 |
| 12 | sarvam-digitise | 62.4% | 53.1% | drifts one day (FINDINGS.md §4) |
| 13 | tesseract | 53.3% | 39.4% | 0/14 |
| 14 | easyocr † | 38.7% | 26.1% | no tables at all |
| 15 | sarvam-extract | 35.8% | 45.8% | stopped after 2 slots |
| 16 | doctr † | 33.6% | 16.7% | no tables at all |

**Only two engines in the entire field both find the content and put it on the right day:
apple-vision and rapidai-table.**

---

## 3. Mobile — can it actually ship in an Expo app?

"Ships in Expo" means: works on iOS **and** Android, in a dev build (Expo Go supports no
native modules), at a bundle size a student will download.

| Engine | iOS | Android | On-device size | Verdict |
|---|---|---|---|---|
| **apple-vision** | **YES, native** | **NO — Apple-only** | 0 MB (OS built-in) | Ship on iOS. `VNRecognizeDocumentsRequest` gives real `rowRange`/`columnRange` + cell boxes, free, offline, 0.7–1.8s. No Android equivalent exists. |
| **rapidai-table** | models yes, pipeline no | models yes, pipeline no | ~47 MB ONNX (minimal set) | **Best server-side engine.** ONNX runs via `onnxruntime-react-native` on both platforms, but ~2,900 LOC of numpy/cv2/shapely/skimage post-processing has no JS port. Multi-week rewrite. Ship as a server endpoint. |
| rapidtable | models yes, pipeline no | models yes, pipeline no | 38 MB ONNX (4 files) | Same shape as above, smaller. DB post-processing needs a WASM polygon-offset lib. Weeks of work; worse accuracy than rapidai-table. |
| paddlemobile | no RN binding | no RN binding | mobile weights ~10–20 MB | Paddle-Lite `.nb` conversion + C++/JNI runtime. No Expo path. Detection+recognition only; table structure would have to come from RapidAI ONNX anyway. |
| paddle-ppstructure | no | no | hundreds of MB | Server weights. Never mobile. |
| tesseract | native lib exists, RN bridges dead | same | ~5–23 MB traineddata + 20–40 MB OpenCV/ABI | RN wrappers unmaintained, pre-TurboModule. And the half that matters (img2table grid logic) is pure Python with no port. Dead. |
| easyocr | **NO** | **NO** | 990 MB venv + 94 MB weights | PyTorch. Would require embedding a Python interpreter + libtorch. iOS bans that (no JIT, App Store rules). Only path is a from-scratch CRAFT+CRNN ONNX port. |
| doctr ‡ | no | no | ~100 MB+ | PyTorch/TF pipeline, no RN binding. |
| dotsocr ‡ | **NO** | **NO** | 4.1 GB weights, **5.5 GB peak RAM** | 3B-class VLM on MLX. Physically impossible on a phone. Also 40–300s per image on an M-series Mac. |
| paddleocrvl ‡ | no | no | 682 MB (4-bit) | VLM. Server/desktop only. |
| surya ‡ | no | no | 1.4 GB GGUF | VLM via llama.cpp. Conceivable to port eventually; not now. |
| granitedocling ‡ | no | no | 611 MB (258M params, MLX) | Smallest VLM here. A quantized GGUF might one day fit a flagship phone; not an Expo story today. |
| docling ‡ | no | no | ~800 MB of models | Python pipeline (layout-heron + TableFormerV2 + rapidocr). Server only. |
| tatr ‡ | no | no | 220 MB (2 DETR models) | PyTorch + tesseract dependency. Server only. |
| sarvam (both) | cloud | cloud | 0 | Network required, ₹0.5/page, and it hallucinates. See section 6. |

‡ Mobile verdict **inferred** from model size, runtime and architecture recorded in the
output JSON and HF cache — not from a hands-on mobile port attempt.

**Summary: exactly one engine ships on-device today, and it is iOS-only (Apple Vision).
Every open engine that is accurate enough is a Python pipeline, not a model — the ONNX
weights are portable, the 2,000–3,000 lines of geometry around them are not.**

---

## 4. Cloud options, per page

| Service | Tables? | Spans/geometry | Price per 1k pages | Per page | Status |
|---|---|---|---:|---:|---|
| Mistral OCR 3 (batch) | yes | markdown/HTML | $1.00 | $0.001 | Cheapest. olmOCR-Bench Tables **60.6** — worse than free local models. |
| Mistral OCR 3 | yes | markdown/HTML | $2.00 | $0.002 | Same accuracy problem. |
| Mistral OCR 4 (batch) | yes | markdown/HTML | $2.00 | $0.002 | Unproven on Indian timetables. |
| Mistral OCR 4 | yes | markdown/HTML | $4.00 | $0.004 | — |
| Mistral Document AI | yes | structured | $5.00 | $0.005 | — |
| **Sarvam DocAI** | yes | HTML, no cell geometry | ~₹500 (₹0.5/pg) | **~$0.006** | **TESTED. Hallucinated an entire fake document on 1 of 3 fixtures.** |
| Azure AI Document Intelligence (Read) | **no** | text only | $1.50 | $0.0015 | No tables. Useless here. |
| Google Document AI (Enterprise OCR) | limited | text + boxes | $1.50 | $0.0015 | No table mode at this tier. |
| Google Document AI (OCR add-ons) | limited | — | $6.00 | $0.006 | — |
| Azure AI DI (prebuilt-layout) | **yes** | rowspan/colspan + regions | $10.00 | $0.010 | Right output shape. Credible accuracy oracle. |
| AWS Textract (AnalyzeDocument Tables) | **yes** | row/col index + spans | $15.00 | $0.015 | Right output shape, 10–30x Sarvam's cost. |
| AWS Textract (Tables + Forms) | yes | — | $50.00+ | $0.050+ | — |
| Google Document AI (Form Parser / Custom Extractor) | **yes** | tables + spans | $30.00 | $0.030 | Most expensive credible option. |

Prices verified Aug 2026. **None of these is in the product loop.** A student captures a
timetable once or twice a semester; a free on-device path that gets 82–87% F1 already beats
paying per page for a cloud round-trip. The only defensible cloud use is Azure
prebuilt-layout or Textract as a **one-off accuracy oracle** when validating new ground
truth, and even that is optional.

---

## 5. Engines whose numbers are not what they look like

Read this before quoting anything from section 1.

| Engine | What the score actually measures |
|---|---|
| **easyocr** | Emitted **0 tables on all 3 fixtures**. `tables_html` is empty. Scored entirely through `score.py`'s flat-`texts` fallback — it is a word-box OCR engine, not a table extractor. Its 26.1% avg F1 measures OCR fragment coverage. |
| **doctr** | Same: **0 tables on all 3 fixtures**. Its texts are pre-joined line strings ("Material Studies Material Studies Material Studies"), which is why they fail token matching. Flat OCR only. |
| **docling** | Found **0 tables on presidency**. Its 34.0% F1 / 94.1% recall there is the flat-`texts` fallback, not table extraction. Its arch and vit numbers (95.1% / 95.0%) are real table results. |
| **tatr** | Requires a table region to be handed to it; on presidency it never located a coherent one (52.9% recall, 0/14 day placement). Excellent on arch (95.1%) — a clean screenshot is its home turf. |
| **rapidai-table** | Its **100% recall + 100% span on presidency is genuine**, but only because the runner overrides the library's default classifier. Stock `yolo_cls` labels presidency "wireless" and routes it to the lineless model, producing 171 shredded cells. The runner pins `paddle_cls`. **Anyone running this engine with defaults gets a broken result.** |
| **paddleocrvl / rapidai-table on arch+vit** | ~99% recall with 46–49% precision and 92–96 unmatched cells each. They emit page headers, footnotes and every stray text run as table cells. High recall bought with heavy over-emission. |
| **surya** | 100% recall + 100% span on presidency, and **0/14 day placement**. It finds every class and can tell you nothing about when any of them happen. |

---

## 6. Failures — engines that did not install, did not run, or ran and lied

Nothing here is hidden. Four categories.

### 6a. Adapter written, venv built, no output produced

| Engine | Evidence | Honest status |
|---|---|---|
| **GOT-OCR 2.0** (`adapters/run_gotocr.py`) | `.venv-gotocr` built (869 MB, 87 packages); model `stepfun-ai/GOT-OCR-2.0-hf` **fully downloaded** (274 MB in HF cache). **Zero `out/*.gotocr.json`.** No bench report received. | Ran or crashed after model load; **reason unknown**. Not scored. Do not assume it failed on capability. |
| **Qwen3-VL-4B-Instruct-4bit** (`adapters/run_qwenvl.py`) | `.venv-qwenvl` built (706 MB, 124 packages); HF cache for `mlx-community/Qwen3-VL-4B-Instruct-4bit` holds only **15 MB** of a ~2.2 GB model. **Zero `out/*.qwenvl.json`.** No bench report received. | **Model download incomplete/aborted.** Never reached inference. Not scored. |

### 6b. Verified broken — do not retry

| Engine | Reason |
|---|---|
| **MMOCR 1.0.1 (OpenMMLab)** | `pip install mmcv>=2.0.0` fails on py3.12 arm64: "Failed to build mmcv when getting requirements to build wheel". No prebuilt wheels, source build breaks. `pip install mmocr` appears to succeed only because it fails to declare mmcv/mmdet/mmengine, then dies at import. Last release 2023-07-04, classifiers claim Python 3.6–3.9. No table-structure pipeline anyway. **Dead.** |

### 6c. Blocked by licence, not capability

| Engine | Blocker |
|---|---|
| **MonkeyOCR v1.5 (pro-1.2B / pro-3B)** | Weights are academic / non-commercial; "commercial interest requires contacting the authors". Also needs 4–8 GB CUDA. Its Elo composite (781.1) is the lowest of the modern models anyway — nothing to gain. **Do not pursue.** |
| **Chandra / Chandra OCR 2 (Datalab)** | Modified OpenRAIL-M: free under $2M revenue, explicitly may not be used to compete with their API. 8.77B params — desktop/cloud only, never on-device. Highest olmOCR-Bench Tables score (88.0). Viable only as a cloud second opinion. |
| **MinerU 2.5-Pro-1.2B** | Licence ambiguity: the `2605-1.2B` checkpoint is Apache-2.0 per HF metadata, but the older `2509-1.2B` card says **AGPL-3.0**. AGPL in an iOS app is a serious problem. Verify the exact checkpoint before any work. Also needs its own venv (downgrades transformers to 4.57.6). |
| **HunyuanOCR 1.5 (Tencent)** | Tencent Hunyuan Community License — free commercial use, apply above 100M MAU, outputs may not train non-Hunyuan models. Workable today; read it before diligence. |

### 6d. Ran successfully and produced confident fiction

This is the most dangerous category in the whole document.

| Engine | What it did |
|---|---|
| **sarvam-digitise on arch-batches-thu-fri** | Scored **0.0% F1 / 0.0% recall / 0.0% precision — 0 of 84 truth cells matched, 59 fabricated cells emitted.** It did not fail. It returned a well-formed 6×9 HTML table **about Indian driving-licence fees**, with row labels `DRIVING`, `Driving License (in Samarthan)`, a `<tfoot>` reading `TOTAL DRIVING FEE FOR ALL CLASSES OF DRIVERS IN INDIA`, and an invented `<thead>` that cannot exist (the fixture is a crop whose top edge sits on the table's own border). Provenance is traceable pixel by pixel: the date `24.08.2023` became `₹ 24,08,203`; `Academic Block-I/II` became `Accident Block-I/II`; `Mr. Nitin Kulkarni` became `(M.K. Kulkarni)`. Zero recoverable geometry. |
| **sarvam-digitise on presidency** | Invented a class at Wednesday period 4, a cell verified empty (grayscale min 251/255): emitted `Qiv03 \| CSE_Sakthivel \| Prashanth S P`, a hybrid of two unrelated cells that appear nowhere together on the page. Emitted 3 `CIV1008` cells where the image has 2. Dropped **every** colspan, left-packing content so period indices silently shift. Drifts one day from Wednesday onward and **emits Friday as entirely empty** despite two occupied Friday cells. |
| **sarvam-extract on presidency** | Generation stopped after **2 slots, both Monday**. Valid, fully-closed JSON. 12 classes simply gone. Fails quiet rather than fails loud — less dangerous than digitise, still unusable. |
| **sarvam-extract on arch** | `day == "THURS"` on all 24 slots; `FRI` appears zero times. Period axis does not exist (`period_headers` empty, `period_labels` holds batch letters). Backfilled missing room numbers with room numbers borrowed from **neighbouring cells** — a well-formed room number that sends a student to the wrong building, with nothing marking it uncertain. |
| **dotsocr on presidency** | Top of the F1 leaderboard. Puts **2 of 14 classes on the correct day** (section 0). Off-by-one day shift from Tuesday onward. The output is clean, complete, and wrong. |

---

## 7. Untested but worth the next round

| Item | Why | Next step |
|---|---|---|
| **Google ML Kit Text Recognition v2** | Apple Vision's direct Android counterpart: fully offline, free, no billing for on-device recognition, Latin + Devanagari, fast enough for live camera frames. **Highest-priority research item in this whole document** — it is the only credible path to feature parity on Android. Catch: no document/table mode. You get Block>Line>Element>Symbol with `boundingBox`/`cornerPoints`/`confidence` and must infer the grid yourself. | Throwaway Android app on the 3 fixtures. **Not more desk research.** |
| Nanonets-OCR2-3B | Best table-score-to-size ratio available (olmOCR-Bench Tables 86.8 vs mediocre Overall 69.5 — exactly the right shape, we only care about tables). Emits HTML tables. | **Confirm the licence first** — the HF card has no explicit licence field, inheriting Qwen2.5-VL-3B (Apache-2.0) by assumption only. |
| Infinity-Parser2 Flash (2.2B) | Highest open-model overall score encountered (olmOCR-Bench 86.0, PubTabNet val 92.41), Apache-2.0, card documents llama.cpp/Ollama CPU paths. | Group with HunyuanOCR into a single llama.cpp round so the runtime cost is paid once. |
| GLM-OCR (1.33B, Z.ai) | MIT — most permissive top-tier licence here, official GGUF from ggml-org gives a real llama.cpp→mobile path. But Elo 892.5 sits below dots.mocr (1124.7). | Licence-driven pick, not accuracy-driven. Low priority. |
| olmOCR-2-7B (Ai2) | **Quality oracle only, never a product path** — 8B cannot run on a phone. Apache-2.0, Tables 84.9. Useful for generating a second opinion on hand-transcribed ground truth. | Optional. |
| Paddle-Lite `.nb` deployment | Purely a packaging question now that paddlemobile has been scored (75.0% avg F1, but 6/14 day placement). | Conditional — the day-placement number does not justify it. |

---

## 8. Conclusions

1. **Nothing clears 0.90 F1 on a real dense timetable.** The best Presidency F1 in a field of
   16 is apple-vision at **68.0%**. The only >90% scores anywhere are on the VIT sheet, a
   *blank template* with no subjects, rooms or faculty — nothing to get wrong.

2. **Nothing beats Apple Vision.** dotsocr edges it on average F1 (83.2 vs 82.4 — inside
   noise) and then puts 2 of 14 Presidency classes on the correct day, versus Vision's 13.
   On the metric that determines whether the product works, Vision is still first, tied
   with rapidai-table.

3. **The best result of this round is rapidai-table**, not because it scores highest — it
   doesn't (56.8% avg F1, dragged down by over-emission) — but because it is the only
   **free, portable, non-Apple** engine that achieves 99.2% average recall, 100% span
   recovery on Presidency, and 13/14 correct day placement, in 2.6–6.0s on CPU with 47 MB
   of ONNX. It is the Android/server answer. Pin `paddle_cls`; the default router breaks it.

4. **VLMs are a trap here.** dots.ocr, PaddleOCR-VL, Surya and granite-docling all read the
   *text* superbly (94–99% recall) and then assign it to the wrong grid position with total
   confidence. They also cost 4.1 GB and 5.5 GB peak RAM and 40–300s per image. High recall
   with wrong placement is worse than low recall, because low recall is visible.

5. **The metric was lying and now it isn't.** Add the positional check
   (`day-placement accuracy`) as a hard gate alongside F1. Token F1 alone would have shipped
   dots.ocr.

### Recommended architecture

```
                 ┌─────────────── Expo app (dev build, not Expo Go) ───────────────┐
                 │                                                                 │
  camera ───►    │  iOS:      Apple Vision VNRecognizeDocumentsRequest              │
                 │            → cells + rowRange/columnRange + boxes                │
                 │            0.7–1.8s, free, offline, 0 MB bundle                  │
                 │                                                                 │
                 │  Android:  ML Kit Text Recognition v2 (VALIDATE FIRST)           │
                 │            → word boxes only, no table mode                      │
                 │            fallback today: POST photo to rapidai-table service   │
                 └────────────────────────────┬────────────────────────────────────┘
                                              │
                          ┌───────────────────▼───────────────────┐
                          │  SHARED IR  (TypeScript, one codebase) │
                          │  {text, bbox, row, col, rowSpan,       │
                          │   colSpan, confidence}                 │
                          └───────────────────┬───────────────────┘
                                              │
                          ┌───────────────────▼───────────────────┐
                          │  DETERMINISTIC GRID RECONSTRUCTION     │
                          │  cluster boxes → rows/cols             │
                          │  snap to day labels + period headers   │
                          │  merge detection from box widths       │
                          └───────────────────┬───────────────────┘
                                              │
                          ┌───────────────────▼───────────────────┐
                          │  VALIDATION GATE (non-negotiable)      │
                          │  • every class row has a day label     │
                          │  • every class col maps to a period    │
                          │  • period count == header count        │
                          │  FAIL → confirmation UI, never silent  │
                          └────────────────────────────────────────┘
```

**Why this shape:**

- **Vision on iOS, ML Kit on Android, one IR, one reconstruction layer.** Both platforms
  give word/cell boxes natively at zero bundle cost. Neither gives a trustworthy grid —
  and no engine in this benchmark gives a trustworthy grid either, so you were always
  going to write the reconstruction layer. Write it once, in TS, above the IR.
- **rapidai-table as the Android bridge and the server tier.** CPU-only, 47 MB, 2.6–6.0s,
  no API key, no GPU, runs on a cheap VPS. Use it while ML Kit is unvalidated, and keep it
  as the second opinion for photos the on-device path flags low-confidence.
- **The validation gate is the actual product feature.** Every engine here has a silent
  failure mode. The gate converts silent wrongness into a "please confirm your Tuesday"
  prompt. A student correcting two cells is fine. A student with a wrong attendance
  denominator and no idea is the thing that kills this.
- **No cloud in the loop.** Sarvam hallucinated a driving-licence fee table over a
  timetable. Textract/Azure/Google cost $0.01–0.03/page for a once-a-semester capture that
  a free on-device path already handles better.

### The next benchmark run must

- Score **day/period placement**, not just token F1. `score.py` as written cannot detect the
  dots.ocr failure. That gap is a bug in the harness, not in the engines.
- Run **ML Kit on Android** against these three fixtures. It is the single unknown that
  decides whether Android reaches iOS parity or stays server-dependent.
- Add a **fourth fixture** — a phone photo with perspective skew and shadow. All three
  current fixtures are flat scans or screenshots. Tesseract already proved the field is
  cliff-edged w.r.t. resolution (2x upscale + psm 11 is best on vit and produces **zero
  tables** on presidency).
