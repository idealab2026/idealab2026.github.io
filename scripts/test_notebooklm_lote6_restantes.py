#!/usr/bin/env python3
"""QA del publicador: cinco hashes nuevos; nunca permitir originales rechazados."""
import copy
import hashlib
import json
import tempfile
import unittest
import zipfile
from pathlib import Path

from notebooklm_publicar_lote6_restantes import (
    APPROVAL, CANDIDATES, INDEX, PINNED, validate_approval, verify_zip,
)

class Lote6RestantesTests(unittest.TestCase):
    def test_only_five_corrected_images_are_approved(self):
        approvals = json.loads(APPROVAL.read_text(encoding="utf-8"))
        source = json.loads(CANDIDATES.read_text(encoding="utf-8"))
        rows = validate_approval(approvals, source)
        self.assertEqual([r["issue"] for r in rows], [45, 47, 48, 49, 68])
        self.assertEqual(approvals["blocked_issues"], [])
        self.assertEqual({r["issue"] for r in rows}, set(PINNED))
        for row in rows:
            self.assertEqual((row["video_id"], row["corrected_sha256"]), PINNED[row["issue"]])
            self.assertNotEqual(row["corrected_sha256"], row["source_export_sha256"])

    def test_reject_modified_hash_or_unapproved_issue(self):
        approvals = json.loads(APPROVAL.read_text(encoding="utf-8"))
        source = json.loads(CANDIDATES.read_text(encoding="utf-8"))
        altered = copy.deepcopy(approvals)
        altered["items"][0]["issue"] = 43
        with self.assertRaises(ValueError):
            validate_approval(altered, source)
        altered = copy.deepcopy(approvals)
        altered["items"][3]["corrected_sha256"] = "a" * 64
        with self.assertRaises(ValueError):
            validate_approval(altered, source)
        altered = copy.deepcopy(approvals)
        altered["items"][1]["approved_for_publication"] = False
        with self.assertRaises(ValueError):
            validate_approval(altered, source)

    def test_zip_with_unknown_file_is_rejected(self):
        approvals = json.loads(APPROVAL.read_text(encoding="utf-8"))
        source = json.loads(CANDIDATES.read_text(encoding="utf-8"))
        rows = validate_approval(approvals, source)
        with tempfile.TemporaryDirectory() as tmp:
            archive = Path(tmp) / "unapproved.zip"
            with zipfile.ZipFile(archive, "w") as z:
                z.writestr("issue-45-corregida.png", b"not-png")
                z.writestr("not-approved.png", b"not-png")
            with self.assertRaises(ValueError):
                verify_zip(archive, rows)

    def test_public_index_consistent_before_and_after_new_publication(self):
        approvals = json.loads(APPROVAL.read_text(encoding="utf-8"))
        source = json.loads(CANDIDATES.read_text(encoding="utf-8"))
        rows = validate_approval(approvals, source)
        chapters = json.loads(INDEX.read_text(encoding="utf-8"))["books"]["conde-montecristo"]["chapters"]
        for row in rows:
            video = row["video_id"]
            if video in chapters:
                self.assertEqual(chapters[video], f"./infografias/conde-montecristo/{video}.png")
                image = INDEX.parent / "conde-montecristo" / f"{video}.png"
                self.assertTrue(image.is_file())
                self.assertEqual(hashlib.sha256(image.read_bytes()).hexdigest(), row["corrected_sha256"])

if __name__ == "__main__":
    unittest.main()
