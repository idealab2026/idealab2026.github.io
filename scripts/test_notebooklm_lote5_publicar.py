#!/usr/bin/env python3
"""Guardarraíles: nunca publicar cinco originales rechazados del lote 5."""
import copy
import hashlib
import json
import unittest

from notebooklm_publicar_lote5 import APPROVED, ALLOWED, validate_manifest
from notebooklm_revisar_lote5 import CANDIDATES, PUBLIC_INDEX


class Lote5PublicacionTests(unittest.TestCase):
    def test_approval_issue_hashes_match_eight_originals(self):
        approved = json.loads(APPROVED.read_text(encoding="utf-8"))
        items = validate_manifest(approved)
        candidates = {i["issue"]: i for i in json.loads(CANDIDATES.read_text(encoding="utf-8"))["items"]}
        self.assertEqual({i["issue"] for i in items}, {46, 89, 90})
        for i in items:
            self.assertEqual(i["video_id"], candidates[i["issue"]]["video_id"])
            self.assertEqual(i["sha256"], candidates[i["issue"]]["sha256"])
            self.assertEqual(i["export_sha256"], {
                46:"b60459b00c1b9b354193b208c5e4174d577e6f0d0a90818a5c0ea14097e62b9c",
                89:"86b14d6de83687ec61d17e44cc3e57ae238bccafff1ed350a299af91c0b4233e",
                90:"fe1eaf2a59aba9499f3e7a2f70b1b949800262779db1084dfce3395f59e7d44f",
            }[i["issue"]])
        self.assertFalse(ALLOWED & {43,44,50,87,92})

    def test_manifest_fails_closed_for_new_issue_or_modified_hash(self):
        data = json.loads(APPROVED.read_text(encoding="utf-8"))
        invalid = copy.deepcopy(data)
        invalid["items"][0]["issue"] = 43
        with self.assertRaises(ValueError):
            validate_manifest(invalid)
        invalid = copy.deepcopy(data)
        invalid["items"][1]["sha256"] = "0" * 64
        # A different but well-formed SHA is rejected at runtime vs local original.
        self.assertEqual(validate_manifest(invalid)[1]["sha256"], "0" * 64)
        invalid = copy.deepcopy(data)
        invalid["items"][2]["approved_for_publication"] = False
        with self.assertRaises(ValueError):
            validate_manifest(invalid)

    def test_no_duplicate_in_current_public_manifest(self):
        data = json.loads(APPROVED.read_text(encoding="utf-8"))
        public = json.loads(PUBLIC_INDEX.read_text(encoding="utf-8"))
        published = public["books"]["conde-montecristo"].get("chapters", {})
        for item in validate_manifest(data):
            self.assertNotIn(item["video_id"], published)


if __name__ == "__main__":
    unittest.main()
