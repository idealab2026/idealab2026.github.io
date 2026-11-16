#!/usr/bin/env python3
"""Guardarraíles #43 antes y después de la publicación: no cambiar SHA autorizado."""
import copy
import hashlib
import json
import tempfile
import unittest
import zipfile
from pathlib import Path

from notebooklm_publicar_43_corregida import (
    APPROVAL, INDEX, PINNED, validate_approval, verify_zip,
)
from notebooklm_revisar_lote5 import CANDIDATES


class Capitulo64CorregidoTests(unittest.TestCase):
    def test_manifest_pinned_to_original_and_corrected_sha(self):
        row = validate_approval(json.loads(APPROVAL.read_text(encoding="utf-8")))
        original = next(x for x in json.loads(CANDIDATES.read_text(encoding="utf-8"))["items"]
                        if x["issue"] == 43)
        self.assertEqual(row["source_original_sha256"], original["sha256"])
        self.assertEqual(row["video_id"], original["video_id"])
        self.assertEqual(row["chapter"], original["chapter"])
        for key, value in PINNED.items():
            self.assertEqual(row[key], value)
        self.assertNotEqual(row["corrected_sha256"], row["source_export_sha256"])

    def test_reject_forged_approval(self):
        row = json.loads(APPROVAL.read_text(encoding="utf-8"))
        a = copy.deepcopy(row)
        a["issue"] = 44
        with self.assertRaises(ValueError):
            validate_approval(a)
        a = copy.deepcopy(row)
        a["corrected_sha256"] = "0" * 64
        with self.assertRaises(ValueError):
            validate_approval(a)

    def test_reject_zip_with_unknown_file(self):
        row = json.loads(APPROVAL.read_text(encoding="utf-8"))
        with tempfile.TemporaryDirectory() as tmp:
            archive = Path(tmp) / "fake.zip"
            with zipfile.ZipFile(archive, "w") as f:
                f.writestr("issue-43-corregida.png", b"fake")
                f.writestr("unapproved.png", b"fake")
            with self.assertRaises(ValueError):
                verify_zip(archive, row)

    def test_public_index_valid_before_and_after_merge(self):
        row = validate_approval(json.loads(APPROVAL.read_text(encoding="utf-8")))
        index = json.loads(INDEX.read_text(encoding="utf-8"))
        chapters = index["books"]["conde-montecristo"].get("chapters", {})
        if row["video_id"] in chapters:
            target = f'./infografias/conde-montecristo/{row["video_id"]}.png'
            self.assertEqual(chapters[row["video_id"]], target)
            png = INDEX.parent / "conde-montecristo" / (row["video_id"] + ".png")
            self.assertTrue(png.is_file())
            self.assertEqual(hashlib.sha256(png.read_bytes()).hexdigest(),
                             row["corrected_sha256"])


if __name__ == "__main__":
    unittest.main()
