#!/usr/bin/env python3
"""Exportar originales de NotebookLM al Escritorio, clasificados por libro/capítulo.

Nunca crea infografías ni publica archivos. Conserva los PNG originales del Mac.
Las imágenes sin atribución inequívoca se guardan aparte en "Sin clasificar".
La carpeta está fuera del repositorio público y no contiene fuentes/cuadernos.
"""
from __future__ import annotations

import argparse
import csv
import json
import re
import subprocess
import sys
import tempfile
import unicodedata
from pathlib import Path

from notebooklm_bridge import (HOME, PENDING, ROOT, STATE_PATH, command,
                               infographic_rows, artifact_id, private_config,
                               load_json)
from notebooklm_infografias import sanitized_png

DESKTOP = HOME / "Desktop" / "IDEA LAB - Infografias" / "Originales NotebookLM"
CATALOG = ROOT / "biblioteca-montecristo/catalogo.json"
GROUP_TITLES = {
    "KwKDcgK-NVc": "La caida de Edmond Dantes",
    "JDBc-CWyqYY": "De la evasion al tesoro",
}
CAP = re.compile(
    r"\bcap(?:[ií]tulo)?\s*[:.\- ]*(\d{1,3})"
    r"(?:\s*(?:a|al|[-–])\s*(\d{1,3}))?", re.I
)


def safe_name(text: str, max_len: int = 96) -> str:
    text = unicodedata.normalize("NFKC", str(text))
    text = re.sub(r"[\x00-\x1f\x7f/\\:*?\"<>|]", " ", text)
    text = re.sub(r"\s+", " ", text).strip(" .")
    return text[:max_len].strip(" .") or "Sin titulo"


def chapter_label(book_slug: str, episode: dict, position: int) -> str:
    title = str(episode.get("title", ""))
    if book_slug == "conde-montecristo":
        match = CAP.search(title)
        if match:
            first = int(match.group(1))
            last = int(match.group(2)) if match.group(2) else first
            label = (f"Capitulos {first:02d}-{last:02d}" if last != first
                     else f"Capitulo {first:02d}")
            extra = GROUP_TITLES.get(episode["id"])
            if not extra and last == first:
                after = title[match.end():].strip(" :.-")
                if after and len(after) < 90:
                    extra = after
            return safe_name(label + (" - " + extra if extra else ""))
    # Conservar el orden del vídeo y su título real: hay capítulos
    # romanos, partes y episodios que no coinciden con el orden del canal.
    return safe_name(f"Episodio {position:02d} - {title}", 110)


def book_volume(slug: str, episode: dict) -> str | None:
    if slug != "conde-montecristo":
        return None
    match = CAP.search(str(episode.get("title", "")))
    if not match:
        return "Tomo por revisar"
    return "Tomo I" if int(match.group(1)) <= 50 else "Tomo II"


def image_destination(book: dict, episode: dict | None, issue: str,
                      volume: str | None, position: int = 0,
                      root: Path = DESKTOP) -> Path:
    folder = root / safe_name(book["title"])
    if episode is None:
        folder = folder / "Infografias generales"
        label = "Resumen " + ("Tomo " + volume.removeprefix("tomo-").upper()
                              if volume else "del libro")
    else:
        v = book_volume(book["slug"], episode)
        if v:
            folder = folder / v
        label = chapter_label(book["slug"], episode, position)
        label += " - " + episode["id"]
    return folder / (safe_name(label + " - issue-" + issue, 150) + ".jpg")


def convert_to_jpg(source_png: bytes, output: Path) -> None:
    """Convertir una copia desprovista de metadatos mediante sips de macOS."""
    stripped = sanitized_png(source_png)
    output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix=".nlm-export-", dir=output.parent) as tmp:
        folder = Path(tmp)
        src = folder / "original-sin-metadatos.png"
        dst = folder / "convertida.jpg"
        src.write_bytes(stripped)
        subprocess.run(
            ["sips", "-s", "format", "jpeg", "-s", "formatOptions", "94",
             "--out", str(dst), str(src)],
            check=True, capture_output=True, text=True, timeout=100
        )
        if not dst.is_file() or dst.stat().st_size < 128:
            raise ValueError("Conversión JPEG incompleta")
        with dst.open("rb") as f:
            if f.read(2) != b"\xff\xd8":
                raise ValueError("La salida no es un JPEG")
        dst.replace(output)


def catalog_index(catalog: dict) -> tuple[dict, dict]:
    books = {b["slug"]: b for b in catalog["books"]}
    episodes = {
        (b["slug"], ep["id"]): (ep, i)
        for b in catalog["books"]
        for i, ep in enumerate(b["chapters"], 1)
    }
    return books, episodes


