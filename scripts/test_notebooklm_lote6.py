#!/usr/bin/env python3
"""Regresión del lote 6. Sin acceso a NotebookLM, red ni archivos privados."""
from __future__ import annotations

import hashlib
import json
import struct
import tempfile
import unittest
import zipfile
import zlib
from pathlib import Path

from notebooklm_revisar_lote6 import (
    CATALOG, ISSUES, MANIFEST, PUBLIC,
    create_private_zip, digest, locate_zip_member,
    public_video_status, read_original, validate_manifest,
)


def chunk(kind: bytes, body: bytes) -> bytes:
    return struct.pack(">I", len(body)) + kind + body + struct.pack(">I", zlib.crc32(kind + body) & 0xffffffff)


def minimal_png() -> bytes:
    # The production sanitiser deliberately rejects images smaller than 640×350.
    width, height = 640, 350
    ihdr = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)
    pixels = (b"\x00" + b"\xff\xff\xff" * width) * height
    return (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr) +
            chunk(b"tEXt", b"Author\x00PRIVATE-LABEL") +
            chunk(b"IDAT", zlib.compress(pixels)) +
            chunk(b"IEND", b""))


class Lote6Tests(unittest.TestCase):
    def test_exact_eight_with_audit_hashes_and_catalog(self):
        data = json.loads(MANIFEST.read_text(encoding="utf-8"))
        catalog = json.loads(CATALOG.read_text(encoding="utf-8"))
        items = validate_manifest(data, catalog)
        self.assertEqual(tuple(x["issue"] for x in items), ISSUES)
        self.assertFalse(data["publication_authorized"])
        self.assertFalse(data["editorial_approval"])
        for x in items:
            audit = (MANIFEST.parent / x["audit"]).read_text(encoding="utf-8")
            self.assertIn(x["sha256"], audit)
            self.assertTrue(x["source_url"].endswith(f'Chapitre_{x["chapter"]}'))
            self.assertFalse(x["editorial_approved"])

    def test_current_manifest_paths_are_consistent_before_and_after_later_publication(self):
        source = json.loads(MANIFEST.read_text(encoding="utf-8"))
        catalog = json.loads(CATALOG.read_text(encoding="utf-8"))
        public = json.loads(PUBLIC.read_text(encoding="utf-8"))
        for item in validate_manifest(source, catalog):
            # Do not assert unpublished forever: later approved PRs may publish them.
            if public_video_status(item, public):
                expected = f'./infografias/{item["book"]}/{item["video_id"]}.png'
                self.assertEqual(public["books"][item["book"]]["chapters"][item["video_id"]], expected)

    def test_manifest_rejects_new_issue_and_premature_approval(self):
        data = json.loads(MANIFEST.read_text(encoding="utf-8"))
        catalog = json.loads(CATALOG.read_text(encoding="utf-8"))
        modified = json.loads(json.dumps(data))
        modified["originals"][0]["issue"] = 43
        with self.assertRaises(ValueError):
            validate_manifest(modified, catalog)
        modified = json.loads(json.dumps(data))
        modified["publication_authorized"] = True
        with self.assertRaises(ValueError):
            validate_manifest(modified, catalog)

    def test_zip_fallback_reads_only_selected_original_and_strips_metadata(self):
        raw = minimal_png()
        with tempfile.TemporaryDirectory() as tmp:
            base = Path(tmp)
            folder = base / "missing"
            folder.mkdir()
            previous_zip = base / "originales.zip"
            with zipfile.ZipFile(previous_zip, "w") as archive:
                archive.writestr("subfolder/issue-42.png", raw)
                archive.writestr("subfolder/issue-999.png", b"unrelated")
            row = {"issue": 42, "filename": "issue-42.png", "sha256": digest(raw),
                   "book": "conde-montecristo", "video_id": "ZIbj-2JLd9w", "chapter": 63}
            with zipfile.ZipFile(previous_zip) as archive:
                read = read_original(row, folder, archive)
            self.assertEqual(read, raw)
            outfile = base / "review.zip"
            create_private_zip([row], {42: raw}, outfile)
            with zipfile.ZipFile(outfile) as archive:
                self.assertEqual(set(archive.namelist()), {"issue-42.png", "manifest.json"})
                cleaned = archive.read("issue-42.png")
                self.assertNotIn(b"PRIVATE-LABEL", cleaned)
                self.assertNotIn(b"tEXt", cleaned)
                metadata = json.loads(archive.read("manifest.json"))
                entry = metadata["items"][0]
                self.assertEqual(entry["original_sha256"], hashlib.sha256(raw).hexdigest())
                self.assertEqual(entry["export_sha256"], hashlib.sha256(cleaned).hexdigest())
                self.assertFalse(entry["editorial_approval"])
                self.assertNotIn(str(folder), archive.read("manifest.json").decode())

    def test_duplicate_zip_entries_and_incomplete_exports_are_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            archive = Path(tmp) / "duplicates.zip"
            with zipfile.ZipFile(archive, "w") as z:
                z.writestr("a/issue-42.png", b"a")
                z.writestr("b/issue-42.png", b"b")
            with zipfile.ZipFile(archive) as z:
                with self.assertRaises(ValueError):
                    locate_zip_member(z, "issue-42.png")
            target = Path(tmp) / "no-partial.zip"
            row = {"issue": 42, "sha256": "0"*64, "filename": "issue-42.png"}
            with self.assertRaises(ValueError):
                create_private_zip([row], {}, target)
            self.assertFalse(target.exists())

    def test_wrong_original_hash_is_never_accepted(self):
        raw = minimal_png()
        with tempfile.TemporaryDirectory() as tmp:
            base = Path(tmp)
            (base/"issue-42.png").write_bytes(raw)
            row = {"issue": 42, "filename": "issue-42.png", "sha256": "a"*64}
            with self.assertRaises(ValueError):
                read_original(row, base, None)


if __name__ == "__main__":
    unittest.main()
