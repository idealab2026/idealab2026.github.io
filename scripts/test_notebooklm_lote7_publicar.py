#!/usr/bin/env python3
"""Regresión del lote 7: solo autorizar #39 y #51 con sus SHA-256 exactos."""
import copy
import hashlib
import json
import tempfile
import unittest
import zipfile
from pathlib import Path

from notebooklm_publicar_lote7_aprobadas import (
    APPROVAL, CANDIDATES, INDEX, PINNED,
    verify_approval, read_review_zip,
)

# La aprobación del lote 7 sigue fijando los originales. La revisión posterior
# del capítulo 60 sustituyó solo su ilustración del telégrafo y documentó la
# nueva versión por hash; no autoriza otros cambios ni modifica el importador.
PUBLISHED_REPLACEMENT_SHA256 = {
    39: "ec2e71c4b54afaa20529ee119c883d6604f7471077dc325ab235340c6cd93ba6",
}


class Lote7AprobadasTests(unittest.TestCase):
    def test_only_two_originals_are_approved_with_pinned_hashes(self):
        approved = json.loads(APPROVAL.read_text(encoding="utf-8"))
        candidates = json.loads(CANDIDATES.read_text(encoding="utf-8"))
        rows = verify_approval(approved, candidates)
        self.assertEqual([r["issue"] for r in rows], [39, 51])
        self.assertEqual(approved["blocked_issues"], [27, 32, 33, 35, 36, 37])
        for row in rows:
            expected_video, expected_original_sha, expected_export_sha = PINNED[row["issue"]]
            self.assertEqual(row["video_id"], expected_video)
            self.assertEqual(row["original_sha256"], expected_original_sha)
            self.assertEqual(row["export_sha256"], expected_export_sha)
            self.assertTrue(row["editorial_approved"])

    def test_reject_unauthorized_issue_and_mutated_hash(self):
        approved = json.loads(APPROVAL.read_text(encoding="utf-8"))
        candidates = json.loads(CANDIDATES.read_text(encoding="utf-8"))
        bad = copy.deepcopy(approved)
        bad["items"][0]["issue"] = 37
        with self.assertRaises(ValueError):
            verify_approval(bad, candidates)
        bad = copy.deepcopy(approved)
        bad["items"][1]["export_sha256"] = "0" * 64
        with self.assertRaises(ValueError):
            verify_approval(bad, candidates)
        bad = copy.deepcopy(approved)
        bad["approved_issues"] = [27, 39, 51]
        with self.assertRaises(ValueError):
            verify_approval(bad, candidates)

    def test_reject_zip_with_extra_or_missing_members(self):
        approved = json.loads(APPROVAL.read_text(encoding="utf-8"))
        candidates = json.loads(CANDIDATES.read_text(encoding="utf-8"))
        rows = verify_approval(approved, candidates)
        with tempfile.TemporaryDirectory() as tmp:
            bad_zip = Path(tmp) / "unapproved.zip"
            with zipfile.ZipFile(bad_zip, "w") as archive:
                archive.writestr("issue-39.png", b"not-a-valid-png")
                archive.writestr("secret-private-state.json", b"not-approved")
            with self.assertRaises(ValueError):
                read_review_zip(bad_zip, rows)

    def test_index_before_or_after_publication_only_exact_approved_png(self):
        approved = json.loads(APPROVAL.read_text(encoding="utf-8"))
        candidates = json.loads(CANDIDATES.read_text(encoding="utf-8"))
        rows = verify_approval(approved, candidates)
        index = json.loads(INDEX.read_text(encoding="utf-8"))
        chapters = index["books"]["conde-montecristo"]["chapters"]
        for row in rows:
            video = row["video_id"]
            if video in chapters:
                self.assertEqual(
                    chapters[video],
                    f"./infografias/conde-montecristo/{video}.png",
                )
                path = INDEX.parent / "conde-montecristo" / f"{video}.png"
                self.assertTrue(path.is_file())
                self.assertEqual(
                    hashlib.sha256(path.read_bytes()).hexdigest(),
                    PUBLISHED_REPLACEMENT_SHA256.get(row["issue"], row["export_sha256"]),
                )


if __name__ == "__main__":
    unittest.main()
