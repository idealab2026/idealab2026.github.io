#!/usr/bin/env python3
"""Guardarraíles de aprobación del lote 6, válidos antes y después de Pages."""
import copy
import hashlib
import json
import tempfile
import unittest
import zipfile
from pathlib import Path

from notebooklm_publicar_lote6_corregidas import (
    APPROVAL, CANDIDATES, INDEX, PINNED,
    validate_approval, verify_zip,
)


class Lote6PublicacionTests(unittest.TestCase):
    def test_exact_three_pinned_to_originals(self):
        data = json.loads(APPROVAL.read_text(encoding="utf-8"))
        source = json.loads(CANDIDATES.read_text(encoding="utf-8"))
        rows = validate_approval(data, source)
        self.assertEqual({x["issue"] for x in rows}, {42, 69, 85})
        self.assertEqual(data["blocked_issues"], [45, 47, 48, 49, 68])
        for row in rows:
            self.assertEqual((row["video_id"], row["corrected_sha256"]), PINNED[row["issue"]])

    def test_manifest_mutation_never_approves_other_issue(self):
        data = json.loads(APPROVAL.read_text(encoding="utf-8"))
        source = json.loads(CANDIDATES.read_text(encoding="utf-8"))
        invalid = copy.deepcopy(data)
        invalid["items"][0]["issue"] = 47
        with self.assertRaises(ValueError):
            validate_approval(invalid, source)
        invalid = copy.deepcopy(data)
        invalid["items"][2]["corrected_sha256"] = "a" * 64
        with self.assertRaises(ValueError):
            validate_approval(invalid, source)

    def test_zip_with_extra_file_rejected(self):
        data = json.loads(APPROVAL.read_text(encoding="utf-8"))
        source = json.loads(CANDIDATES.read_text(encoding="utf-8"))
        rows = validate_approval(data, source)
        with tempfile.TemporaryDirectory() as tmp:
            archive = Path(tmp) / "fake.zip"
            with zipfile.ZipFile(archive, "w") as z:
                z.writestr("issue-42-corregida.png", b"not-png")
                z.writestr("secret.txt", b"never accept")
            with self.assertRaises(ValueError):
                verify_zip(archive, rows)

    def test_published_files_match_exact_corrected_sha(self):
        data = json.loads(APPROVAL.read_text(encoding="utf-8"))
        source = json.loads(CANDIDATES.read_text(encoding="utf-8"))
        rows = validate_approval(data, source)
        chapters = json.loads(INDEX.read_text(encoding="utf-8"))["books"]["conde-montecristo"]["chapters"]
        for row in rows:
            video = row["video_id"]
            if video in chapters:
                self.assertEqual(chapters[video], f"./infografias/conde-montecristo/{video}.png")
                image = INDEX.parent / "conde-montecristo" / f"{video}.png"
                self.assertTrue(image.is_file())
                self.assertEqual(hashlib.sha256(image.read_bytes()).hexdigest(),
                                 row["corrected_sha256"])


if __name__ == "__main__":
    unittest.main()
