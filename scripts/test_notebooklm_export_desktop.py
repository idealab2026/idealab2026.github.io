#!/usr/bin/env python3
"""Pruebas offline del exportador privado de NotebookLM (sin sips ni red)."""
from __future__ import annotations

import csv
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import notebooklm_export_desktop as e

CAT = json.loads(e.CATALOG.read_text(encoding="utf-8"))
BOOK = next(x for x in CAT["books"] if x["slug"] == "conde-montecristo")
EP1 = next(x for x in BOOK["chapters"] if x["id"] == "KwKDcgK-NVc")
EP2 = next(x for x in BOOK["chapters"] if x["id"] == "JDBc-CWyqYY")
EP34 = next(x for x in BOOK["chapters"] if x["id"] == "Ef0cYAhSZbI")
EP34B = next(x for x in BOOK["chapters"] if x["id"] == "tdqeCtQ16ds")


class ExportTests(unittest.TestCase):
    def test_chapter_labels_and_books(self):
        self.assertIn("01-05", e.chapter_label("conde-montecristo", EP1, 1))
        self.assertIn("La caida de Edmond Dantes", e.chapter_label("conde-montecristo", EP1, 1))
        self.assertIn("21-25", e.chapter_label("conde-montecristo", EP2, 2))
        self.assertEqual(e.book_volume("conde-montecristo", EP1), "Tomo I")
        self.assertIsNone(e.book_volume("sapiens", EP1))
        self.assertIn("53", e.chapter_label("conde-montecristo",
            next(x for x in BOOK["chapters"] if x["id"] == "FkAIE4ypFaI"), 32))

    def test_duplicate_chapter_34_has_distinct_names(self):
        with tempfile.TemporaryDirectory() as tmp:
            a = e.image_destination(BOOK, EP34, "76", None, 13, Path(tmp))
            b = e.image_destination(BOOK, EP34B, "extra", None, 14, Path(tmp))
            self.assertNotEqual(a, b)
            self.assertEqual(a.suffix, ".jpg")
            self.assertTrue(str(a).startswith(tmp))
            self.assertIn("Tomo I", str(a))

    def test_illegal_characters_removed_from_filename(self):
        unsafe = e.safe_name('../Cap 1: "secret" / año?.jpg')
        self.assertNotIn("/", unsafe)
        self.assertNotIn(":", unsafe)
        self.assertNotIn('"', unsafe)
        self.assertNotIn("?", unsafe)

    def test_local_originals_and_inventory_without_publishing(self):
        with tempfile.TemporaryDirectory() as tmp:
            p = Path(tmp)
            originals = p / "Pendientes"
            originals.mkdir()
            img1 = originals / "issue-63.png"
            img2 = originals / "issue-16.png"
            img1.write_bytes(b"fake PNG 63")
            img2.write_bytes(b"fake PNG 16")
            state = {
                "16": {"phase": "downloaded", "path": str(img2),
                       "request": {"book": "conde-montecristo", "video_id": None, "volume": "tomo-i"}},
                "63": {"phase": "downloaded", "path": str(img1),
                       "request": {"book": "conde-montecristo", "video_id": EP1["id"], "volume": None}},
                "67": {"phase": "deferred",
                       "request": {"book": "conde-montecristo", "video_id": EP2["id"], "volume": None}},
            }
            called = []
            def fake_convert(raw, dest):
                called.append(str(dest))
                dest.parent.mkdir(parents=True, exist_ok=True)
                dest.write_bytes(b"\xff\xd8" + b"J" * 300 + b"\xff\xd9")
            with patch.object(e, "PENDING", originals):
                result = e.export_known(state, p / "Originales NotebookLM",
                    catalog=CAT, converter=fake_convert, verbose=False)
                self.assertEqual(result["exported_videos"], 1)
                self.assertEqual(result["exported_generals"], 1)
                self.assertEqual(result["total_videos"], 173)
                self.assertFalse(result["errors"])
                self.assertEqual(len(called), 2)
                result2 = e.export_known(state, p / "Originales NotebookLM",
                    catalog=CAT, converter=fake_convert, verbose=False)
                self.assertEqual(len(called), 2, "Re-exporting must not overwrite existing originals")
                self.assertEqual(result2["exported_videos"], 1)
                with Path(result["inventory"]).open(encoding="utf-8-sig", newline="") as stream:
                    lines = list(csv.DictReader(stream))
                self.assertEqual(len(lines), 173)
                self.assertEqual(sum(r["NotebookLM"] == "Exportada JPG" for r in lines), 1)
                self.assertFalse(any(r["ChatGPT"] != "Pendiente" for r in lines))
                self.assertTrue(any("Infografias generales" in str(x) for x in called))

    def test_no_other_user_file_can_be_read_from_state(self):
        with tempfile.TemporaryDirectory() as tmp:
            p = Path(tmp)
            folder = p / "Pendientes"
            folder.mkdir()
            rogue = p / "private.png"
            rogue.write_bytes(b"arbitrary private data")
            state = {"63": {"phase": "downloaded", "path": str(rogue),
                            "request": {"book": "conde-montecristo", "video_id": EP1["id"], "volume": None}}}
            with patch.object(e, "PENDING", folder):
                report = e.export_known(state, p / "library", catalog=CAT,
                                         converter=lambda data, path: self.fail("Unexpected conversion"),
                                         verbose=False)
            self.assertEqual(report["exported_videos"], 0)
            self.assertEqual(len(report["errors"]), 1)


if __name__ == "__main__":
    unittest.main()
