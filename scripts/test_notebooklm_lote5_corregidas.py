#!/usr/bin/env python3
"""Verificar autorizaciones exactas de las cuatro correcciones del lote 5."""
import copy
import hashlib
import json
import unittest

from notebooklm_publicar_lote5_corregidas import (
    APPROVAL, ALLOWED, INDEX, validate_manifest,
)
from notebooklm_revisar_lote5 import CANDIDATES


PINNED = {
    44: "0e2734ee826a6e1d21589acc0807063e041b2778ace46676ef3bf811887c69f7",
    50: "01f9c7a089337fe271dbb3fe9a059d286a449c84f8f19505bd866a2323d7d544",
    87: "0beb06023affbef88777b0bbfe19dfdb4f84705d1b087c7ae925ca2a416a71f6",
    92: "88a9efc1fce33c61e52b7168d445161bdb40e15e3b341498525c0cf765150f5d",
}


class Lote5CorregidasTests(unittest.TestCase):
    def test_exact_four_approved_and_43_blocked(self):
        data=json.loads(APPROVAL.read_text(encoding="utf-8"))
        rows=validate_manifest(data)
        self.assertEqual(tuple(x["issue"] for x in rows),ALLOWED)
        self.assertEqual(data["blocked_issues"],[43])
        candidates={x["issue"]:x for x in json.loads(CANDIDATES.read_text(encoding="utf-8"))["items"]}
        for row in rows:
            self.assertEqual(row["corrected_sha256"],PINNED[row["issue"]])
            self.assertNotEqual(row["corrected_sha256"],row["source_export_sha256"])
            self.assertEqual(row["video_id"],candidates[row["issue"]]["video_id"])
            self.assertEqual(row["source_original_sha256"],candidates[row["issue"]]["sha256"])

    def test_approval_does_not_allow_any_additional_issue(self):
        data=json.loads(APPROVAL.read_text(encoding="utf-8"))
        altered=copy.deepcopy(data)
        altered["items"][0]["issue"]=43
        with self.assertRaises(ValueError):
            validate_manifest(altered)
        altered=copy.deepcopy(data)
        altered["items"][1]["corrected_sha256"]="invalid"
        with self.assertRaises(ValueError):
            validate_manifest(altered)

    def test_current_index_before_or_after_publication_is_safe(self):
        approvals=json.loads(APPROVAL.read_text(encoding="utf-8"))
        published=json.loads(INDEX.read_text(encoding="utf-8"))["books"]["conde-montecristo"]["chapters"]
        candidates={x["issue"]:x for x in json.loads(CANDIDATES.read_text(encoding="utf-8"))["items"]}
        self.assertNotIn(candidates[43]["video_id"],published)
        for row in validate_manifest(approvals):
            vid=row["video_id"]
            if vid in published:
                self.assertEqual(published[vid],f"./infografias/conde-montecristo/{vid}.png")
                path=INDEX.parent/"conde-montecristo"/(vid+".png")
                self.assertTrue(path.is_file())
                self.assertEqual(hashlib.sha256(path.read_bytes()).hexdigest(),PINNED[row["issue"]])


if __name__=="__main__":
    unittest.main()
