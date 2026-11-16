#!/usr/bin/env python3
"""Preflight de solo lectura y visor local para ocho candidatas de NotebookLM.

Ejecutar en el Mac del titular, dentro del repositorio IDEA LAB:
    python3 scripts/notebooklm_revisar_lote5.py
    python3 scripts/notebooklm_revisar_lote5.py --verify-only

No modifica, copia ni publica PNG. Nunca autoriza una publicación.
"""
from __future__ import annotations

import argparse
import hashlib
import html
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PENDING = Path.home() / "Pictures/IDEA-LAB/NotebookLM/Pendientes"
STATE_PATH = Path.home() / ".local/state/idea-lab/notebooklm-bridge.json"
CANDIDATES = ROOT / "biblioteca-montecristo/CANDIDATAS_LOTE5_2026-11-16.json"
CATALOG = ROOT / "biblioteca-montecristo/catalogo.json"
PUBLIC_INDEX = ROOT / "biblioteca-montecristo/infografias/index.json"
DEFAULT_REPORT = Path.home() / "Downloads/IDEA_LAB_QA_LOTE5.html"
PNG_SIGNATURE = bytes((137, 80, 78, 71, 13, 10, 26, 10))
SHA_256 = re.compile(r"[a-f0-9]{64}\\Z")


def read_json(path: Path, default=None):
    if not path.is_file():
        return default
    return json.loads(path.read_text(encoding="utf-8"))


