#!/usr/bin/env python3
"""Checks of the all-notebooks rescue. No real CLI, sips or Internet needed."""
import csv
import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parent))
import notebooklm_export_all as bulk

CAT = json.loads(bulk.CATALOG.read_text(encoding="utf-8"))
BOOKS = {b["slug"]: b for b in CAT["books"]}


class BulkExportTests(unittest.TestCase):
    def test_known_notebook_titles_map_to_nine_books(self):
        titles = {
            "conde-montecristo": "El conde de Montecristo TOMO I",
            "sapiens": "Sapiens. De animales a dioses",
            "1984": "1984 - George Orwell",
            "esto-no-existe": "Esto no existe · Soto Ivars",
            "libertad-igualdad": "Libertad o igualdad · Lacalle",
            "utopia": "Utopía · Tomás Moro",
            "la-ola-que-viene": "La ola que viene · Suleyman",
            "psicologia-dinero": "La psicología del dinero · Morgan Housel",
            "espana-solucion": "España tiene solución",
        }
        for slug, title in titles.items():
            with self.subTest(title=title):
                self.assertEqual(bulk.match_book(title, BOOKS)["slug"], slug)
        self.assertIsNone(bulk.match_book("Cuaderno familiar privado", BOOKS))

    def test_chapter_ranges_are_unambiguous(self):
        self.assertEqual(bulk.chapter_scope("La caída de Dantès (Capítulos 1 a 5)"), (1, 5))
        self.assertEqual(bulk.chapter_scope("Capítulos 21-25"), (21, 25))
        self.assertEqual(bulk.chapter_scope("Capitulo 53 - La ópera"), (53, 53))
        self.assertIsNone(bulk.chapter_scope("Resumen del libro"))
        self.assertIsNone(bulk.chapter_scope("Capítulos 5 a 150"))
        self.assertIsNone(bulk.chapter_scope("Imagen del año 2026"))

    def test_montecristo_tomos_and_unclassified(self):
        f, label, category = bulk.categories(
            "El conde de Montecristo Tomo I",
            "El Conde de Montecristo: La Caída de Edmond Dantès (Capítulos 1 a 5)",
            BOOKS)
        self.assertEqual(f[1], "Tomo I")
        self.assertIn("01-05", label)
        self.assertEqual(category, "capitulo")
        f, _, category = bulk.categories(
            "El conde de Montecristo Tomo II", "Capítulo 53 - Intrigas", BOOKS)
        self.assertEqual(f[1], "Tomo II")
        self.assertEqual(category, "capitulo")
        f, _, category = bulk.categories(
            "El conde de Montecristo Tomo I", "Capítulo 53", BOOKS)
        self.assertEqual(category, "ambiguo")
        f, _, category = bulk.categories(
            "El conde de Montecristo Tomo II", "El Conde de Montecristo: Resumen", BOOKS)
        self.assertIn("Sin clasificar", f)
        self.assertEqual(category, "sin-capitulo")

    def test_part_in_1984_must_be_explicit(self):
        f, label, cat = bulk.categories("1984", "Parte II - Capítulo 7", BOOKS)
        self.assertIn("Parte II", f)
        self.assertIn("07", label)
        self.assertEqual(cat, "capitulo")
        f, _, cat = bulk.categories("1984", "Capítulo 7", BOOKS)
        self.assertEqual(cat, "ambiguo")
        self.assertIn("Sin clasificar", f)

    def test_private_unlisted_notebook_not_lost(self):
        f, title, cat = bulk.categories("Un cuaderno personal", "Infografia simple", BOOKS)
        self.assertEqual(f[0], "Otros cuadernos")
        self.assertEqual(cat, "otro-cuaderno")
        self.assertTrue(title)

    def test_download_uses_supported_all_notebooks_command(self):
        from unittest.mock import MagicMock
        with tempfile.TemporaryDirectory() as tmp, patch.object(bulk.subprocess, "run") as run:
            run.return_value = MagicMock(returncode=0)
            bulk.download_every_notebook(Path(tmp) / "brutos")
            cmd = run.call_args.args[0]
            self.assertEqual(cmd[:3], ["nlm", "download", "all"])
            self.assertIn("--all-notebooks", cmd)
            self.assertEqual(cmd[cmd.index("--types")+1], "infographic")
            self.assertIn("--skip-existing", cmd)

    def test_exports_every_notebook_with_stable_hash_and_inventory(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            raw = root / "raw"
            monte = raw / "El conde de Montecristo - Tomo I"
            private = raw / "Un cuaderno personal"
            monte.mkdir(parents=True)
            private.mkdir(parents=True)
            (monte / "La Caida de Dantes (Capitulos 1 a 5).png").write_bytes(b"image-1")
            (private / "Infografia privada.png").write_bytes(b"image-2")
            outputs = []
            def converter(data, out):
                outputs.append((data, out))
                out.parent.mkdir(parents=True, exist_ok=True)
                out.write_bytes(b"\xff\xd8" + b"0"*200 + b"\xff\xd9")
            dest = root / "destination"
            inv = root / "INVENTARIO_COMPLETO.csv"
            report = bulk.classify_downloads(raw, dest, inv, CAT, converter)
            self.assertEqual(report["examined"], 2)
            self.assertEqual(report["exported"], 2)
            self.assertEqual(report["warnings"], [])
            self.assertEqual(len(outputs), 2)
            self.assertTrue(any("Tomo I" in str(path) for data, path in outputs))
            self.assertTrue(any("Otros cuadernos" in str(path) for data, path in outputs))
            with inv.open(encoding="utf-8-sig", newline="") as stream:
                records = list(csv.DictReader(stream))
            self.assertEqual(len(records), 2)
            self.assertEqual({r["Estado"] for r in records}, {"Exportado"})
            again = bulk.classify_downloads(raw, dest, inv, CAT, converter)
            self.assertEqual(again["exported"], 0)
            self.assertEqual(again["existing"], 2)
            self.assertEqual(len(outputs), 2)

    def test_does_not_overwrite_bad_existing_jpg(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            raw = root / "raw" / "1984"
            raw.mkdir(parents=True)
            (raw/"Parte II Capitulo 7.png").write_bytes(b"raw")
            dest = root/"dest"
            report = bulk.classify_downloads(root/"raw", dest, root/"inventory.csv",
                CAT, converter=lambda b,p:(p.parent.mkdir(parents=True,exist_ok=True),p.write_bytes(b"\xff\xd8"+"0".encode()*200)))
            jpgs = list(dest.rglob("*.jpg"))
            self.assertEqual(len(jpgs),1)
            jpgs[0].write_bytes(b"bad")
            report = bulk.classify_downloads(root/"raw", dest, root/"inventory.csv",
                CAT, converter=lambda b,p: self.fail("Must not overwrite"))
            self.assertTrue(report["warnings"])


if __name__ == "__main__":
    unittest.main()
