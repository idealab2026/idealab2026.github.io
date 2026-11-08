#!/usr/bin/env python3
"""Map IDEA LAB YouTube video episodes to EXACT NotebookLM sources on user's Mac.

Runs locally. Never uploads notebook IDs, source IDs, content or credentials.
Conservative: maps a video only when source titles/URLs unambiguously identify
the complete chapter interval. A whole-book PDF cannot be silently mapped
to a single episode. Use bridge.py map-episode for manual exceptions.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from urllib.parse import urlparse, parse_qs
sys.path.insert(0, str(Path(__file__).resolve().parent))
from notebooklm_bridge import (CONFIG_PATH, VALID_ID, ROOT, command,
                               private_config, save_json, check_identity)
from notebooklm_infografias import find_item

TITLE_RE = re.compile(
    r"\b(?:capitulo|cap(?:itulo)?)\s*[:.#\-\s]*"
    r"(\d{1,3})(?!\d)(?:\s*(?:a|al|[-–])\s*(\d{1,3})(?!\d))?", re.IGNORECASE)


def normalize(text):
    import unicodedata
    return "".join(c for c in unicodedata.normalize("NFD", str(text).lower())
                   if unicodedata.category(c) != "Mn")


def chapter_interval(title):
    hits = list(TITLE_RE.finditer(normalize(title)))
    if len(hits) != 1:
        return None
    start = int(hits[0][1])
    end = int(hits[0][2] or start)
    if not 1 <= start <= end <= 300 or (end-start) > 20:
        return None
    return tuple(range(start, end+1))


def source_scope(title):
    """Unambiguously map a source title to a chapter interval.

    Local NotebookLM imports may be named '51.pdf' (exact chapter number),
    rather than 'Capítulo 51'. Do NOT infer chapters from arbitrary filenames.
    """
    name = str(title).strip()
    numeric = re.fullmatch(r"([1-9][0-9]{0,2})[.]pdf", name, re.IGNORECASE)
    if numeric:
        chapter = int(numeric.group(1))
        return (chapter,) if chapter <= 300 else None
    return chapter_interval(name)


def source_objects(raw):
    data = json.loads(raw)
    if isinstance(data, dict):
        for key in ("sources", "items", "data", "results"):
            if isinstance(data.get(key), list):
                data = data[key]
                break
    if not isinstance(data, list):
        raise ValueError("nlm source list devolvió un formato inesperado.")
    return [row for row in data if isinstance(row, dict)]


def source_id(row):
    val = row.get("id", row.get("source_id"))
    if isinstance(val, str) and VALID_ID.fullmatch(val):
        return val
    return None


def source_title(row):
    for k in ("title", "name", "source_title"):
        if isinstance(row.get(k), str):
            return row[k]
    return ""


def youtube_video_id(raw):
    try:
        url = urlparse(raw)
        if url.hostname in ("www.youtube.com", "youtube.com", "m.youtube.com"):
            return parse_qs(url.query).get("v", [""])[0]
        if url.hostname == "youtu.be":
            return url.path.strip("/")
    except ValueError:
        pass
    return None


def suggestions(episodes, sources):
    # Match by exact YouTube URL (best), then exact chapter scope.
    by_scope = {}
    by_video = {}
    for src in sources:
        sid = source_id(src)
        if not sid:
            continue
        scope = source_scope(source_title(src))
        if scope:
            by_scope.setdefault(scope, set()).add(sid)
        vid = youtube_video_id(str(src.get("url", "")))
        if vid:
            by_video.setdefault(vid, set()).add(sid)
    proposed, ambiguous = {}, []
    for ep in episodes:
        target = chapter_interval(ep["title"])
        if not target:
            ambiguous.append((ep["id"], "sin capítulo inequívoco en el título"))
            continue
        exact_video = by_video.get(ep["id"], set())
        if len(exact_video) == 1:
            proposed[ep["id"]] = list(exact_video)
            continue
        if len(exact_video) > 1:
            ambiguous.append((ep["id"], "varias fuentes enlazan al mismo vídeo"))
            continue
        exact_span = by_scope.get(target, set())
        if len(exact_span) == 1:
            proposed[ep["id"]] = sorted(exact_span)
            continue
        # A grouped video 1–5 requires 5 unique, individually mapped source titles.
        if len(target) > 1 and not exact_span:
            members = [by_scope.get((n,), set()) for n in target]
            if all(len(s) == 1 for s in members):
                ids = [next(iter(s)) for s in members]
                if len(ids) == len(set(ids)):
                    proposed[ep["id"]] = ids
                    continue
        ambiguous.append((ep["id"], "no hay fuentes exactas o existen duplicados"))
    return proposed, ambiguous


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--book", required=True)
    parser.add_argument("--volume", help="tomo-i o tomo-ii. Requerido si el libro tiene varios cuadernos.")
    parser.add_argument("--apply", action="store_true",
                        help="Guardar en privado únicamente las correspondencias inequívocas")
    args = parser.parse_args()
    check_identity()
    book, _ = find_item(args.book, None)
    cfg = private_config()
    record = cfg.get("books", {}).get(args.book, {})
    notebooks = record.get("notebooks", {})
    key = args.volume or "libro"
    if key not in notebooks:
        raise SystemExit("Primero vincula el cuaderno con 'map-book'. No se ha modificado nada.")
    if args.book == "conde-montecristo" and not args.volume:
        raise SystemExit("Para Montecristo hay que indicar --volume tomo-i o tomo-ii.")
    notebook = notebooks[key]
    raw = command(["nlm", "source", "list", notebook, "--json"], timeout=120)
    sources = source_objects(raw)
    episodes = []
    for ep in book["chapters"]:
        scope = chapter_interval(ep["title"])
        if not scope:
            continue
        if args.book == "conde-montecristo":
            if args.volume == "tomo-i" and scope[0] > 50:
                continue
            if args.volume == "tomo-ii" and scope[0] < 51:
                continue
        episodes.append(ep)
    proposed, unmatched = suggestions(episodes, sources)
    mapped = record.get("episodes", {})
    safe_new = {vid: source_ids for vid, source_ids in proposed.items() if vid not in mapped}
    print(f"Cuaderno {key} | vídeos del catálogo: {len(episodes)} | fuentes: {len(sources)}")
    print(f"Emparejamientos inequívocos: {len(proposed)} | sin correspondencia segura: {len(unmatched)}")
    for ep in episodes:
        scope = chapter_interval(ep["title"])
        label = str(scope[0]) if len(scope) == 1 else f"{scope[0]}–{scope[-1]}"
        status = "YA ASOCIADO" if ep["id"] in mapped else "CANDIDATO" if ep["id"] in proposed else "PENDIENTE"
        print(f"  Cap. {label:<7} [{status}]  {ep['id']}  {ep['title'][:56]}")
    if args.apply:
        for vid, source_ids in safe_new.items():
            record.setdefault("episodes", {})[vid] = {
                "notebook": notebook, "sources": source_ids}
        if safe_new:
            cfg.setdefault("books", {})[args.book] = record
            save_json(CONFIG_PATH, cfg)
        print("Asociaciones privadas nuevas guardadas:", len(safe_new))
    else:
        print("Diagnóstico únicamente. Añade --apply para guardar candidatos inequívocos.")
    if unmatched:
        print("Los PENDIENTES se asignan tras inspeccionar títulos y fuentes en tu Mac.")
        print("nlm source list CUADERNO_ID --json")
        print("python3 scripts/notebooklm_bridge.py map-episode --book LIBRO "
              "--video-id VIDEO_ID --notebook-id CUADERNO_ID --source-ids SOURCE_ID")


if __name__ == "__main__":
    try:
        main()
    except (RuntimeError, ValueError, OSError) as exc:
        print("ERROR:", exc, file=sys.stderr)
        raise SystemExit(1)
