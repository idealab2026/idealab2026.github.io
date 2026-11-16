#!/usr/bin/env python3
"""Controles del preflight sin acceso a PNG ni credenciales privadas."""
import hashlib
import json
import tempfile
import unittest
from pathlib import Path

from notebooklm_revisar_lote5 import (
    CANDIDATES, CATALOG, PUBLIC_INDEX, PNG_SIGNATURE,
    inspect_item, render_report, validate_manifest,
)


class Lote5Tests(unittest.TestCase):
    def test_candidates_are_exactly_eight_unapproved(self):
        data = json.loads(CANDIDATES.read_text(encoding="utf-8"))
        rows = validate_manifest(data)
        self.assertEqual({x["issue"] for x in rows}, {43, 44, 46, 50, 87, 89, 90, 92})
        self.assertEqual(data["review_status"], "PENDIENTE_DE_REVISION_EDITORIAL")
        catalog = json.loads(CATALOG.read_text(encoding="utf-8"))
        public = json.loads(PUBLIC_INDEX.read_text(encoding="utf-8"))
        book = next(b for b in catalog["books"] if b["slug"] == "conde-montecristo")
        all_ids = {c["id"] for c in book["chapters"]}
        indexed = set(public["books"]["conde-montecristo"].get("chapters", {}))
        for row in rows:
            self.assertIn(row["video_id"], all_ids)
            self.assertNotIn(row["video_id"], indexed)
            self.assertEqual(row["source_url"].rsplit("_", 1)[-1], str(row["chapter"]))

    def test_all_original_hashes_match_prior_audit(self):
        audit = (CANDIDATES.parent / "REVISION_LOTE_30_2026-11-15.md").read_text(encoding="utf-8")
        for row in validate_manifest(json.loads(CANDIDATES.read_text(encoding="utf-8"))):
            matching = [line for line in audit.splitlines()
                        if f'issues/{row["issue"]})' in line]
            self.assertEqual(len(matching), 1)
            self.assertIn(row["sha256"], matching[0])

    def test_synthetic_png_integrity_and_html_never_approve(self):
        image_bytes = PNG_SIGNATURE + b"local-only-fixture"
        with tempfile.TemporaryDirectory() as tmp:
            pending = Path(tmp)
            target = pending / "issue-43.png"
            target.write_bytes(image_bytes)
            data = {
                "issue": 43, "chapter": 64, "title": "El mendigo",
                "book": "conde-montecristo", "video_id": "0kIC9eByrOs",
                "sha256": hashlib.sha256(image_bytes).hexdigest(),
                "source_url": "https://fr.wikisource.org/wiki/Le_Comte_de_Monte-Cristo/Chapitre_64",
                "review_focus": "Validación de imágenes."
            }
            state = {"43": {"phase": "downloaded", "request": {
                "book": "conde-montecristo", "video_id": "0kIC9eByrOs"},
                "path": str(target)}}
            catalog = {"books": [{"slug": "conde-montecristo",
                        "chapters": [{"id": "0kIC9eByrOs"}]}]}
            public = {"books": {"conde-montecristo": {"chapters": {}}}}
            result = inspect_item(data, state, catalog, public, pending)
            self.assertTrue(result["technical_ok"])
            self.assertFalse(result["editorial_approval"])
            self.assertIn("REVISIÓN EDITORIAL PENDIENTE", render_report([result]))
            self.assertIn("file://", render_report([result]))
            target.write_bytes(image_bytes + b"modified")
            changed = inspect_item(data, state, catalog, public, pending)
            self.assertFalse(changed["hash_ok"])
            self.assertFalse(changed["technical_ok"])
            public["books"]["conde-montecristo"]["chapters"]["0kIC9eByrOs"] = "./infografias/conde-montecristo/0kIC9eByrOs.png"
            repeated = inspect_item(data, state, catalog, public, pending)
            self.assertTrue(repeated["published"])
            self.assertFalse(repeated["technical_ok"])

    def test_manifest_rejects_duplicate_and_bogus_hash(self):
        data = json.loads(CANDIDATES.read_text(encoding="utf-8"))
        data["items"][1]["issue"] = data["items"][0]["issue"]
        with self.assertRaises(ValueError):
            validate_manifest(data)
        data["items"][1]["issue"] = 44
        data["items"][0]["sha256"] = "bad"
        with self.assertRaises(ValueError):
            validate_manifest(data)


if __name__ == "__main__":
    unittest.main()
