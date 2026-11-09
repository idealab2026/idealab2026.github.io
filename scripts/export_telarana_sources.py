#!/usr/bin/env python3
"""Exportar únicamente las fuentes de tres cuadernos CULTURA de NotebookLM.

Uso:
    python3 scripts/export_telarana_sources.py --all
    python3 scripts/export_telarana_sources.py --video-id qARZpON9_j0

Solo lectura. No crea contenido en NotebookLM ni sube documentos a GitHub.
Las transcripciones y fuentes exportadas permanecen en el Mac del usuario.
"""
from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
import tempfile
import unicodedata
import zipfile
from pathlib import Path
from urllib.parse import parse_qs, urlsplit

BOOKS = {
    "cultura geopolitica espana",
    "cultura geopolitica",
    "cultura historia moderna",
}
VIDEO_ID = re.compile(r"[a-zA-Z0-9_-]{11}\Z")


def normalize(value: object) -> str:
    text = unicodedata.normalize("NFD", str(value or "").lower())
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    return " ".join(re.sub(r"[^a-z0-9]+", " ", text).split())


def get_items(value: object, keys: tuple[str, ...]) -> list[dict]:
    if isinstance(value, list):
        return [row for row in value if isinstance(row, dict)]
    if isinstance(value, dict):
        for key in (*keys, "data", "results", "items"):
            if key in value:
                return get_items(value[key], keys)
    return []


def call_nlm(*args: str, timeout: int = 180) -> str:
    try:
        run = subprocess.run(
            ["nlm", *args], check=False, text=True,
            capture_output=True, timeout=timeout,
        )
    except FileNotFoundError:
        raise RuntimeError("No encuentro 'nlm' en el PATH; activa su instalación antes.")
    except subprocess.TimeoutExpired:
        raise RuntimeError("Tiempo excedido: nlm " + " ".join(args[:3]))
    if run.returncode:
        detail = (run.stderr or run.stdout).strip()[-450:]
        raise RuntimeError("NotebookLM devolvió error: " + detail)
    return run.stdout


def get_json(*args: str) -> object:
    raw = call_nlm(*args)
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        raise RuntimeError("La salida JSON de NotebookLM no tiene un formato válido.")
    if isinstance(data, dict) and data.get("status") == "error":
        raise RuntimeError(str(data.get("error", "Error de API")))
    return data


def youtube_id(url: str) -> str:
    try:
        p = urlsplit(url)
        host = (p.hostname or "").lower()
        if host in ("youtu.be", "www.youtu.be"):
            candidate = p.path.strip("/").split("/")[0]
        elif host in ("youtube.com", "www.youtube.com", "m.youtube.com"):
            candidate = parse_qs(p.query).get("v", [""])[0]
            if not candidate and p.path.startswith(("/live/", "/shorts/", "/embed/")):
                candidate = p.path.strip("/").split("/")[1]
        else:
            return ""
        return candidate if VIDEO_ID.fullmatch(candidate) else ""
    except (IndexError, ValueError):
        return ""


