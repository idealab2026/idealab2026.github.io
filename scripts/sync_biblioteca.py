#!/usr/bin/env python3
"""Update the public Montecristo catalog from YouTube playlists, without secrets.

Best-effort incremental sync: never removes validated existing chapters on scrape failure.
New videos are added only when a public playlist confirms their IDs.
"""
from __future__ import annotations
import datetime as dt
import json
import re
import sys
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CATALOG = ROOT / "biblioteca-montecristo" / "catalogo.json"

def clean(text):
    return "".join(c for c in unicodedata.normalize("NFD", str(text or "")) if unicodedata.category(c) != "Mn").lower()

def chapter_no(title):
    s = clean(title)
    m = re.search(r"(?:capitulo|cap)\s*[:.\- ]*\s*(\d+)", s)
    if not m:
        m = re.search(r"(?:capitulo|cap)\s*[:.\- ]*\s*(i{1,4}|iv|v?i{1,3}|ix|x)\b", s)
        if m:
            return {"i": 1, "ii": 2, "iii": 3, "iv": 4, "v": 5, "vi": 6, "vii": 7, "viii": 8, "ix": 9, "x": 10}.get(m.group(1), 999)
    return int(m.group(1)) if m else None

def video_id(entry):
    value = str(entry.get("id") or "")
    if re.fullmatch(r"[A-Za-z0-9_-]{11}", value):
        return value
    value = str(entry.get("url") or "")
    m = re.search(r"(?:v=|youtu\.be/|/shorts/)([A-Za-z0-9_-]{11})", value)
    return m.group(1) if m else None

def main():
    from yt_dlp import YoutubeDL

    doc = json.loads(CATALOG.read_text(encoding="utf-8"))
    updated = 0
    verified_playlists = 0
    for book in doc.get("books", []):
        playlist = book.get("playlist")
        if not playlist:
            continue
        try:
            with YoutubeDL({"extract_flat": "in_playlist", "quiet": True, "no_warnings": True,
                            "ignoreerrors": True, "skip_download": True,
                            "socket_timeout": 25, "retries": 2}) as ydl:
                info = ydl.extract_info(playlist, download=False)
            entries = [e for e in (info or {}).get("entries", []) if isinstance(e, dict)]
            if not entries:
                print("Playlist not readable; preserving:", book["slug"])
                continue
            verified_playlists += 1
            existing = {c.get("id"): c for c in book.get("chapters", [])}
            for e in entries:
                vid = video_id(e)
                if not vid or vid in existing:
                    continue
                title = str(e.get("title") or "").strip()
                description = str(e.get("description") or "").strip()
                published = ""
                try:
                    with YoutubeDL({"quiet": True, "no_warnings": True,
                                    "ignoreerrors": True, "skip_download": True,
                                    "socket_timeout": 25, "retries": 2}) as d:
                        full = d.extract_info("https://www.youtube.com/watch?v=" + vid, download=False)
                    if isinstance(full, dict):
                        title = str(full.get("title") or title)
                        description = str(full.get("description") or description)
                        stamp = full.get("upload_date")
                        if stamp and re.fullmatch(r"\d{8}", str(stamp)):
                            published = str(stamp)[:4] + "-" + str(stamp)[4:6] + "-" + str(stamp)[6:8]
                except Exception as exc:
                    print("Video details unavailable, storing playlist metadata:", vid, type(exc).__name__)
                if not title:
                    title = "Vídeo " + vid
                ch = {"id": vid, "number": chapter_no(title), "title": title[:300],
                      "description": description[:10000], "date": published,
                      "duration": None, "url": "https://www.youtube.com/watch?v=" + vid}
                book.setdefault("chapters", []).append(ch)
                existing[vid] = ch
                updated += 1
                print("New video:", book["slug"], vid)
        except Exception as exc:
            print("Playlist fetch failed, preserving:", book.get("slug"), type(exc).__name__)

    if updated:
        doc["lastSynced"] = dt.date.today().isoformat()
        doc["source"] = "YouTube public playlists; supplemented by initially verified vidIQ catalog"
        CATALOG.write_text(json.dumps(doc, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print("Updated:", updated, "new videos in", verified_playlists, "playlists")
    else:
        print("No new videos. Previously verified catalog remains intact.",
              "Playlists fetched:", verified_playlists)
    return 0

if __name__ == "__main__":
    sys.exit(main())