def export_known(state: dict, root: Path = DESKTOP, *,
                 catalog: dict | None = None, converter=convert_to_jpg,
                 verbose: bool = True) -> dict:
    if catalog is None:
        catalog = json.loads(CATALOG.read_text(encoding="utf-8"))
    books, episodes = catalog_index(catalog)
    entries = {}
    problems = []
    root.mkdir(parents=True, exist_ok=True)
    permitted_root = PENDING.resolve()

    for issue, job in sorted(state.items(), key=lambda kv: int(kv[0])):
        if job.get("phase") not in ("downloaded", "review-pr"):
            continue
        request = job.get("request") or {}
        slug, vid, vol = request.get("book"), request.get("video_id"), request.get("volume")
        book = books.get(slug)
        if not book:
            problems.append(f"#{issue}: libro no disponible en catálogo")
            continue
        if vid is None:
            episode, pos = None, 0
        else:
            found = episodes.get((slug, vid))
            if not found:
                problems.append(f"#{issue}: vídeo sin coincidencia en catálogo")
                continue
            episode, pos = found
        source = Path(job.get("path") or "")
        try:
            if not source.is_file() or source.resolve().parent != permitted_root:
                raise ValueError("PNG original inexistente o fuera de Pendientes")
            dest = image_destination(book, episode, str(issue), vol, pos, root)
            if not dest.is_file():
                converter(source.read_bytes(), dest)
            if not dest.is_file() or dest.stat().st_size < 128:
                raise ValueError("JPG ausente o vacío")
        except (ValueError, OSError, subprocess.SubprocessError) as exc:
            problems.append(f"#{issue}: {type(exc).__name__}: {exc}")
            continue
        entries[(slug, vid, vol)] = dest
    inventory = root.parent / "INVENTARIO.csv"
    with inventory.open("w", encoding="utf-8-sig", newline="") as out:
        writer = csv.writer(out)
        writer.writerow(["Libro", "Tomo", "Capítulo / vídeo", "Vídeo YouTube",
                         "NotebookLM", "ChatGPT", "Archivo JPG"])
        for b in catalog["books"]:
            for pos, ep in enumerate(b["chapters"], 1):
                key = (b["slug"], ep["id"], None)
                file = entries.get(key)
                matching = [job for job in state.values()
                            if (job.get("request") or {}).get("book") == b["slug"]
                            and (job.get("request") or {}).get("video_id") == ep["id"]]
                phase = next((job.get("phase") for job in matching), "sin registro local")
                label = chapter_label(b["slug"], ep, pos)
                writer.writerow([
                    b["title"], book_volume(b["slug"], ep) or "", label,
                    ep.get("url") or "https://www.youtube.com/watch?v=" + ep["id"],
                    "Exportada JPG" if file else phase,
                    "Pendiente", str(file) if file else "",
                ])
    summary = {
        "exported": len(entries),
        "total_videos": sum(len(b["chapters"]) for b in catalog["books"]),
        "errors": problems,
        "root": str(root),
        "inventory": str(inventory),
    }
    if verbose:
        print(f"Originales JPEG clasificados: {len(entries)} / {summary['total_videos']} vídeos")
        print("Carpeta:", root)
        print("Inventario:", inventory)
        for err in problems:
            print("ATENCIÓN:", err, file=sys.stderr)
    return summary


def scan_unassigned(state: dict, root: Path = DESKTOP,
                    catalog: dict | None = None, *, verbose=True) -> dict:
    """Archivar infografías completas de Studio sin afirmar capítulo incorrecto."""
    if catalog is None:
        catalog = json.loads(CATALOG.read_text(encoding="utf-8"))
    books, _ = catalog_index(catalog)
    config = private_config()
    notebooks = {}
    for slug, cfg in config.get("books", {}).items():
        if slug not in books:
            continue
        for key, nid in cfg.get("notebooks", {}).items():
            notebooks.setdefault(nid, set()).add((slug, key))
        for ep in cfg.get("episodes", {}).values():
            nid = ep.get("notebook")
            if nid:
                notebooks.setdefault(nid, set()).add((slug, "episodio"))
    assigned = {j.get("artifact_id") for j in state.values() if j.get("artifact_id")}
    created, warnings = 0, []
    for notebook, links in notebooks.items():
        slugs = {slug for slug, _ in links}
        if len(slugs) != 1:
            warnings.append("Cuaderno compartido entre libros: no se clasifica automáticamente")
            continue
        slug = next(iter(slugs))
        volume_values = {v for _, v in links if v in ("tomo-i", "tomo-ii")}
        volume = (next(iter(volume_values)) if len(volume_values) == 1 else None)
        folder = (root / safe_name(books[slug]["title"]) /
                  (volume.replace("tomo-", "Tomo ").upper() if volume else "") /
                  "Sin clasificar")
        try:
            records = infographic_rows(notebook)
        except (ValueError, OSError, RuntimeError, subprocess.SubprocessError) as exc:
            warnings.append(f"{slug}: no se pudo consultar Studio ({type(exc).__name__})")
            continue
        for row in records:
            aid = artifact_id(row)
            if not aid or aid in assigned:
                continue
            st = str(row.get("status") or row.get("state") or "").lower()
            if st != "3" and not any(k in st for k in ("complet", "ready", "finish", "success")):
                continue
            title = row.get("title") or row.get("name") or "Infografia sin titulo"
            filename = safe_name(str(title), 75) + " - " + safe_name(aid, 100) + ".jpg"
            out = folder / filename
            if out.is_file():
                continue
            try:
                with tempfile.TemporaryDirectory(prefix="nlm-studio-") as tmp:
                    raw = Path(tmp) / "artefacto.png"
                    command(["nlm", "download", "infographic", notebook,
                             "--id", aid, "--output", str(raw)], timeout=180)
                    convert_to_jpg(raw.read_bytes(), out)
                created += 1
            except (ValueError, OSError, RuntimeError, subprocess.SubprocessError) as exc:
                warnings.append(f"{slug}: error al descargar infografía sin clasificar ({type(exc).__name__})")
    if verbose:
        print("Otras infografías terminadas archivadas en 'Sin clasificar':", created)
        for warning in warnings:
            print("ATENCIÓN:", warning, file=sys.stderr)
    return {"unassigned_saved": created, "warnings": warnings}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--scan-studio", action="store_true",
                        help="También archiva las terminadas sin correspondencia en 'Sin clasificar'")
    parser.add_argument("--open", action="store_true", help="Abrir la carpeta al terminar")
    args = parser.parse_args()
    state = load_json(STATE_PATH, {})
    result = export_known(state)
    if args.scan_studio:
        scan_unassigned(state)
    if args.open:
        subprocess.run(["open", str(DESKTOP.parent)], check=False)
    return 1 if result["errors"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
