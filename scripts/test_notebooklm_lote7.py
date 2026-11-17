#!/usr/bin/env python3
"""Seguridad e integridad del lote 7. Sin Mac, red ni originales privados."""
from __future__ import annotations

import hashlib
import json
import struct
import tempfile
import unittest
import zipfile
import zlib
from pathlib import Path

from notebooklm_revisar_lote7 import (
    MANIFEST, PINNED, PUBLIC, ROOT,
    check_png, load_candidates, read_original, sha,
    write_review_zip, zip_identity,
)


def png_fixture(tint: int) -> bytes:
    def chunk(kind: bytes, data: bytes) -> bytes:
        return (struct.pack(">I", len(data)) + kind + data +
                struct.pack(">I", zlib.crc32(kind + data) & 0xffffffff))
    width, height = 2752, 1536
    ihdr = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)
    pixels = (b"\x00" + bytes((tint, 250, 245)) * width) * height
    return (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr)
            + chunk(b"tEXt", b"Author\x00" + b"PRIVATE-METADATA-" + b"X" * 120_000)
            + chunk(b"IDAT", zlib.compress(pixels))
            + chunk(b"IEND", b""))


class Lote7Tests(unittest.TestCase):
    def test_exact_eight_registered_and_not_auto_approved(self):
        rows = load_candidates(check_unpublished=False)
        self.assertEqual([row["issue"] for row in rows], list(PINNED))
        self.assertEqual([row["chapter"] for row in rows],
                         [51, 53, 54, 56, 57, 58, 60, 72])
        self.assertTrue(all(row["editorial_approved"] is False for row in rows))
        data = json.loads(MANIFEST.read_text(encoding="utf-8"))
        self.assertIs(data["publication_authorized"], False)
        self.assertTrue(all(row["expected_original_sha256"] is None for row in rows))

    def test_local_verified_file_requires_matching_private_job(self):
        row = load_candidates(check_unpublished=False)[0]
        raw = png_fixture(43)
        with tempfile.TemporaryDirectory() as tmp:
            folder = Path(tmp)
            file = folder / row["filename"]
            file.write_bytes(raw)
            state = {str(row["issue"]): {"phase": "downloaded",
                     "path": str(file), "request": {
                         "book": row["book"], "video_id": row["video_id"],
                         "volume": None}}}
            self.assertEqual(read_original(row, folder, state, None, {}), raw)
            bad_state = json.loads(json.dumps(state))
            bad_state[str(row["issue"])]["request"]["video_id"] = "00000000000"
            with self.assertRaises(ValueError):
                read_original(row, folder, bad_state, None, {})
            self.assertTrue(len(raw) > 100_000)

    def test_qa_archive_requires_manifest_video_and_hash(self):
        row = load_candidates(check_unpublished=False)[1]
        raw = png_fixture(72)
        with tempfile.TemporaryDirectory() as tmp:
            folder = Path(tmp)
            archive_file = folder / "old.zip"
            record = {"issue": row["issue"], "book": row["book"],
                      "video_id": row["video_id"], "name": row["filename"],
                      "volume": None, "sha256": sha(raw)}
            with zipfile.ZipFile(archive_file, "w") as z:
                z.writestr(row["filename"], raw)
                z.writestr("MANIFIESTO_QA.json", json.dumps(
                    {"version": 1, "count": 1, "issues": [record]}))
            with zipfile.ZipFile(archive_file) as z:
                identity = zip_identity(z)
                self.assertEqual(read_original(row, folder, {}, z, identity), raw)
                wrong = json.loads(json.dumps(identity))
                wrong[str(row["issue"])] = {"sha256": "0" * 64}
                with self.assertRaises(ValueError):
                    read_original(row, folder, {}, z, {row["issue"]: wrong[str(row["issue"])]})
                with self.assertRaises(ValueError):
                    read_original(row, folder, {}, z, {row["issue"]: dict(record, sha256="0"*64)})

    def test_archive_without_identity_rejected_even_if_filename_matches(self):
        row = load_candidates(check_unpublished=False)[0]
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            file = root / "name-only.zip"
            with zipfile.ZipFile(file, "w") as z:
                z.writestr(row["filename"], png_fixture(44))
            with zipfile.ZipFile(file) as z:
                with self.assertRaises(ValueError):
                    zip_identity(z)

    def test_sanitized_export_has_new_hash_and_no_personal_path(self):
        row = load_candidates(check_unpublished=False)[0]
        raw = png_fixture(55)
        check_png(raw)
        with tempfile.TemporaryDirectory() as tmp:
            destination = Path(tmp) / "review.zip"
            write_review_zip([row], {row["issue"]: raw}, destination)
            with zipfile.ZipFile(destination) as z:
                self.assertEqual(set(z.namelist()), {row["filename"], "manifest.json"})
                content = z.read(row["filename"])
                self.assertNotIn(b"PRIVATE-METADATA", content)
                self.assertNotIn(b"tEXt", content)
                exported = json.loads(z.read("manifest.json"))
                record = exported["items"][0]
                self.assertEqual(record["original_sha256"], hashlib.sha256(raw).hexdigest())
                self.assertEqual(record["export_sha256"], hashlib.sha256(content).hexdigest())
                self.assertFalse(record["editorial_approved"])
                self.assertFalse(exported["publication_authorized"])
                self.assertNotIn(str(tmp), z.read("manifest.json").decode())

    def test_incomplete_export_fails_closed(self):
        row = load_candidates(check_unpublished=False)[0]
        with tempfile.TemporaryDirectory() as tmp:
            out = Path(tmp) / "partial.zip"
            with self.assertRaises(ValueError):
                write_review_zip([row], {}, out)
            self.assertFalse(out.exists())


if __name__ == "__main__":
    unittest.main()
