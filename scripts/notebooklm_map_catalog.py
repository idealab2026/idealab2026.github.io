#!/usr/bin/env python3
"""Vincula de forma conservadora los libros del catálogo a cuadernos/fuentes NotebookLM.

Todas las asociaciones (cuaderno y fuentes) permanecen SOLO en el Mac.
No crea cuadernos ni infografías, no publica nada. No supone que por compartir
número de capítulo dos fuentes distintas corresponden al mismo capítulo.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
import unicodedata
from pathlib import Path

from notebooklm_bridge import (
    CONFIG_PATH, ROOT, command, exclusive_state_lock, private_config,
    save_json, VALID_ID, check_identity,
)
from notebooklm_source_mapper import (
    source_objects, source_id, source_title, source_scope, normalize,
)

CATALOG = ROOT / "biblioteca-montecristo/catalogo.json"

ALIASES = {
    "sapiens": ("cultura libros sapiens",),
    "esto-no-existe": ("cultura libros esto no existe",),
    "libertad-igualdad": ("cultura libros libertad o igualdad",),
    "utopia": ("cultura libros utopia",),
    "la-ola-que-viene": ("cultura libros la ola que viene",),
    "psicologia-dinero": ("cultura libros la psicologia del dinero",),
    "1984": ("cultura libros 1984 orwell", "cultura libros 1984"),
    "espana-solucion": ("cultura libros espana tiene solucion",),
}
ROMAN = {"i": 1, "ii": 2, "iii": 3, "iv": 4, "v": 5,
         "vi": 6, "vii": 7, "viii": 8, "ix": 9, "x": 10,
         "xi": 11, "xii": 12}


def records(raw: str) -> list[dict]:
    obj = json.loads(raw)
    if isinstance(obj, list):
        return [row for row in obj if isinstance(row, dict)]
    if isinstance(obj, dict):
        for key in ("notebooks", "items", "data", "results"):
            if isinstance(obj.get(key), list):
                return [row for row in obj[key] if isinstance(row, dict)]
    raise ValueError("Listado de cuadernos con formato no reconocido")


def plain_title(value: str) -> str:
    value = unicodedata.normalize("NFD", str(value).casefold())
    value = "".join(c for c in value if unicodedata.category(c) != "Mn")
    return " ".join(re.findall(r"[a-z0-9]+", value))


def find_notebook(slug: str, notebooks: list[dict]) -> dict | None:
    aliases = ALIASES[slug]
    candidates = []
    for row in notebooks:
        nid = row.get("id") or row.get("notebook_id")
        title = row.get("title") or row.get("name") or ""
        if (isinstance(nid, str) and VALID_ID.fullmatch(nid)
                and any(plain_title(title).startswith(alias) for alias in aliases)):
            candidates.append(row)
    return candidates[0] if len(candidates) == 1 else None


def roman_digit(value: str) -> int | None:
    value = value.lower()
    if value.isdigit():
        n = int(value)
        return n if 1 <= n <= 300 else None
    return ROMAN.get(value)


def chapter_key(slug: str, title: str, *, source: bool = False):
    """Return strict chapter key; None if a cross-book mapping isn't provable."""
    raw = plain_title(title)
    if slug == "sapiens":
        if "epilogo" in raw:
            return ("epi",)
        m = re.search(r"\bsapiens\s+(\d{1,2})\b", raw)
        if m:
            return ("chapter", int(m.group(1)))
    if slug in ("libertad-igualdad", "psicologia-dinero",
                "la-ola-que-viene", "espana-solucion", "sapiens"):
        if "epilogo" in raw:
            return ("epi",)
        m = re.search(r"\b(?:capitulo|cap)\s+(\d{1,3})\b", raw)
        if m:
            return ("chapter", int(m.group(1)))
        if source:
            scope = source_scope(title)
            if scope and len(scope) == 1:
                return ("chapter", scope[0])
        return None
    if slug == "esto-no-existe":
        if "introduccion" in raw and "cap" not in raw:
            return ("intro",)
        m = re.search(r"\bcap(?:itulo)?\s+(vi|iv|v|iii|ii|i|[1-9])\b", raw)
        if m:
            chapter = roman_digit(m.group(1))
        elif source:
            # Real NotebookLM PDFs are named "I - ... PARTE II.pdf", not
            # "Cap I". Only a leading roman numeral I–VI is acceptable.
            # Dos numerales consecutivos (p.ej. "IV V - DOCUMENTO") son ambiguos.
            if re.match(r"^(?:vi|iv|v|iii|ii|i)\s+(?:vi|iv|v|iii|ii|i)\b", raw):
                return None
            initial = re.match(r"^(vi|iv|v|iii|ii|i)\s+", raw)
            if not initial:
                return None
            chapter = roman_digit(initial.group(1))
        else:
            return None
        part = re.search(r"\bparte\s+(iii|ii|i|[1-9])\b", raw)
        return ("chapter", chapter, roman_digit(part.group(1)) if part else None)
    if slug == "utopia":
        part = re.search(r"\blibro\s+(primero|segundo|i|ii|1|2)\b", raw)
        reverse = re.search(r"\b(primero|segundo)\s+libro\b", raw)
        if not part and not reverse:
            return None
        volume_word = part.group(1) if part else reverse.group(1)
        vol = 1 if volume_word in ("primero", "i", "1") else 2
        ch = re.search(r"\bcap(?:itulo)?\s+(\d{1,2})\b", raw)
        if vol == 1:
            return ("book", 1) if not ch else None
        # PDFs are "1. LIBRO SEGUNDO - INTRODUCCIÓN.pdf" through
        # "10. LIBRO SEGUNDO - CONCLUSIÓN.pdf". If a source claims both
        # a numbered prefix and a different explicit chapter, reject it.
        numbered = re.match(r"^(\d{1,2})\s+libro\s+segundo\b", raw) if source else None
        if ch:
            if numbered and int(numbered.group(1)) != int(ch.group(1)):
                return None
            return ("book", 2, int(ch.group(1)))
        if numbered and 1 <= int(numbered.group(1)) <= 10:
            return ("book", 2, int(numbered.group(1)))
        return None
    if slug == "1984":
        if "goldstein" in raw and "libro" in raw:
            return ("goldstein",)
        part = re.search(r"\bparte\s+(i{1,3}|[123])\b", raw)
        chapters = list(re.finditer(r"\bcapitulo\s+(viii|vii|vi|iv|ix|x|v|iii|ii|i|[1-9][0-9]?)\b", raw))
        # The legacy video "Capítulo 15 - Parte 2: Capítulo 7" is ambiguous.
        # It is NOT safe to infer this is an identical second episode.
        if not part or len(chapters) != 1:
            return None
        return ("part", roman_digit(part.group(1)),
                roman_digit(chapters[0].group(1)))
    return None