def file_hash(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def validate_manifest(data: dict):
    if data.get("version") != 1 or data.get("review_status") != "PENDIENTE_DE_REVISION_EDITORIAL":
        raise ValueError("Manifiesto no válido o estado de revisión modificado.")
    entries = data.get("items", [])
    if len(entries) != 8:
        raise ValueError("Este preflight solo permite las ocho candidatas identificadas.")
    issues, videos = set(), set()
    for x in entries:
        if (not isinstance(x.get("issue"), int) or x["issue"] in issues
                or x.get("video_id") in videos or x.get("book") != "conde-montecristo"
                or not SHA_256.fullmatch(x.get("sha256") or "")
                or not re.fullmatch(r"[A-Za-z0-9_-]{11}", x.get("video_id") or "")
                or not x.get("source_url", "").startswith(
                    "https://fr.wikisource.org/wiki/Le_Comte_de_Monte-Cristo/Chapitre_")):
            raise ValueError("Issue, vídeo, hash o fuente inválida o repetida.")
        issues.add(x["issue"])
        videos.add(x["video_id"])
    return entries


def inspect_item(item: dict, state: dict, catalog: dict, public: dict, pending: Path) -> dict:
    issue, video, slug = item["issue"], item["video_id"], item["book"]
    target = pending / f"issue-{issue}.png"
    job = state.get(str(issue)) or {}
    public_block = (public.get("books") or {}).get(slug) or {}
    book = next((b for b in catalog.get("books", []) if b.get("slug") == slug), None)
    catalog_ok = bool(book and any(c.get("id") == video for c in book.get("chapters", [])))
    published = video in (public_block.get("chapters") or {})
    state_ok = (job.get("phase") == "downloaded" and
                (job.get("request") or {}).get("video_id") == video and
                (job.get("request") or {}).get("book") == slug and
                Path(job.get("path") or "/") == target)
    exists = target.is_file() and not target.is_symlink()
    signature_ok = False
    hash_ok = False
    actual_hash = None
    if exists:
        with target.open("rb") as image:
            signature_ok = image.read(8) == PNG_SIGNATURE
        if signature_ok:
            actual_hash = file_hash(target)
            hash_ok = actual_hash == item["sha256"]
    technical_ok = bool(exists and signature_ok and hash_ok and state_ok and catalog_ok and not published)
    return {
        "issue": issue, "chapter": item["chapter"], "title": item["title"],
        "video_id": video, "source_url": item["source_url"],
        "review_focus": item["review_focus"], "expected_hash": item["sha256"],
        "actual_hash": actual_hash, "path": str(target), "exists": exists,
        "signature_ok": signature_ok, "hash_ok": hash_ok, "state_ok": state_ok,
        "catalog_ok": catalog_ok, "published": published, "technical_ok": technical_ok,
        "editorial_approval": False,
    }


def render_report(rows: list[dict]) -> str:
    escape = html.escape
    blocks = []
    for row in rows:
        issue = row["issue"]
        flags = ", ".join(name for name in
            ("exists", "signature_ok", "hash_ok", "state_ok", "catalog_ok")
            if not row[name]) or "Controles locales superados"
        if row["published"]:
            flags += "; vídeo YA PUBLICADO: no duplicar"
        image_markup = (f'<img loading="lazy" src="{escape(Path(row["path"]).as_uri(), quote=True)}" '
                        f'alt="Original de la incidencia {issue}">' if row["exists"] else
                        "<p>PNG no disponible en la ruta local esperada.</p>")
        blocks.append(
            f'<article><h2>#{issue} · Capítulo {row["chapter"]}: '
            f'{escape(row["title"])}</h2>'
            f'<p class="warn">REVISIÓN EDITORIAL PENDIENTE · '
            f'{"Integridad OK" if row["technical_ok"] else escape(flags)}</p>'
            f'<p><a href="https://github.com/idealab2026/idealab2026.github.io/issues/{issue}">Incidencia #{issue}</a>'
            f' · <a href="{escape(row["source_url"], quote=True)}">Fuente textual</a></p>'
            f'<p><strong>Verificar:</strong> {escape(row["review_focus"])}</p>'
            f'<p class="hash">SHA esperado: {escape(row["expected_hash"])}<br>'
            f'SHA leído: {escape(row["actual_hash"] or "No disponible")}</p>'
            f'{image_markup}</article>'
        )
    return (
        '<!doctype html><html lang="es"><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width,initial-scale=1">'
        '<title>IDEA LAB · Revisión privada del lote 5</title>'
        '<style>body{margin:0 auto;max-width:1300px;padding:28px;background:#f6f4ef;color:#172630;'
        'font:16px/1.55 system-ui,sans-serif}article{margin:25px 0;padding:22px;background:white;'
        'border:1px solid #d9d7d0;border-radius:12px}h1{margin-bottom:0}h2{font-size:1.35rem}'
        'img{display:block;max-width:100%;height:auto;border:1px solid #d8d8d8}'
        'a{color:#135b83}.warn{color:#9b4c14;font-weight:750}.hash{font:12px/1.6 monospace;'
        'overflow-wrap:anywhere}</style><main>'
        '<h1>IDEA LAB · Preflight de ocho originales</h1><p>Archivo LOCAL y PRIVADO. '
        'La comprobación del SHA no constituye revisión editorial, autorización ni publicación.</p>'
        + "".join(blocks) + '</main></html>'
    )


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--verify-only", action="store_true", help="Solo diagnóstico de integridad; sin HTML")
    parser.add_argument("--output", type=Path, default=DEFAULT_REPORT,
                        help="Ruta local del visor HTML privado")
    args = parser.parse_args()
    data = read_json(CANDIDATES)
    items = validate_manifest(data or {})
    catalog = read_json(CATALOG, {})
    public = read_json(PUBLIC_INDEX, {})
    state = read_json(STATE_PATH, {})
    rows = [inspect_item(x, state, catalog, public, PENDING) for x in items]
    for x in rows:
        summary = "OK técnico" if x["technical_ok"] else (
            "ya publicado" if x["published"] else "incidencia técnica / original no disponible")
        print(f'#{x["issue"]}: {summary}; hash={x["hash_ok"]}; estado={x["state_ok"]}; catálogo={x["catalog_ok"]}')
    print("Aprobaciones editoriales nuevas: 0. No se ha subido ningún archivo.")
    if not args.verify_only:
        output = args.output.expanduser().resolve()
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(render_report(rows), encoding="utf-8")
        print("Visor privado:", output)
    if not all(x["technical_ok"] for x in rows):
        raise SystemExit(1)


if __name__ == "__main__":
    main()
