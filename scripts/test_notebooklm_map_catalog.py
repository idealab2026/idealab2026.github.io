#!/usr/bin/env python3
"""Offline tests for safe, catalogue-wide NotebookLM source routing."""
import json
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import notebooklm_map_catalog as m

CAT = json.loads(m.CATALOG.read_text(encoding="utf-8"))
BOOKS = {x["slug"]: x for x in CAT["books"]}

class MapCatalogTests(unittest.TestCase):
    def test_book_aliases_do_not_match_unrelated_notebooks(self):
        for slug, aliases in m.ALIASES.items():
            notebook = [{"id": "notebookid012345", "title": aliases[0].replace(" ", " ").upper()}]
            self.assertIsNotNone(m.find_notebook(slug, notebook))
        self.assertIsNone(m.find_notebook("sapiens", [{"id": "notebookid012345", "title": "CULTURA - CINE"}]))
        self.assertIsNone(m.find_notebook("sapiens", [
            {"id": "notebookid012345", "title": "CULTURA - LIBROS - SAPIENS"},
            {"id": "notebookid098765", "title": "CULTURA - LIBROS - SAPIENS II"},
        ]))

    def test_numeric_chapters(self):
        self.assertEqual(m.chapter_key("sapiens", "Sapiens - 3. Un día en la vida de Adán y Eva"), ("chapter", 3))
        self.assertEqual(m.chapter_key("sapiens", "Sapiens. Epílogo - El animal que se hizo dios"), ("epi",))
        self.assertEqual(m.chapter_key("la-ola-que-viene", "La ola que viene. Capítulo 15"), ("chapter", 15))
        self.assertEqual(m.chapter_key("psicologia-dinero", "Capítulo 21: La historia interminable"), ("chapter", 21))
        self.assertEqual(m.chapter_key("espana-solucion", "Capítulo 1: Introducción"), ("chapter", 1))
        self.assertEqual(m.chapter_key("libertad-igualdad", "Epílogo - Una nueva mentalidad"), ("epi",))
        self.assertEqual(m.chapter_key("la-ola-que-viene", "15.pdf", source=True), ("chapter", 15))
        self.assertIsNone(m.chapter_key("la-ola-que-viene", "2026. Presupuesto.pdf", source=True))

    def test_roman_chapter_and_subpart_stay_distinct(self):
        self.assertEqual(m.chapter_key("esto-no-existe", "Introducción"), ("intro",))
        self.assertEqual(m.chapter_key("esto-no-existe", "Cap I: La narrativa - parte I"), ("chapter", 1, 1))
        self.assertEqual(m.chapter_key("esto-no-existe", "Cap I: La narrativa - parte II"), ("chapter", 1, 2))
        self.assertEqual(m.chapter_key("esto-no-existe", "Cap IV: La denuncia - Parte II"), ("chapter", 4, 2))
        self.assertEqual(m.chapter_key("esto-no-existe", "Cap 6: La reacción"), ("chapter", 6, None))
        self.assertNotEqual(m.chapter_key("esto-no-existe", "Cap I: parte I"), m.chapter_key("esto-no-existe", "Cap I: parte II"))

    def test_utopia_book_first_vs_second(self):
        self.assertEqual(m.chapter_key("utopia", "Utopía - Libro Primero"), ("book", 1))
        self.assertEqual(m.chapter_key("utopia", "Utopía - Libro Segundo. Cap 9"), ("book", 2, 9))
        self.assertIsNone(m.chapter_key("utopia", "Capítulo 9")) 

    def test_1984_requires_part_and_unambiguous_chapter(self):
        self.assertEqual(m.chapter_key("1984", "Parte II: Capítulo VII"), ("part", 2, 7))
        self.assertEqual(m.chapter_key("1984", "Parte III: Capítulo VI"), ("part", 3, 6))
        self.assertEqual(m.chapter_key("1984", "1984. LIBRO DE GOLDSTEIN"), ("goldstein",))
        self.assertIsNone(m.chapter_key("1984", "Capítulo 15 - Parte 2: Capítulo 7"))
        self.assertIsNone(m.chapter_key("1984", "Capítulo 7"))

    def test_source_match_only_if_unambiguous(self):
        eps = [
            {"id": "aaaabbbbccc", "title": "La ola que viene. Capítulo 1"},
            {"id": "ddddeeeefff", "title": "La ola que viene. Capítulo 2"},
        ]
        src = [
            {"id": "sourceid00001", "title": "1.pdf"},
            {"id": "sourceid00002", "title": "2. Título.pdf"},
            {"id": "sourceid00003", "title": "2. Otro.pdf"},
        ]
        self.assertEqual(m.candidate_sources("la-ola-que-viene", eps, src), {"aaaabbbbccc": "sourceid00001"})
        self.assertEqual(m.candidate_sources("la-ola-que-viene", eps, []), {})

    def test_diagnostics_print_only_source_titles_not_identifiers(self):
        from unittest.mock import patch
        from io import StringIO
        from contextlib import redirect_stdout
        import notebooklm_map_catalog as mapper
        notebooks = [{"id":"notebookid012345","title":"CULTURA - LIBROS - ESTO NO EXISTE"}]
        sources = [{"id":"sourceid012345","title":"Parte II - La narrativa"}]
        cfg = {"books":{"esto-no-existe":{"notebooks":{"libro":"notebookid012345"},
               "episodes":{}}}}
        def dispatch(argv, **kw):
            if argv[:3] == ["nlm","notebook","list"]:
                return json.dumps(notebooks)
            if argv[:3] == ["nlm","source","list"]:
                return json.dumps(sources)
            return json.dumps([])
        with patch.object(mapper, "check_identity"), \
             patch.object(mapper, "command", side_effect=dispatch), \
             patch.object(mapper, "private_config", return_value=cfg), \
             patch.object(mapper, "save_json") as save:
            capture = StringIO()
            with redirect_stdout(capture):
                mapper.run(False, diagnose_missing=True)
            output = capture.getvalue()
            self.assertIn("ya asociadas", output)
            self.assertIn("VIDEOS SIN FUENTE VERIFICADA", output)
            self.assertIn("Parte II - La narrativa", output)
            self.assertNotIn("sourceid012345", output)
            self.assertNotIn("notebookid012345", output)
            save.assert_not_called()

    def test_catalog_has_all_eight_additional_books(self):
        self.assertEqual(len(CAT["books"]), 9)
        self.assertEqual(set(m.ALIASES), set(BOOKS) - {"conde-montecristo"})
        self.assertEqual(sum(len(x["chapters"]) for x in CAT["books"]), 173)


if __name__ == "__main__":
    unittest.main()
