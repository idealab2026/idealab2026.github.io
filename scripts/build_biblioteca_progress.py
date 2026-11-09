#!/usr/bin/env python3
"""Build a public, auditable infographic progress table for Biblioteca de Montecristo.

Only public YouTube catalogue, IDEALAB-authored [NLM] issues and public comments
are read. Local NotebookLM notebooks, sources, files and credentials are NEVER read.
A generated image is counted only after its bridge confirms local download.
ChatGPT correction is counted only when an explicitly verified, published
corrected image exists. The progress file is built for static GitHub Pages.
"""
from __future__ import annotations

import datetime as dt
import json
import os
import re
import sys
import time
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / "biblioteca-montecristo"
REPO = "idealab2026/idealab2026.github.io"
ACTOR = "idealab2026"
API = "https://api.github.com"
BODY_RE = re.compile(r"<!-- IDEA_LAB_NLM_REQUEST_V1\s*\n(\{[^\n]*\})\s*\n-->")
CORRECTED_RE = re.compile(r"\./infografias/corregidas/([A-Za-z0-9_-]{11})\.(?:png|svg)")
CHAPTER_RE = re.compile(r"(?:cap[ií]tulo|cap)\s*[:.\- ]*(\d{1,3})(?:\s*(?:a|al|[-–])\s*(\d{1,3}))?", re.I)
PRIORITY = {"sin_solicitar": 0, "en_cola": 1, "generando": 2, "error": 2, "generada": 3}


def api_get(path: str):
    token = os.environ.get("GITHUB_TOKEN", "")
    headers = {"Accept": "application/vnd.github+json",
               "User-Agent": "idea-lab-public-infographic-progress",
               "X-GitHub-Api-Version": "2022-11-28"}
    if token:
        headers["Authorization"] = "Bearer " + token
    req = Request(API + path, headers=headers)
    last = None
    for attempt in range(3):
        try:
            with urlopen(req, timeout=25) as response:
                return json.load(response)
        except Exception as exc:
            last = exc
            if attempt < 2:
                time.sleep(1 + attempt)
    raise RuntimeError("GitHub public API unavailable: " + type(last).__name__) from last


def fetch_issues():
    out = []
    for page in range(1, 12):
        query = urlencode({
            "q": f"repo:{REPO} is:issue in:title \"[NLM]\"",
            "per_page": 100,
            "page": page,
            "sort": "created",
            "order": "asc",
        })
        obj = api_get("/search/issues?" + query)
        batch = obj.get("items")
        if not isinstance(batch, list):
            raise ValueError("GitHub returned an unexpected issues response")
        out.extend(batch)
        if len(batch) < 100:
            return out
    raise ValueError("NLM issues exceed the checked pagination limit")


def request_from_issue(issue, book_ids):
    if not str(issue.get("title", "")).startswith("[NLM] "):
        return None
    if (issue.get("user") or {}).get("login", "").lower() != ACTOR:
        return None
    body = str(issue.get("body") or "").strip()
    m = BODY_RE.fullmatch(body)
    if not m:
        return None
    try:
        obj = json.loads(m.group(1))
    except ValueError:
        return None
    if not isinstance(obj, dict) or set(obj) != {"version", "action", "book", "video_id", "volume"}:
        return None
    if obj["version"] != 1 or obj["action"] != "infographic" or obj["book"] not in book_ids:
        return None
    vid, volume = obj["video_id"], obj["volume"]
    if vid is not None and (not isinstance(vid, str) or not re.fullmatch(r"[A-Za-z0-9_-]{11}", vid)):
        return None
    if volume is not None and (not isinstance(volume, str) or not re.fullmatch(r"tomo-[a-z0-9-]+", volume)):
        return None
    if vid and volume:
        return None
    return obj


def get_issue_comments(number: int):
    comments = []
    for page in range(1, 12):
        path = f"/repos/{REPO}/issues/{number}/comments?" + urlencode({"per_page": 100, "page": page})
        batch = api_get(path)
        if not isinstance(batch, list):
            raise ValueError("GitHub returned invalid comments")
        comments.extend(batch)
        if len(batch) < 100:
            return comments
    raise ValueError("An issue has too many comments")


