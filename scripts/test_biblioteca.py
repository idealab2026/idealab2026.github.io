#!/usr/bin/env python3
"""Invariants of the publicly published Montecristo video catalog."""
import json
import re
import unittest
from pathlib import Path
from urllib.parse import urlsplit, parse_qs

ROOT = Path(__file__).resolve().parents[1]
CATALOG = ROOT / "biblioteca-montecristo" / "catalogo.json"

class BibliotecaTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.data = json.loads(CATALOG.read_text(encoding="utf-8"))

    def test_schema(self):
        self.assertEqual(self.data["version"], 2)
        self.assertEqual(self.data["kind"], "idealab-montecristo")
        self.assertRegex(self.data["channelId"], r"^UC[A-Za-z0-9_-]{22}$")
        self.assertGreater(len(self.data["books"]), 0)

    def test_books_and_episodes_are_distinct(self):
        slugs = [b["slug"] for b in self.data["books"]]
        self.assertEqual(len(slugs), len(set(slugs)))
        video_ids = []
        for b in self.data["books"]:
            self.assertTrue(b["title"])
            self.assertIsInstance(b["chapters"], list)
            self.assertGreater(len(b["chapters"]), 0, b["slug"])
            for c in b["chapters"]:
                self.assertTrue(re.fullmatch(r"[A-Za-z0-9_-]{11}", c["id"]))
                self.assertTrue(c["title"])
                self.assertIsInstance(c["description"], str)
                self.assertEqual(c["url"], "https://www.youtube.com/watch?v=" + c["id"])
                video_ids.append(c["id"])
        self.assertEqual(len(video_ids), len(set(video_ids)))

    def test_playlist_urls(self):
        for b in self.data["books"]:
            p = b.get("playlist", "")
            if p:
                split = urlsplit(p)
                self.assertEqual(split.hostname, "www.youtube.com")
                self.assertIn("list", parse_qs(split.query))

    def test_amazon_es_links(self):
        from urllib.parse import unquote
        for book in self.data["books"]:
            url = book["amazonUrl"]
            self.assertTrue(url.startswith("https://www.amazon.es/s?"), url)
            self.assertIn(book["title"], unquote(url), book["slug"])
            self.assertIn(book["author"], unquote(url), book["slug"])

    def test_notebooklm_public_image_index(self):
        from pathlib import PurePosixPath
        images = ROOT / "biblioteca-montecristo" / "infografias"
        index = json.loads((images / "index.json").read_text(encoding="utf-8"))
        self.assertEqual(index["version"], 1)
        slugs = {b["slug"]: b for b in self.data["books"]}
        for slug, block in index["books"].items():
            self.assertIn(slug, slugs)
            paths = []
            if block.get("book"):
                paths.append(("libro", block["book"]))
            for vid, image_path in block.get("chapters", {}).items():
                self.assertIn(vid, {c["id"] for c in slugs[slug]["chapters"]})
                paths.append((vid, image_path))
            for name, image_path in paths:
                expected = f"./infografias/{slug}/{name}.png"
                self.assertEqual(image_path, expected)
                file = ROOT / "biblioteca-montecristo" / image_path.removeprefix("./")
                self.assertTrue(file.is_file(), file)
                self.assertEqual(file.read_bytes()[:8], bytes([137, 80, 78, 71, 13, 10, 26, 10]))

    def test_web_assets(self):
        for item in ["index.html", "app.js", "styles.css", "catalogo.json", "infografias/index.json"]:
            self.assertTrue((ROOT / "biblioteca-montecristo" / item).is_file(), item)

if __name__ == "__main__":
    unittest.main()
