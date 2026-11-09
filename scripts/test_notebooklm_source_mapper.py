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

    def test_numeric_pdf_names_match_exact_chapters(self):
        self.assertEqual(m.source_scope("51.pdf"), (51,))
        self.assertEqual(m.source_scope("100.pdf"), (100,))
        self.assertEqual(m.source_scope(" 72.PDF "), (72,))
        self.assertIsNone(m.source_scope("00.pdf"))
        self.assertIsNone(m.source_scope("1000.pdf"))
        self.assertIsNone(m.source_scope("montecristo-51.pdf"))
        self.assertIsNone(m.source_scope("51–100.pdf"))
        self.assertIsNone(m.source_scope("tomo-II.pdf"))

    def test_descriptive_numbered_pdf_filename(self):
        sample = {
            1: "1. Marsella. La llegada.pdf",
            2: "2. El padre y el hijo.pdf",
            3: "3. Los catalans.pdf",
            4: "4. Complot.pdf",
            5: "5. El banquete de compromiso.pdf",
            26: "26. La posada del Pont du Gard.pdf",
            27: "27. El relato.pdf",
            28: "28. Los registros de las prisiones.pdf",
            29: "29. La casa Morrel.pdf",
        }
        for chapter, filename in sample.items():
            with self.subTest(filename=filename):
                self.assertEqual(m.source_scope(filename), (chapter,))
        self.assertIsNone(m.source_scope("2026. Actualización.pdf"))
        self.assertIsNone(m.source_scope("26. 27.pdf"))
        self.assertIsNone(m.source_scope("26. Una nota.txt"))
        self.assertIsNone(m.source_scope("montecristo 26. La posada.pdf"))
        self.assertIsNone(m.source_scope("26. 2026.pdf"))

    def test_real_montecristo_tomo_i_50_pdf_titles(self):
        descriptions = {
            1: "Marsella. La llegada", 2: "El padre y el hijo",
            3: "Los catalans", 4: "Complot", 5: "El banquete de compromiso",
            26: "La posada del Pont du Gard", 27: "El relato",
            28: "Los registros de las prisiones", 29: "La casa Morrel",
        }
        videos = [c for c in MONTE["chapters"]
                  if (m.chapter_interval(c["title"]) or (999,))[0] <= 50]
        sources = [{
            "id": f"sourceid{n:08d}",
            "title": f"{n}. {descriptions[n]}.pdf" if n in descriptions else f"{n}.pdf",
        } for n in range(1, 51)]
        matches, unmatched = m.suggestions(videos, sources)
        self.assertEqual(len(videos), 31)
        self.assertEqual(len(matches), 31)
        self.assertEqual(unmatched, [])
        self.assertEqual(len(matches["KwKDcgK-NVc"]), 5)
        self.assertEqual(matches["EeJqT5KlvPA"], ["sourceid00000026"])
        self.assertEqual(matches["4fACchpbj-w"], ["sourceid00000029"])

    def test_real_montecristo_tomo_ii_filenames(self):
        videos = [c for c in MONTE["chapters"]
                  if (m.chapter_interval(c["title"]) or (0,))[0] >= 51]
        sources = [{"id": f"sourceid{number:08d}", "title": f"{number}.pdf",
                    "source_type": "pdf", "url": None}
                   for number in range(51, 101)]
        matched, unmatched = m.suggestions(videos, sources)
        self.assertEqual(len(videos), 21)
        self.assertEqual(len(matched), 21)
        self.assertEqual(unmatched, [])
        self.assertEqual(matched["oVMG6QzBK64"], ["sourceid00000051"])
        self.assertEqual(matched["BSoTWtrNVPc"], ["sourceid00000072"])
        self.assertNotIn("sourceid00000052", [src for ids in matched.values() for src in ids])

    def test_numeric_pdf_duplicates_must_be_rejected(self):
        videos = [{"id":"oVMG6QzBK64","title":"Cap. 51"}]
        sources = [{"id":"abcabcabcabc","title":"51.pdf"},
                   {"id":"defdefdefdef","title":"51.pdf"}]
        matched, skipped = m.suggestions(videos, sources)
        self.assertEqual(matched, {})
        self.assertEqual(len(skipped), 1)

    def test_grouped_video_with_numeric_pdf_files(self):
        videos = [{"id":"KwKDcgK-NVc","title":"Cap. 1 a 5"}]
        sources = [{"id":f"sourceeeee{n:05d}","title":f"{n}.pdf"}
                   for n in range(1,6)]
        matched, skipped = m.suggestions(videos,sources)
        self.assertEqual(len(matched["KwKDcgK-NVc"]), 5)
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
        # El catálogo incorpora ahora el capítulo 31; el hueco histórico quedó resuelto.
        self.assertIn(31,recorded)
        self.assertNotIn(52,recorded)
        self.assertEqual(recorded.count(34),2)


if __name__ == "__main__":
    unittest.main()