def issue_state(comments):
    state = "en_cola"
    for comment in sorted(comments, key=lambda c: c.get("created_at") or ""):
        if (comment.get("user") or {}).get("login", "").lower() != ACTOR:
            continue
        txt = str(comment.get("body") or "")
        if "Infografía descargada en el Mac." in txt:
            state = "generada"
        elif "Solicitud enviada a NotebookLM desde el Mac" in txt and state != "generada":
            state = "generando"
        elif "NotebookLM ha informado de un fallo de generación." in txt and state != "generada":
            state = "error"
    return state


def issue_map(issues, book_ids, get_comments=get_issue_comments):
    out = {}
    for issue in issues:
        req = request_from_issue(issue, book_ids)
        if req is None:
            continue
        key = (req["book"], req["video_id"], req["volume"])
        number = issue.get("number")
        if not isinstance(number, int) or number < 1:
            continue
        state = "en_cola"
        if issue.get("comments", 0):
            try:
                state = issue_state(get_comments(number))
            except (RuntimeError, ValueError):
                state = "no_verificado"
        row = {"state": state, "issue": number,
               "url": f"https://github.com/{REPO}/issues/{number}"}
        existing = out.get(key)
        if existing is None:
            out[key] = row
        elif (PRIORITY.get(row["state"], -1), row["issue"]) > (PRIORITY.get(existing["state"], -1), existing["issue"]):
            out[key] = row
    return out


def chapter_label(title, position):
    m = CHAPTER_RE.search(title)
    if m:
        a, b = m.group(1), m.group(2)
        return "Cap. " + (a + "–" + b if b else a)
    return f"Vídeo {position}"


def verified_correction(video_id, correction):
    if not isinstance(correction, dict) or correction.get("verified") is not True:
        return None
    if correction.get("source") != "chatgpt":
        return None
    path = correction.get("image")
    if not isinstance(path, str) or not CORRECTED_RE.fullmatch(path):
        return None
    m = CORRECTED_RE.fullmatch(path)
    if m.group(1) != video_id:
        return None
    if not re.fullmatch(r"20\d\d-\d\d-\d\d", str(correction.get("reviewed_at") or "")):
        return None
    local = BASE / path.removeprefix("./")
    if not local.is_file() or local.stat().st_size < 100:
        return None
    return path


def build_progress(books, issues, corrections, sync_ok=True):
    rows, general = [], []
    data = corrections.get("videos", {}) if isinstance(corrections, dict) else {}
    for b in books:
        for pos, ch in enumerate(b.get("chapters", []), 1):
            entry = issues.get((b["slug"], ch["id"], None)) if sync_ok else None
            cimg = verified_correction(ch["id"], data.get(ch["id"]))
            rows.append({
                "book": b["slug"], "book_title": b["title"],
                "title": ch["title"], "chapter": chapter_label(ch["title"], pos),
                "video_id": ch["id"], "youtube_url": "https://www.youtube.com/watch?v=" + ch["id"],
                "nlm_status": entry["state"] if entry else ("no_verificado" if not sync_ok else "sin_solicitar"),
                "issue_url": entry["url"] if entry else None,
                "corrected": bool(cimg), "corrected_image": cimg,
            })
        for (slug, vid, volume), entry in issues.items():
            if slug == b["slug"] and vid is None:
                general.append({"book": slug, "book_title": b["title"],
                                "label": ("Tomo " + volume.removeprefix("tomo-").upper()) if volume else "Libro completo",
                                "nlm_status": entry["state"], "issue_url": entry["url"]})
    return {
        "version": 1,
        "updated_at": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
        "sync_ok": bool(sync_ok),
        "summary": {
            "videos": len(rows),
            "generated": sum(x["nlm_status"] == "generada" for x in rows),
            "corrected": sum(x["corrected"] for x in rows),
        },
        "books": [{"slug": b["slug"], "title": b["title"]} for b in books],
        "rows": rows, "general": general,
    }


def main():
    books = json.loads((BASE / "catalogo.json").read_text(encoding="utf-8"))["books"]
    corrections = json.loads((BASE / "progreso-corregidas.json").read_text(encoding="utf-8"))
    names = {b["slug"] for b in books}
    ok = True
    issues = {}
    try:
        issues = issue_map(fetch_issues(), names)
    except Exception as exc:
        ok = False
        print("WARN: no verified GitHub progress snapshot:", type(exc).__name__, file=sys.stderr)
    result = build_progress(books, issues, corrections, ok)
    target = BASE / "progreso.json"
    target.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("Biblioteca infographic progress:", result["summary"], "sync_ok:", ok)


if __name__ == "__main__":
    main()
