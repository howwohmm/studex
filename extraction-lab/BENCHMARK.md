# Timetable extraction benchmark — 2026-08-13

Four extractors, three real Indian college timetables, one scorer (`score.py`), one
ground truth (`out/groundtruth/`, transcribed cell-by-cell by independent agents and
adversarially verified).

**Metric.** Cells are matched by token-set Jaccard ≥ 0.5, so formatting differences don't
count against an adapter but invented or dropped content does.
- **Recall** = fraction of real cells found. A miss is a class the student never sees.
- **Precision** = fraction of output cells that are real. Misses here are *fabrication*.
- **Span** = fraction of merged cells whose multi-column span survived (a 3-period lab
  must not become a 1-period lecture).

## Results

| Timetable | Adapter | F1 | Recall | Precision | Span |
|---|---|---:|---:|---:|---:|
| Presidency (dense print grid) | **apple-vision** | 68.0% | **100.0%** | 51.5%* | 40% |
| | sarvam-digitise | 60.0% | 88.2% | 45.5%* | 30% |
| | paddle-ppstructure | 31.3% | 76.5% | 19.7%* | 40% |
| | sarvam-extract | 13.8% | 11.8% | 16.7% | 0% |
| Architecture (spreadsheet screenshot) | **apple-vision** | **87.0%** | 83.3% | 90.9% | 75% |
| | paddle-ppstructure | 77.2% | 72.6% | 82.4% | 50% |
| | sarvam-extract | 42.6% | 27.4% | 95.8% | 0% |
| | sarvam-digitise | **0.0%** | 0.0% | 0.0% | 0% |
| VIT (blank slot template) | **sarvam-digitise** | **99.4%** | 98.9% | 100% | n/a |
| | paddle-ppstructure | 95.6% | 95.6% | 95.6% | n/a |
| | apple-vision | 92.3% | 85.7% | 100% | n/a |
| | sarvam-extract | 81.0% | 68.1% | 100% | n/a |

\* Presidency's ground truth contains **only class cells and break columns** — no headers or
day labels. Every "unmatched" cell for vision/digitise/paddle on that image was a real
header, time string or weekday name, not an invention. Precision there is a scoring
artifact; treat recall as the signal.

### Averages

| Adapter | Avg F1 | Avg recall | Worst F1 |
|---|---:|---:|---:|
| **apple-vision** | **82.4%** | **89.7%** | **68.0%** |
| paddle-ppstructure | 68.0% | 81.6% | 31.3% |
| sarvam-digitise | 53.1% | 62.4% | 0.0% |
| sarvam-extract | 45.8% | 35.8% | 13.8% |

### Cost / latency

| Adapter | Where it runs | Time per page | Cost | Offline |
|---|---|---|---|---|
| apple-vision | on-device (iOS/macOS 26) | **0.7–1.8s** | free | yes |
| paddle-ppstructure | local CPU, *server* models | 23–107s | free | yes |
| sarvam (either mode) | cloud | 6–19s + network | ₹0.5/page | no |

Paddle was benchmarked with PP-OCRv5 **server** weights (the default). Mobile weights are a
few MB and much faster, but lower accuracy — so 68% is Paddle's *optimistic* ceiling here.

## What the numbers say

1. **Apple Vision wins overall and never collapses.** Best average F1, best average recall,
   best span preservation, and its worst case (68%, with perfect recall) is far above every
   other adapter's worst case. It found **all 14 classes plus all 3 break columns** on the
   Presidency grid — the only adapter to lose nothing. It cost nothing and took 0.9s.
2. **Sarvam is bimodal and therefore dangerous.** Best single score in the benchmark (99.4%
   on VIT) and the only 0.0% (architecture, where digitise hallucinated a driving-licence
   fee table). An extractor whose failure mode is confident fiction cannot be trusted
   without a second opinion.
3. **Paddle is credible but not on iPhone-grade text.** Solid on the architecture
   screenshot (77%), weak on the dense print grid (31%) where it shattered headers into
   individual cells and dropped all of Thursday and Friday's classes.
4. **Nobody clears 0.90 on a real dense timetable.** The only scores above 90% are on the
   VIT sheet, which is a blank slot template with no subjects, rooms or faculty. On the two
   real student schedules the ceiling is 87%.

## Conclusion

No off-the-shelf tool solves this end to end. The winning shape is the one the July build
already found: **good OCR + geometry → your own deterministic grid reconstruction.**
Apple Vision is the best raw material by a wide margin (real `rowRange`/`columnRange`, cell
bounding boxes, sub-2-second on-device, free), so build the intermediate representation on
Vision for iOS, keep Paddle as the Android/portable path against the same IR, and keep
Sarvam only as an optional cloud second opinion for documents the on-device path flags as
low-confidence.

## Reproduce

```
./adapters/vision/visiontt fixtures/*.jpg            # Apple Vision (swiftc -O adapters/vision/main.swift)
./.venv312/bin/python run_paddle.py fixtures/*.jpg   # PP-StructureV3
./.venv/bin/python run_sarvam.py digitise|extract fixtures/*.jpg
./.venv/bin/python score.py                          # scores everything against groundtruth
```
