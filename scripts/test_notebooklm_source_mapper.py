#!/usr/bin/env python3
"""Offline checks: one infographic per catalogue video, never a mixed-tome image."""
import json
import sys
import unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
import notebooklm_source_mapper as m

ROOT = Path(__file__).resolve().parents[1]
C = json.loads((ROOT/"biblioteca-montecristo"/"catalogo.json").read_text(encoding="utf-8"))
MONTE = next(b for b in C["books"] if b["slug"] == "conde-montecristo")


class EpisodeMappingTests(unittest.TestCase):
    def test_chapter_number_and_ranges(self):
        self.assertEqual(m.chapter_interval("El conde. Cap 1 a 5"), (1,2,3,4,5))
        self.assertEqual(m.chapter_interval("El conde. Capítulo : 51"), (51,))
        self.assertEqual(m.chapter_interval("El conde. Cap 26: La posada"), (26,))
        self.assertIsNone(m.chapter_interval("Resumen del tomo II"))
        self.assertIsNone(m.chapter_interval("Capítulo 1000"))

    def test_montecristo_original_video_ranges(self):
        byid = {x["id"]: x for x in MONTE["chapters"]}
        self.assertEqual(m.chapter_interval(byid["KwKDcgK-NVc"]["title"]), (1,2,3,4,5))
        self.assertEqual(m.chapter_interval(byid["oVMG6QzBK64"]["title"]), (51,))
        self.assertEqual(m.chapter_interval(byid["BSoTWtrNVPc"]["title"]), (72,))

    def test_sources_with_exact_range(self):
        videos = [{"id":"oVMG6QzBK64","title":"Montecristo II. Capitulo 51"}]
        sources = [{"id":"abcdef1234567890","title":"Capítulo 51 novela completa"}]
        matched, skipped = m.suggestions(videos,sources)
        self.assertEqual(matched, {"oVMG6QzBK64":["abcdef1234567890"]})
        self.assertEqual(skipped, [])

    def test_entire_book_cannot_be_used_for_one_video(self):
        videos = [{"id":"oVMG6QzBK64","title":"Montecristo II. Capítulo 51"}]
        sources = [{"id":"abcdef1234567890","title":"El conde de Montecristo II, texto completo"}]
        matched, skipped = m.suggestions(videos,sources)
        self.assertEqual(matched, {})
        self.assertEqual(len(skipped),1)

    def test_grouped_video_requires_all_five(self):
        videos = [{"id":"KwKDcgK-NVc","title":"Montecristo. Cap 1 a 5"}]
        sources = [{"id":f"sourceeeee{n:05d}","title":f"Capitulo {n}"} for n in range(1,6)]
        matched, _ = m.suggestions(videos,sources)
        self.assertEqual(len(matched["KwKDcgK-NVc"]),5)
        matched2,skipped2=m.suggestions(videos,sources[:-1])
        self.assertNotIn("KwKDcgK-NVc",matched2)
        self.assertEqual(len(skipped2),1)

    def test_duplicate_source_is_ambiguous(self):
        videos = [{"id":"oVMG6QzBK64","title":"Cap. 51"}]
        sources = [{"id":"abcabcabcabc","title":"Cap. 51"},
                   {"id":"defdefdefdef","title":"Cap. 51"}]
        matched, skipped = m.suggestions(videos,sources)
        self.assertEqual(matched,{})
        self.assertEqual(len(skipped),1)

    def test_matching_source_youtube_url(self):
        videos = [{"id":"oVMG6QzBK64","title":"Capítulo 51"}]
        src = [{"id":"abcabcabcabc","title":"YouTube original",
                "url":"https://www.youtube.com/watch?v=oVMG6QzBK64"}]
        matched, _ = m.suggestions(videos,src)
        self.assertEqual(matched["oVMG6QzBK64"],["abcabcabcabc"])

    def test_gaps_and_duplicates_in_current_catalog(self):
        spans=[m.chapter_interval(x["title"]) for x in MONTE["chapters"]]
        recorded=[n for span in spans if span for n in span]
        self.assertNotIn(31,recorded)
        self.assertNotIn(52,recorded)
        self.assertEqual(recorded.count(34),2)


if __name__ == "__main__":
    unittest.main()
