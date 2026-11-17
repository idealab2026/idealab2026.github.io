#!/usr/bin/env python3
"""Exportar 8 originales del lote 7 para revisión editorial privada, sin publicarlos.

python3 scripts/notebooklm_revisar_lote7.py --export-zip
python3 scripts/notebooklm_revisar_lote7.py --source-zip ~/Desktop/IDEA_LAB_PNG_pendientes_QA.zip --export-zip

La identidad se acredita con el estado local del puente o con MANIFIESTO_QA.json
en el ZIP antiguo. Una coincidencia de nombre SIN identidad nunca es suficiente.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import struct
import tempfile
import zipfile
from pathlib import Path, PurePosixPath

from notebooklm_bridge import PENDING, ROOT, STATE_PATH, load_json
from notebooklm_infografias import sanitized_png

MANIFEST = ROOT / "biblioteca-montecristo/CANDIDATAS_LOTE7_2026-11-17.json"
CATALOG = ROOT / "biblioteca-montecristo/catalogo.json"
PUBLIC = ROOT / "biblioteca-montecristo/infografias/index.json"
DEST = Path.home() / "Downloads/IDEA_LAB_LOTE7_REVISION_8PNG.zip"
PINNED = {
    27: (51, "oVMG6QzBK64"),
    32: (53, "FkAIE4ypFaI"),
    33: (54, "WNTSHJFOPfA"),
    35: (56, "upSoJolzqUk"),
    36: (57, "3YFtBdqwa1A"),
    37: (58, "NkQsH2Lb6pE"),
    39: (60, "hGf4PtrijvE"),
    51: (72, "BSoTWtrNVPc"),
}
SIG = b"\x89PNG\r\n\x1a\n"
MAX_BYTES = 22_000_000
SHA = re.compile(r"[a-f0-9]{64}\Z")


def sha(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()


def load_candidates(*, check_unpublished: bool = True) -> list[dict]:
    data = json.loads(MANIFEST.read_text(encoding="utf-8"))
    if (data.get("version") != 1 or data.get("scope") != "LOTE7_AUDITORIA_PRIVADA"
            or data.get("editorial_approved") is not False
            or data.get("publication_authorized") is not False
            or data.get("originals_expected") != 8):
        raise ValueError("No es el manifiesto privado de lote 7.")
    rows = data.get("originals")
    if not isinstance(rows, list) or [x.get("issue") for x in rows] != list(PINNED):
        raise ValueError("Se esperaban exactamente los ocho issues del lote 7.")
    cat = json.loads(CATALOG.read_text(encoding="utf-8"))
    book = next(b for b in cat["books"] if b.get("slug") == "conde-montecristo")
    valid_videos = {v["id"] for v in book["chapters"]}
    public = json.loads(PUBLIC.read_text(encoding="utf-8"))
    if public.get("version") != 1:
        raise ValueError("Versión pública del índice no reconocida.")
    published = public.get("books", {}).get("conde-montecristo", {}).get("chapters", {})
    for row in rows:
        issue = row["issue"]
        chapter, video = PINNED[issue]
        if (row.get("chapter") != chapter or row.get("video_id") != video
                or video not in valid_videos or row.get("book") != "conde-montecristo"
                or row.get("filename") != f"issue-{issue}.png"
                or row.get("editorial_approved") is not False
                or row.get("expected_original_sha256") is not None
                or row.get("source_url") !=
                    f"https://fr.wikisource.org/wiki/Le_Comte_de_Monte-Cristo/Chapitre_{chapter}"):
            raise ValueError(f"#{issue}: identidad o procedencia no reconocida.")
        if check_unpublished and video in published:
            raise ValueError(f"#{issue}: ya publicado en main. No volver a exportar.")
    return rows


def check_png(raw: bytes) -> None:
    if not SIG == raw[:8] or not 100_000 <= len(raw) <= MAX_BYTES:
        raise ValueError("PNG ausente, firma incorrecta o tamaño fuera de rango.")
    if len(raw) < 33 or raw[12:16] != b"IHDR":
        raise ValueError("La cabecera IHDR es inválida.")
    if struct.unpack(">II", raw[16:24]) != (2752, 1536):
        raise ValueError("Resolución distinta de los originales 2752×1536.")
    sanitized_png(raw)


def zip_identity(archive: zipfile.ZipFile) -> dict[int, dict]:
    candidates = [x for x in archive.infolist() if x.filename == "MANIFIESTO_QA.json"]
    if len(candidates) != 1 or candidates[0].file_size > 1_000_000:
        raise ValueError("El ZIP antiguo no contiene un único MANIFIESTO_QA.json válido.")
    data = json.loads(archive.read(candidates[0]))
    if data.get("version") != 1 or not isinstance(data.get("issues"), list):
        raise ValueError("Esquema antiguo de identidad no reconocido.")
    mapping = {}
    for x in data["issues"]:
        issue = x.get("issue")
        if issue in mapping:
            raise ValueError(f"Issue duplicado en manifiesto: {issue}.")
        mapping[issue] = x
    return mapping


def read_original(row: dict, folder: Path, state: dict,
                  archive: zipfile.ZipFile | None, identity: dict[int, dict]) -> bytes:
    issue, video = row["issue"], row["video_id"]
    local = folder / row["filename"]
    if local.is_symlink():
        raise ValueError("El original local es un enlace simbólico.")
    if local.exists():
        job = state.get(str(issue), {})
        req = job.get("request") or {}
        if (job.get("phase") not in ("downloaded", "review-pr")
                or req.get("book") != row["book"] or req.get("video_id") != video
                or req.get("volume") is not None or Path(job.get("path") or "/") != local
                or not local.is_file() or local.resolve().parent != folder.resolve()):
            raise ValueError(f"#{issue}: existe PNG pero no estado privado válido del puente.")
        if local.stat().st_size > MAX_BYTES:
            raise ValueError("Imagen local demasiado grande.")
        raw = local.read_bytes()
    elif archive is not None:
        record = identity.get(issue)
        if not record or any((
            record.get("book") != row["book"],
            record.get("video_id") != video,
            record.get("volume") is not None,
            record.get("name") != row["filename"],
            not isinstance(record.get("sha256"), str),
        )) or not SHA.fullmatch(record["sha256"]):
            raise ValueError(f"#{issue}: la identidad del ZIP antiguo es insuficiente.")
        matches = []
        for info in archive.infolist():
            parts = PurePosixPath(info.filename)
            if (not info.is_dir() and parts.name == row["filename"]
                    and not info.filename.startswith("/")
                    and ".." not in parts.parts):
                matches.append(info)
        if len(matches) != 1:
            raise ValueError(f"#{issue}: PNG ausente o duplicado dentro del ZIP.")
        if matches[0].file_size > MAX_BYTES:
            raise ValueError("Archivo comprimido supera el tamaño permitido.")
        raw = archive.read(matches[0])
        if sha(raw) != record["sha256"]:
            raise ValueError(f"#{issue}: el SHA no coincide con MANIFIESTO_QA.")
    else:
        raise FileNotFoundError(f'#{issue}: falta el original issue-{issue}.png y un ZIP histórico acreditado.')
    check_png(raw)
    return raw


def write_review_zip(rows: list[dict], raw_images: dict[int, bytes], path: Path) -> Path:
    if set(raw_images) != {r["issue"] for r in rows}:
        raise ValueError("Exportación incompleta: no se permite generar un ZIP parcial.")
    path = path.expanduser()
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.is_symlink():
        raise ValueError("Destino ZIP es un enlace simbólico.")
    fd, name = tempfile.mkstemp(dir=path.parent, prefix=".lote7-", suffix=".zip")
    os.close(fd)
    temporary = Path(name)
    try:
        items, hashes = [], set()
        with zipfile.ZipFile(temporary, "w", compression=zipfile.ZIP_STORED) as out:
            for row in rows:
                raw = raw_images[row["issue"]]
                check_png(raw)
                clean = sanitized_png(raw)
                digest = sha(clean)
                if digest in hashes:
                    raise ValueError("Dos imágenes saneadas son idénticas: revisar la procedencia.")
                hashes.add(digest)
                out.writestr(row["filename"], clean)
                items.append({
                    "issue": row["issue"], "chapter": row["chapter"],
                    "video_id": row["video_id"], "book": row["book"],
                    "file": row["filename"],
                    "original_sha256": sha(raw), "export_sha256": digest,
                    "editorial_approved": False,
                    "source_url": row["source_url"],
                })
            out.writestr("manifest.json", json.dumps({
                "version": 1, "status": "PENDIENTE_DE_REVISION_EDITORIAL",
                "publication_authorized": False, "items": items,
            }, ensure_ascii=False, indent=2) + "\n")
        os.replace(temporary, path)
    finally:
        temporary.unlink(missing_ok=True)
    return path


def run(source_dir: Path, source_zip: Path | None, output: Path, export: bool) -> int:
    rows = load_candidates()
    state = load_json(STATE_PATH, {})
    archive = None
    identity = {}
    if source_zip:
        source_zip = source_zip.expanduser()
        if not source_zip.is_file() or source_zip.is_symlink():
            raise ValueError("No se encuentra el ZIP histórico.")
        archive = zipfile.ZipFile(source_zip)
        identity = zip_identity(archive)
    raw_images, failures = {}, []
    try:
        for row in rows:
            try:
                raw = read_original(row, source_dir.expanduser(), state, archive, identity)
                raw_images[row["issue"]] = raw
                print(f'#{row["issue"]} · capítulo {row["chapter"]}: SHA original {sha(raw)} · identidad validada')
            except (ValueError, FileNotFoundError, OSError, zipfile.BadZipFile) as exc:
                failures.append(row["issue"])
                print(f'#{row["issue"]}: ERROR {type(exc).__name__}: {exc}')
    finally:
        if archive:
            archive.close()
    print(f"Integridad: {len(raw_images)}/8 | fallos: {len(failures)} | aprobaciones: 0")
    if failures:
        print("Sin exportación parcial; buscar los originales o usar un ZIP histórico con manifiesto.")
        return 1
    if export:
        target = write_review_zip(rows, raw_images, output)
        print("ZIP privado para adjuntar y revisar:", target)
    print("No se ha publicado ni aprobado ninguna imagen.")
    return 0


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-dir", type=Path, default=PENDING)
    parser.add_argument("--source-zip", type=Path)
    parser.add_argument("--output", type=Path, default=DEST)
    parser.add_argument("--export-zip", action="store_true")
    args = parser.parse_args()
    raise SystemExit(run(args.source_dir, args.source_zip, args.output, args.export_zip))


if __name__ == "__main__":
    main()