def slug(text: str) -> str:
    return normalize(text).replace(" ", "-")[:56] or "fuente"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--all", action="store_true", help="Exportar las 33 fuentes de CULTURA")
    group.add_argument("--video-id", help="Exportar una fuente de YouTube por ID exacto")
    args = parser.parse_args()
    if args.video_id and not VIDEO_ID.fullmatch(args.video_id):
        parser.error("El ID de YouTube debe contener 11 caracteres válidos.")

    books = get_items(get_json("notebook", "list", "--json"), ("notebooks",))
    targets = [
        b for b in books
        if normalize(b.get("title") or b.get("name")) in BOOKS
    ]
    if not targets:
        raise RuntimeError("No encuentro los cuadernos CULTURA. Comprueba nlm notebook list.")
    if args.all and len(targets) != 3:
        raise RuntimeError(
            "Faltan cuadernos. Encontrados: " + ", ".join(
                str(b.get("title") or b.get("name")) for b in targets
            )
        )

    sources: list[dict] = []
    for book in targets:
        title = str(book.get("title") or book.get("name") or "")
        notebook_id = str(book.get("id") or book.get("notebook_id") or "")
        if not notebook_id:
            raise RuntimeError("El cuaderno no tiene ID: " + title)
        rows = get_items(get_json("source", "list", notebook_id, "--json"), ("sources",))
        print(f"{title}: {len(rows)} fuentes")
        for row in rows:
            url = row.get("url") or row.get("source_url") or row.get("original_url") or ""
            if isinstance(url, dict):
                url = url.get("url") or url.get("href") or ""
            source_id = str(row.get("id") or row.get("source_id") or "")
            video_id = youtube_id(str(url))
            if not source_id:
                continue
            if not args.all and video_id != args.video_id:
                continue
            sources.append({
                "notebook": title, "source_id": source_id,
                "title": str(row.get("title") or row.get("name") or ""),
                "url": str(url), "video_id": video_id,
            })

    if not sources:
        raise RuntimeError("No hay fuentes coincidentes; no se exporta nada.")

    output = Path.home() / "Downloads" / (
        "telarana_fuentes_textos.zip" if args.all
        else f"telarana_fuente_{args.video_id}.zip"
    )
    output.parent.mkdir(parents=True, exist_ok=True)
    manifest: list[dict] = []
    errors: list[dict] = []
    with tempfile.TemporaryDirectory(prefix="telarana_nlm_") as folder:
        with zipfile.ZipFile(output, "w", zipfile.ZIP_DEFLATED, compresslevel=7) as archive:
            for number, source in enumerate(sources, 1):
                filename = (
                    f"fuentes/{number:02d}_"
                    f"{source['video_id'] or 'otro'}_"
                    f"{slug(source['title'])}.txt"
                )
                local = Path(folder) / "export.txt"
                local.unlink(missing_ok=True)
                try:
                    result = call_nlm(
                        "source", "content", source["source_id"],
                        "--output", str(local),
                        timeout=240,
                    )
                    if local.is_file():
                        content = local.read_text(encoding="utf-8")
                    else:
                        content = result
                    if not content.strip() or (
                        content.lstrip().startswith("{")
                        and '"status": "error"' in content[:120]
                    ):
                        raise RuntimeError("NotebookLM no devolvió texto legible")
                    archive.writestr(filename, content)
                    manifest.append({
                        "file": filename,
                        "notebook": source["notebook"],
                        "title": source["title"],
                        "url": source["url"],
                        "video_id": source["video_id"],
                        "characters": len(content),
                    })
                    print(f"[{number}/{len(sources)}] OK: {source['title'][:65]}")
                except (RuntimeError, UnicodeError, OSError) as exc:
                    errors.append({
                        "title": source["title"], "notebook": source["notebook"],
                        "reason": str(exc)[:350],
                    })
                    print(f"[{number}/{len(sources)}] NO EXPORTADA: {source['title'][:65]}")
            archive.writestr(
                "manifest.json", json.dumps(
                    {"version": 1, "exported": manifest, "errors": errors,
                     "selected_sources": len(sources),
                     "private_data_notice": "Archivo local: no publicar en un repositorio web"},
                    ensure_ascii=False, indent=2,
                ),
            )
    print(f"\nExportadas: {len(manifest)}/{len(sources)}")
    print("Archivo:", output)
    if errors:
        print("Incidencias:", len(errors), "(ver manifest.json del ZIP)")
    print("Los textos NO se han enviado a GitHub ni a ningún servicio adicional.")
    return 0 if manifest else 1


if __name__ == "__main__":
    try:
        sys.exit(main())
    except (RuntimeError, OSError) as error:
        print("ERROR:", error, file=sys.stderr)
        sys.exit(1)
