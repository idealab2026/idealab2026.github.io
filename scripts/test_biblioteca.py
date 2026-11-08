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

    def test_web_assets(self):
        for item in ["index.html", "app.js", "styles.css", "catalogo.json"]:
            self.assertTrue((ROOT / "biblioteca-montecristo" / item).is_file(), item)

if __name__ == "__main__":
    unittest.main()
