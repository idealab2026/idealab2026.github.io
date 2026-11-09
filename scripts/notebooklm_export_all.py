#!/usr/bin/env python3
"""Rescata TODAS las infografias generadas de NotebookLM, en privado y sin generar nuevas.

1. La CLI oficial descarga todos los PNG de todos los cuadernos.
2. Se conserva una copia bruta de cada PNG.
3. Se convierten COPIAS a JPG y se agrupan por libro, tomo y capitulo cuando
   el titulo contiene evidencias suficientes. Lo ambiguo va a Sin clasificar.
4. Un inventario CSV audita la exportacion; no modifica Git ni el estado NLM.
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
import re
import subprocess
import sys
import unicodedata
from pathlib import Path

from notebooklm_bridge import HOME, exclusive_state_lock
from notebooklm_export_desktop import convert_to_jpg, safe_name

BASE = HOME / "Desktop" / "IDEA LAB - Infografias"
RAW = BASE / "PNG originales de todos los cuadernos"
DEST = BASE / "Originales NotebookLM"
INVENTORY = BASE / "INVENTARIO_COMPLETO.csv"
CATALOG = Path(__file__).resolve().parents[1] / "biblioteca-montecristo/catalogo.json"

ALIASES = {
    "conde-montecristo": ("conde de montecristo", "montecristo", "monte cristo"),
    "sapiens": ("sapiens",),
    "1984": ("1984",),
    "esto-no-existe": ("esto no existe",),
    "libertad-igualdad": ("libertad o igualdad",),
    "utopia": ("utopia",),
    "la-ola-que-viene": ("la ola que viene",),
    "psicologia-dinero": ("psicologia del dinero",),
    "espana-solucion": ("espana tiene solucion",),
}
CHAPTER_RE = re.compile(
    r"\bcap(?:itulo)?s?\s*[:.#ºn°\s-]*(\d{1,3})"
    r"(?:\s*(?:a|al|hasta|[-–])\s*(\d{1,3}))?", re.I,
)
PART_RE = re.compile(r"\bparte\s*([ivx]{1,5}|\d{1,2})\b", re.I)


def normalize(value: str) -> str:
    value = unicodedata.normalize("NFKD", str(value).casefold())
    value = "".join(c for c in value if unicodedata.category(c) != "Mn")
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9 ]", " ", value)).strip()


def match_book(name: str, books: dict) -> dict | None:
    text = normalize(name)
    matches = [
        books[slug] for slug, terms in ALIASES.items()
        if slug in books and any(term in text for term in terms)
    ]
    return matches[0] if len(matches) == 1 else None


def chapter_scope(filename: str) -> tuple[int, int] | None:
    text = unicodedata.normalize("NFKD", filename.casefold())
    text = "".join(ch for ch in text if unicodedata.category(ch) != "Mn")
    text = re.sub(r"[^a-z0-9 .:#ºn°\s–-]", " ", text)
    text = re.sub(r"\s+", " ", text)
    match = CHAPTER_RE.search(text)
    if not match:
        return None
    first = int(match.group(1))
    last = int(match.group(2) or first)
    if not 1 <= first <= last <= 300 or last - first > 20:
        return None
    return first, last


def part_number(title: str) -> str | None:
    match = PART_RE.search(normalize(title))
    if match is None:
        return None
    value = match.group(1)
    return value.upper() if value.isalpha() else value


def categories(notebook_title: str, artifact_title: str, books: dict) -> tuple[list[str], str, str]:
    """Returns relative directory components, chapter label and category."""
    book = match_book(notebook_title, books)
    raw_title = safe_name(artifact_title, 95)
    if book is None:
        return ["Otros cuadernos", safe_name(notebook_title), "Sin clasificar"], raw_title, "otro-cuaderno"
    slug = book["slug"]
    section = [safe_name(book["title"])]
    chapter = chapter_scope(artifact_title)
    if slug == "conde-montecristo":
        explicit_volume = normalize(notebook_title)
        vol = "Tomo II" if re.search(r"\btomo\s*(ii|2)\b", explicit_volume) else (
            "Tomo I" if re.search(r"\btomo\s*(i|1)\b", explicit_volume) else None
        )
        if chapter:
            volume = "Tomo I" if chapter[0] <= 50 else "Tomo II"
            if vol and vol != volume:
                return section + ["Conflictos de tomo", "Sin clasificar"], raw_title, "ambiguo"
            label = (f"Capitulo {chapter[0]:02d}" if chapter[0] == chapter[1]
                     else f"Capitulos {chapter[0]:02d}-{chapter[1]:02d}")
            return section + [volume], label + " - " + raw_title, "capitulo"
        return section + ([vol] if vol else []) + ["Sin clasificar"], raw_title, "sin-capitulo"
    if chapter:
        if slug == "1984":
            part = part_number(artifact_title)
            if part is None:
                return section + ["Sin clasificar"], raw_title, "ambiguo"
            section.append("Parte " + part)
        label = (f"Capitulo {chapter[0]:02d}" if chapter[0] == chapter[1]
                 else f"Capitulos {chapter[0]:02d}-{chapter[1]:02d}")
        return section, label + " - " + raw_title, "capitulo"
    return section + ["Sin clasificar"], raw_title, "sin-capitulo"


def download_every_notebook(raw_dir: Path = RAW) -> None:
    raw_dir.mkdir(parents=True, exist_ok=True)
    argv = [
        "nlm", "download", "all", "--all-notebooks",
        "--types", "infographic", "--output-dir", str(raw_dir),
        "--skip-existing",
    ]
    subprocess.run(argv, check=True, timeout=3600)


def classify_downloads(raw_dir: Path = RAW, dest_dir: Path = DEST,
                       inventory: Path = INVENTORY,
                       catalog: dict | None = None,
                       converter=convert_to_jpg) -> dict:
    if catalog is None:
        catalog = json.loads(CATALOG.read_text(encoding="utf-8"))
    books = {b["slug"]: b for b in catalog["books"]}
    dest_dir.mkdir(parents=True, exist_ok=True)
    inventory.parent.mkdir(parents=True, exist_ok=True)

    rows, warnings = [], []
    examined, exported, existing = 0, 0, 0
    if not raw_dir.exists():
        return {"examined": 0, "exported": 0, "existing": 0,
                "warnings": ["No existe todavía el directorio de PNG brutos."]}
    for png in sorted(raw_dir.rglob("*")):
        if not png.is_file() or png.suffix.lower() != ".png" or png.is_symlink():
            continue
        rel = png.relative_to(raw_dir)
        # The official downloader creates a named directory for each notebook.
        # Do not assume an ungrouped root-level image belongs to a book.
        notebook_title = rel.parts[0] if len(rel.parts) > 1 else "Cuaderno sin identificar"
        title = png.stem
        examined += 1
        folder, label, kind = categories(notebook_title, title, books)
        raw = png.read_bytes()
        digest = hashlib.sha256(raw).hexdigest()[:16]
        name = safe_name(label, 125) + " - " + digest + ".jpg"
        output = dest_dir.joinpath(*folder, name)
        status = "Existente"
        try:
            if output.is_symlink():
                raise ValueError("Salida es un enlace simbolico")
            if not output.exists():
                converter(raw, output)
                exported += 1
                status = "Exportado"
            else:
                existing += 1
            with output.open("rb") as f:
                if f.read(2) != b"\xff\xd8":
                    raise ValueError("JPG existente no valido")
        except (OSError, ValueError, subprocess.SubprocessError) as exc:
            status = "Error: " + type(exc).__name__
            warnings.append(f"{notebook_title}/{png.name}: {type(exc).__name__}")
        rows.append({
            "Cuaderno NotebookLM": notebook_title,
            "Titulo infografia": title,
            "Clasificacion": kind,
            "Estado": status,
            "PNG original": str(png),
            "JPG organizado": str(output) if status in ("Existente", "Exportado") else "",
        })

    tmp = inventory.with_suffix(".csv.tmp")
    with tmp.open("w", newline="", encoding="utf-8-sig") as dest:
        writer = csv.DictWriter(dest, fieldnames=[
            "Cuaderno NotebookLM", "Titulo infografia", "Clasificacion",
            "Estado", "PNG original", "JPG organizado"])
        writer.writeheader()
        writer.writerows(rows)
    tmp.replace(inventory)
    return {"examined": examined, "exported": exported, "existing": existing,
            "warnings": warnings, "inventory": str(inventory),
            "unclassified": sum(r["Clasificacion"] != "capitulo" for r in rows)}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--no-download", action="store_true",
                        help="Solo ordenar los PNG que ya estan descargados; sin red")
    parser.add_argument("--open", action="store_true", help="Abrir Finder al terminar")
    opts = parser.parse_args()
    errors = []
    with exclusive_state_lock() as locked:
        if not locked:
            print("Otro proceso del puente usa NotebookLM. Reintenta el exportador después.",
                  file=sys.stderr)
            return 2
        if not opts.no_download:
            try:
                download_every_notebook()
            except (OSError, subprocess.TimeoutExpired, subprocess.CalledProcessError) as exc:
                errors.append("Descarga masiva incompleta: " + type(exc).__name__)
        report = classify_downloads()
    print("PNG encontrados:", report["examined"])
    print("Nuevos JPG organizados:", report["exported"])
    print("JPG que ya existian:", report["existing"])
    print("Por revisar o generales:", report.get("unclassified", 0))
    print("Inventario:", report.get("inventory", INVENTORY))
    for warning in [*errors, *report["warnings"]]:
        print("ATENCION:", warning, file=sys.stderr)
    if opts.open:
        subprocess.run(["open", str(BASE)], check=False)
    return 1 if errors or report["warnings"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
