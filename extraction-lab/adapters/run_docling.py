"""IBM Docling 2.119 + TableFormer V2 (OTSL) -> tables as HTML + cell geometry.

Usage: .venv-docling/bin/python adapters/run_docling.py <image> [...]

Default is TableFormer **V1** (`TableStructureOptions`, mode=ACCURATE), not V2.
Measured on these fixtures, TableStructureV2Options over-segments rows (55 rows
for a ~10-row timetable) and emits row_span/col_span == 1 for every cell -- merged
cells come back as duplicated text across the grid instead of spans. V1 returns a
sane grid and real rowspans. Set DOCLING_TF=v2 to reproduce the V2 behaviour.

Env knobs:
  DOCLING_OCR     rapidocr (default) | tesseract | easyocr | auto
  DOCLING_TF      v1 (default) | v2       # TableFormer version
  DOCLING_LAYOUT  layout_heron_default (default) | layout_egret_large | ...
  DOCLING_SUFFIX  docling (default)       # out/<stem>.<suffix>.json

First run downloads the layout (Heron) + TableFormer checkpoints from HF and
the RapidOCR ONNX models.
"""

import json
import os
import pathlib
import sys
import time

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "out"
OUT.mkdir(exist_ok=True)

from docling.datamodel.base_models import InputFormat  # noqa: E402
from docling.datamodel.pipeline_options import (  # noqa: E402
    OcrAutoOptions,
    OcrMode,
    PdfPipelineOptions,
    RapidOcrOptions,
    TableFormerMode,
    TableStructureOptions,
    TableStructureV2Options,
    TesseractCliOcrOptions,
)
from docling.datamodel.pipeline_options import LayoutObjectDetectionOptions  # noqa: E402
from docling.document_converter import DocumentConverter, ImageFormatOption  # noqa: E402

OCR_CHOICE = os.environ.get("DOCLING_OCR", "rapidocr").lower()
TF_CHOICE = os.environ.get("DOCLING_TF", "v1").lower()
LAYOUT_PRESET = os.environ.get("DOCLING_LAYOUT", "layout_heron_default")
SUFFIX = os.environ.get("DOCLING_SUFFIX", "docling")

if OCR_CHOICE == "rapidocr":
    ocr_options = RapidOcrOptions(mode=OcrMode.FULL_PAGE)
elif OCR_CHOICE == "tesseract":
    ocr_options = TesseractCliOcrOptions(mode=OcrMode.FULL_PAGE)
elif OCR_CHOICE == "easyocr":
    from docling.datamodel.pipeline_options import EasyOcrOptions

    ocr_options = EasyOcrOptions(mode=OcrMode.FULL_PAGE)
else:
    ocr_options = OcrAutoOptions(mode=OcrMode.FULL_PAGE)

table_options = (
    TableStructureV2Options()
    if TF_CHOICE == "v2"
    else TableStructureOptions(mode=TableFormerMode.ACCURATE)
)

pipeline_options = PdfPipelineOptions(
    do_ocr=True,
    do_table_structure=True,
    table_structure_options=table_options,
    ocr_options=ocr_options,
    layout_options=LayoutObjectDetectionOptions.from_preset(LAYOUT_PRESET),
)

converter = DocumentConverter(
    format_options={InputFormat.IMAGE: ImageFormatOption(pipeline_options=pipeline_options)}
)


def bbox_xyxy(bbox, page_height=None):
    """Normalise a docling BoundingBox to top-left-origin [x1, y1, x2, y2]."""
    if bbox is None:
        return None
    try:
        b = bbox
        origin = getattr(getattr(b, "coord_origin", None), "value", None)
        if origin == "BOTTOMLEFT" and page_height is not None:
            b = b.to_top_left_origin(page_height=page_height)
        return [float(b.l), float(b.t), float(b.r), float(b.b)]
    except Exception:
        return None


for path in sys.argv[1:]:
    p = pathlib.Path(path)
    t0 = time.time()
    result = converter.convert(str(p))
    elapsed = time.time() - t0
    doc = result.document

    # page height, for bottom-left -> top-left conversion
    page_heights = {}
    try:
        for no, page in doc.pages.items():
            page_heights[no] = float(page.size.height)
    except Exception:
        pass

    def ph_for(item):
        try:
            return page_heights.get(item.prov[0].page_no)
        except Exception:
            return None

    tables_html, cells, boxes, texts = [], [], [], []

    for tbl in getattr(doc, "tables", []):
        try:
            tables_html.append(tbl.export_to_html(doc=doc))
        except Exception as exc:  # pragma: no cover
            print(f"  ! export_to_html failed: {exc}", file=sys.stderr)
        h = ph_for(tbl)
        data = getattr(tbl, "data", None)
        if data is None:
            continue
        for c in getattr(data, "table_cells", []):
            cells.append(
                {
                    "text": c.text,
                    "row_span": c.row_span,
                    "col_span": c.col_span,
                    "start_row": c.start_row_offset_idx,
                    "end_row": c.end_row_offset_idx,
                    "start_col": c.start_col_offset_idx,
                    "end_col": c.end_col_offset_idx,
                    "column_header": c.column_header,
                    "bbox": bbox_xyxy(c.bbox, h),
                }
            )

    for item in getattr(doc, "texts", []):
        t = getattr(item, "text", "") or ""
        if not t.strip():
            continue
        texts.append(t)
        try:
            b = bbox_xyxy(item.prov[0].bbox, ph_for(item))
            if b:
                boxes.append(b)
        except Exception:
            pass

    out = {
        "source": p.name,
        "engine": "docling-2.119.0",
        "table_model": "tableformer-v2-otsl" if TF_CHOICE == "v2" else "tableformer-v1",
        "ocr_engine": OCR_CHOICE,
        "layout_preset": LAYOUT_PRESET,
        "elapsed_seconds": round(elapsed, 2),
        "table_count": len(tables_html),
        "tables_html": tables_html,
        # NOTE: deliberately NOT named "cells". score.py's load_generic() sums
        # cells parsed from tables_html *plus* everything under "cells", so
        # emitting both keys would double-count every cell and halve precision.
        # tables_html is the contract-preferred field; this is the same data
        # with geometry attached.
        "table_cells": cells,
        "texts": texts,
        "boxes": boxes,
        "markdown": doc.export_to_markdown(),
    }
    dest = OUT / f"{p.stem}.{SUFFIX}.json"
    dest.write_text(json.dumps(out, indent=2, ensure_ascii=False))
    print(
        f"wrote {dest.name} — {len(tables_html)} table(s), {len(cells)} cells, "
        f"{len(texts)} text items, {elapsed:.1f}s",
        flush=True,
    )