def candidate_sources(slug: str, chapters: list[dict], sources: list[dict]):
    by_key = {}
    for source in sources:
        sid = source_id(source)
        key = chapter_key(slug, source_title(source), source=True)
        if sid and key:
            by_key.setdefault(key, set()).add(sid)
    targets = {}
    for episode in chapters:
        key = chapter_key(slug, episode["title"])
        if key and len(by_key.get(key, ())) == 1:
            targets[episode["id"]] = next(iter(by_key[key]))
    return targets


def run(apply: bool, diagnose_missing: bool = False):
    check_identity()
    catalog = json.loads(CATALOG.read_text(encoding="utf-8"))
    notebooks = records(command(["nlm", "notebook", "list", "--json"], timeout=120))
    config = private_config()
    total_new, mapped_books = 0, 0
    for book in catalog["books"]:
        slug = book["slug"]
        if slug == "conde-montecristo":
            # Tome-specific mapping is already robust and preserved unchanged.
            continue
        nb = find_notebook(slug, notebooks)
        if nb is None:
            print(f"{book['title']}: cuaderno sin correspondencia única (no se modifica).")
            continue
        nid = nb.get("id") or nb.get("notebook_id")
        try:
            sources = source_objects(command(["nlm", "source", "list", nid, "--json"], timeout=120))
        except (RuntimeError, ValueError) as exc:
            print(f"{book['title']}: fuentes no accesibles ({type(exc).__name__})")
            continue
        candidates = candidate_sources(slug, book["chapters"], sources)
        existing = config.get("books", {}).get(slug, {}).get("episodes", {})
        safe_new = {vid: sid for vid, sid in candidates.items() if vid not in existing}
        missing = [ep for ep in book["chapters"] if ep["id"] not in existing
                   and ep["id"] not in candidates]
        print(f"{book['title']}: {len(book['chapters'])} vídeos | {len(sources)} fuentes | "
              f"{len(candidates)} asociaciones inequívocas | {len(safe_new)} nuevas | "
              f"{len(existing)} ya asociadas | {len(missing)} sin fuente verificada")
        if diagnose_missing and missing:
            print("  VIDEOS SIN FUENTE VERIFICADA (solo titulos, sin IDs):")
            for ep in missing:
                print("    -", str(ep["title"])[:115])
            print("  TITULOS DE FUENTES DEL CUADERNO (solo en Terminal local):")
            for src in sources:
                title = source_title(src)
                if title:
                    key = chapter_key(slug, title, source=True)
                    print("    -", title[:115], "|", str(key) if key else "no reconocible")
        mapped_books += 1
        if apply:
            rows = config.setdefault("books", {}).setdefault(slug, {"notebooks": {}, "episodes": {}})
            rows.setdefault("notebooks", {})["libro"] = nid
            for vid, sid in safe_new.items():
                rows.setdefault("episodes", {})[vid] = {
                    "notebook": nid, "sources": [sid],
                }
            total_new += len(safe_new)
    if apply:
        save_json(CONFIG_PATH, config)
        print(f"ASOCIACIONES PRIVADAS GUARDADAS: {total_new} en {mapped_books} libros.")
        print("Las no identificadas permanecen pendientes; nunca se generan con todo el cuaderno.")
    else:
        print("DIAGNÓSTICO: no se ha escrito ninguna asociación. Ejecuta --apply para guardar.")
    return total_new


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true",
                        help="Guardar únicamente los emparejamientos con fuente única")
    parser.add_argument("--diagnose-missing", action="store_true",
                        help="Mostrar títulos de episodios sin asociación y los títulos de sus fuentes")
    args = parser.parse_args()
    with exclusive_state_lock() as locked:
        if not locked:
            print("Otro proceso está utilizando NotebookLM. Sin cambios.", file=sys.stderr)
            return 2
        run(args.apply, args.diagnose_missing)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
