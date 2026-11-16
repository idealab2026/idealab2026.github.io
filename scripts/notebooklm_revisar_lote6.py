#!/usr/bin/env python3
"""Preflight local del lote 6. No genera, aprueba ni publica infografías.

  python3 scripts/notebooklm_revisar_lote6.py --export-zip
  python3 scripts/notebooklm_revisar_lote6.py --source-zip ~/Desktop/IDEA_LAB_PNG_pendientes_QA.zip --export-zip

Los originales se leen de Pendientes o, si faltan, de un ZIP privado local.
Solo exporta los ocho archivos autorizados para *revisión*, nunca para publicar.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import tempfile
import zipfile
from pathlib import Path, PurePosixPath

from notebooklm_bridge import PENDING, ROOT
from notebooklm_infografias import sanitized_png

MANIFEST = ROOT / "biblioteca-montecristo/CANDIDATAS_LOTE6_2026-11-16.json"
CATALOG = ROOT / "biblioteca-montecristo/catalogo.json"
PUBLIC = ROOT / "biblioteca-montecristo/infografias/index.json"
OUTPUT = Path.home() / "Downloads/IDEA_LAB_LOTE6_REVISION_8PNG.zip"
ISSUES = (42, 45, 47, 48, 49, 68, 69, 85)
SHA = re.compile(r"[0-9a-f]{64}\Z")
VIDEO = re.compile(r"[A-Za-z0-9_-]{11}\Z")
PNG_SIG = b"\x89PNG\r\n\x1a\n"
MAX_BYTES = 22_000_000


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def validate_manifest(data: dict, catalog: dict) -> list[dict]:
    if (data.get("version") != 1 or
        data.get("scope") != "LOTE6_REVISION_SOLO_LECTURA" or
        data.get("editorial_approval") is not False or
        data.get("publication_authorized") is not False or
        data.get("originals_expected") != len(ISSUES)):
        raise ValueError("Manifiesto editorial no reconocido o marcado como aprobado.")
    rows = data.get("originals")
    if not isinstance(rows, list) or [x.get("issue") for x in rows] != list(ISSUES):
        raise ValueError("Lote 6 debe contener exactamente las ocho incidencias seleccionadas.")
    book = next((b for b in catalog.get("books", [])
                 if b.get("slug") == "conde-montecristo"), None)
    if not book:
        raise ValueError("No se encuentra el libro en el catálogo.")
    videos = {ep["id"] for ep in book.get("chapters", [])}
    seen = set()
    for row in rows:
        issue, video = row["issue"], row.get("video_id")
        if (row.get("book") != "conde-montecristo" or
            row.get("filename") != f"issue-{issue}.png" or
            not isinstance(video, str) or not VIDEO.fullmatch(video) or
            video not in videos or video in seen or
            not isinstance(row.get("sha256"), str) or not SHA.fullmatch(row["sha256"]) or
            row.get("editorial_approved") is not False or
            row.get("source_url") !=
                f"https://fr.wikisource.org/wiki/Le_Comte_de_Monte-Cristo/Chapitre_{row.get('chapter')}" or
            row.get("status") not in {"CORREGIR", "BLOQUEADA", "AJUSTE OPCIONAL"}):
            raise ValueError(f"#{issue}: fichero, identidad, hash o estado inválido.")
        seen.add(video)
    return rows


def public_video_status(row: dict, public: dict) -> bool:
    if public.get("version") != 1:
        raise ValueError("El índice de infografías es inválido.")
    paths = public.get("books", {}).get(row["book"], {}).get("chapters", {})
    if row["video_id"] not in paths:
        return False
    expected = f'./infografias/{row["book"]}/{row["video_id"]}.png'
    if paths[row["video_id"]] != expected:
        raise ValueError(f'#{row["issue"]}: URL publicada inesperada.')
    return True


def locate_zip_member(archive: zipfile.ZipFile, filename: str):
    matches = []
    for info in archive.infolist():
        path = PurePosixPath(info.filename)
        if (not info.is_dir() and path.name == filename and
            ".." not in path.parts and not info.filename.startswith("/")):
            matches.append(info)
    if len(matches) > 1:
        raise ValueError(f"ZIP con dos archivos llamados {filename}; se cancela.")
    return matches[0] if matches else None


def read_original(row: dict, source_dir: Path, archive: zipfile.ZipFile | None) -> bytes:
    path = source_dir / row["filename"]
    if path.is_symlink():
        raise ValueError("No se aceptan imágenes que sean enlaces simbólicos.")
    if path.exists():
        if not path.is_file() or path.resolve().parent != source_dir.resolve():
            raise ValueError("Archivo original fuera de la carpeta seleccionada.")
        if path.stat().st_size > MAX_BYTES:
            raise ValueError("Original de tamaño excesivo.")
        raw = path.read_bytes()
    elif archive:
        info = locate_zip_member(archive, row["filename"])
        if not info:
            raise FileNotFoundError(f'Falta {row["filename"]} también en el ZIP de reserva.')
        if info.file_size > MAX_BYTES:
            raise ValueError("PNG del ZIP demasiado grande.")
        raw = archive.read(info)
    else:
        raise FileNotFoundError(f'No existe {row["filename"]} en la carpeta local.')
    if len(raw) < 33 or not raw.startswith(PNG_SIG):
        raise ValueError("Firma PNG original incorrecta.")
    if digest(raw) != row["sha256"]:
        raise ValueError("SHA-256 del ORIGINAL distinto al auditado: NO APROBAR.")
    # Validate PNG structure without changing the original.
    sanitized_png(raw)
    return raw


def create_private_zip(rows: list[dict], originals: dict[int, bytes], output: Path) -> Path:
    if set(originals) != {x["issue"] for x in rows}:
        raise ValueError("Faltan imágenes; prohibida la exportación parcial.")
    output = output.expanduser()
    output.parent.mkdir(parents=True, exist_ok=True)
    if output.is_symlink():
        raise ValueError("El ZIP de salida es un enlace simbólico.")
    fd, tmp = tempfile.mkstemp(dir=output.parent, prefix=".lote6-", suffix=".zip")
    os.close(fd)
    temporary = Path(tmp)
    try:
        metadata = []
        with zipfile.ZipFile(temporary, "w", compression=zipfile.ZIP_STORED) as zf:
            for row in rows:
                issue = row["issue"]
                raw = originals[issue]
                if digest(raw) != row["sha256"]:
                    raise ValueError(f"#{issue}: cambió el original durante la exportación.")
                clean = sanitized_png(raw)
                file = row["filename"]
                zf.writestr(file, clean)
                metadata.append({
                    "issue": issue, "book": row["book"],
                    "chapter": row["chapter"], "video_id": row["video_id"],
                    "file": file,
                    "original_sha256": row["sha256"],
                    "export_sha256": digest(clean),
                    "source": row["source_url"],
                    "editorial_approval": False,
                })
            zf.writestr("manifest.json", json.dumps({
                "version": 1,
                "status": "PENDIENTE_DE_REVISION_EDITORIAL",
                "purpose": "Revisión privada de ocho PNG; no permite publicación.",
                "items": metadata,
            }, ensure_ascii=False, indent=2) + "\n")
        os.replace(temporary, output)
    finally:
        temporary.unlink(missing_ok=True)
    return output


def run(source_dir: Path, source_zip: Path | None, output: Path, export: bool) -> int:
    data = json.loads(MANIFEST.read_text(encoding="utf-8"))
    catalog = json.loads(CATALOG.read_text(encoding="utf-8"))
    public = json.loads(PUBLIC.read_text(encoding="utf-8"))
    rows = validate_manifest(data, catalog)
    archive = None
    if source_zip:
        source_zip = source_zip.expanduser()
        if source_zip.is_symlink() or not source_zip.is_file():
            raise ValueError("El ZIP privado de origen no está disponible.")
        archive = zipfile.ZipFile(source_zip)
    originals, problems = {}, []
    try:
        for row in rows:
            try:
                if public_video_status(row, public):
                    raise ValueError("El capítulo ya está publicado; cancelar nueva exportación.")
                raw = read_original(row, source_dir.expanduser(), archive)
                originals[row["issue"]] = raw
                print(f'#{row["issue"]} · capítulo {row["chapter"]}: SHA-256 correcto; PENDIENTE DE REVISIÓN EDITORIAL')
            except (ValueError, FileNotFoundError, OSError, zipfile.BadZipFile) as exc:
                problems.append(row["issue"])
                print(f'#{row["issue"]}: ERROR {type(exc).__name__}: {exc}')
    finally:
        if archive:
            archive.close()
    print(f'Integridad local: {len(originals)}/8 | Errores: {len(problems)}')
    print("Aprobaciones editoriales nuevas: 0. No se ha publicado nada.")
    if problems:
        print("No se generará ZIP parcial. Comprobar ruta de los originales.")
        return 1
    if export:
        target = create_private_zip(rows, originals, output)
        print(f"ZIP privado listo: {target}")
        print("Adjuntar este ZIP a la conversación para iniciar el contraste visual.")
    return 0


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-dir", type=Path, default=PENDING,
                        help="Carpeta local que contiene issue-N.png")
    parser.add_argument("--source-zip", type=Path,
                        help="ZIP local adicional para originales no presentes en --source-dir")
    parser.add_argument("--export-zip", action="store_true",
                        help="Crear ZIP privado de 8 PNG verificados y saneados")
    parser.add_argument("--output", type=Path, default=OUTPUT)
    opts = parser.parse_args()
    raise SystemExit(run(opts.source_dir, opts.source_zip, opts.output, opts.export_zip))


if __name__ == "__main__":
    main()
