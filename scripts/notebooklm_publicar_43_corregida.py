#!/usr/bin/env python3
"""Publicación estricta de #43 corregida: solo acepta un ZIP privado con SHA aprobado.

Uso en Mac autenticado, tras git pull:
    python3 scripts/notebooklm_publicar_43_corregida.py
    python3 scripts/notebooklm_publicar_43_corregida.py --publish
"""
from __future__ import annotations

import argparse
import hashlib
import json
import struct
import zipfile
from pathlib import Path

from notebooklm_bridge import PENDING, ROOT, STATE_PATH, check_identity, command, load_json
from notebooklm_infografias import find_item, sanitized_png

APPROVAL = ROOT / "biblioteca-montecristo/APROBADA_CORREGIDA_43_2026-11-16.json"
INDEX = ROOT / "biblioteca-montecristo/infografias/index.json"
ZIP_DEFAULT = Path.home() / "Downloads/BBTK_MONT_CAP64_ISSUE43_CORRECCION.zip"
REPO = "idealab2026/idealab2026.github.io"
BRANCH = "feat/biblioteca-publicar-capitulo-64-corregido-43"
PINNED = {
    "issue": 43, "video_id": "0kIC9eByrOs",
    "corrected_sha256": "8c00bf1313fa0f58b331dc97bc588df485a531478b6a702fec342224e1f3de47",
    "source_export_sha256": "1e12a4a4d029cc512da3ce5ae54c54b62667f5c2e51fd757f6240e576c52ce6f",
    "source_original_sha256": "bfaa2aa4a051a5d40264681fab5048ca5fcae6a04052c79c2d34dfe28e6fb1d9",
}


def sha(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()


def validate_approval(data: dict) -> dict:
    expected = {
        "version": 1, "issue": 43, "chapter": 64, "book": "conde-montecristo",
        "video_id": "0kIC9eByrOs", "file": "issue-43-corregida.png",
        "source_zip_name": ZIP_DEFAULT.name,
        "status": "APROBADO_PARA_PUBLICACION_CORREGIDA",
        "width": 2752, "height": 1536,
        "source": "https://fr.wikisource.org/wiki/Le_Comte_de_Monte-Cristo/Chapitre_64",
        "approved_for_publication": True,
        **PINNED,
    }
    for key, value in expected.items():
        if data.get(key) != value:
            raise ValueError(f"Dictamen editorial #43 modificado: {key}.")
    return data


def verify_zip(path: Path, data: dict) -> bytes:
    if path.is_symlink() or not path.is_file() or path.stat().st_size > 23_000_000:
        raise ValueError("Falta el ZIP corregido en Descargas o tamaño no permitido.")
    allowed = {"issue-43-corregida.png", "manifest.json", "LEEME.md"}
    with zipfile.ZipFile(path) as archive:
        infos = archive.infolist()
        if len(infos) != 3 or {x.filename for x in infos} != allowed:
            raise ValueError("El ZIP tiene entradas inesperadas, duplicadas o ausentes.")
        if any(x.file_size > 22_000_000 for x in infos) or archive.testzip() is not None:
            raise ValueError("ZIP corrupto o tamaño de entrada excesivo.")
        inner = json.loads(archive.read("manifest.json"))
        for key in ("version", "issue", "video_id", "file", "corrected_sha256",
                    "source_original_sha256", "source_export_sha256", "width", "height"):
            if inner.get(key) != data[key]:
                raise ValueError(f"Manifest del ZIP no coincide: {key}.")
        raw = archive.read(data["file"])
    if len(raw) < 24 or not raw.startswith(b"\x89PNG\r\n\x1a\n"):
        raise ValueError("PNG corregido con firma inválida.")
    if sha(raw) != data["corrected_sha256"]:
        raise ValueError("El hash de la imagen no es el aprobado.")
    if struct.unpack(">II", raw[16:24]) != (2752, 1536):
        raise ValueError("Dimensiones de imagen incorrectas.")
    if sanitized_png(raw) != raw:
        raise ValueError("El PNG contiene metadatos auxiliares no permitidos.")
    return raw


def verify_original(data: dict):
    path = PENDING / "issue-43.png"
    state = load_json(STATE_PATH, {})
    job = state.get("43") or {}
    request = job.get("request") or {}
    if (not path.is_file() or path.is_symlink()
            or path.resolve().parent != PENDING.resolve()
            or Path(job.get("path") or "/") != path
            or job.get("phase") != "downloaded"
            or request.get("video_id") != data["video_id"]
            or request.get("book") != data["book"]
            or request.get("volume") is not None):
        raise ValueError("No consta original #43 íntegro en el Mac.")
    raw = path.read_bytes()
    if sha(raw) != data["source_original_sha256"]:
        raise ValueError("Hash original #43 distinto.")
    if sha(sanitized_png(raw)) != data["source_export_sha256"]:
        raise ValueError("Hash original saneado distinto.")
    book, chapter = find_item(data["book"], data["video_id"])
    if not chapter or book["slug"] != data["book"]:
        raise ValueError("El vídeo no pertenece al catálogo de Montecristo.")


def is_published(data: dict) -> bool:
    index = json.loads(INDEX.read_text(encoding="utf-8"))
    if index.get("version") != 1:
        raise ValueError("Índice público inválido.")
    video = data["video_id"]
    path = f'./infografias/conde-montecristo/{video}.png'
    current = index["books"]["conde-montecristo"].get("chapters", {})
    if video not in current:
        return False
    png = INDEX.parent / "conde-montecristo" / (video + ".png")
    if current[video] != path or not png.is_file() or sha(png.read_bytes()) != data["corrected_sha256"]:
        raise ValueError("Ya existe una versión publicada distinta: no sobrescribir.")
    return True


def create_pr(data: dict, raw: bytes, do_merge: bool):
    check_identity()
    if command(["git", "status", "--porcelain", "--untracked-files=all"], cwd=ROOT).strip():
        raise RuntimeError("El árbol Git tiene cambios sin guardar; cancelado.")
    command(["git", "fetch", "origin", "main"], cwd=ROOT, timeout=180)
    command(["git", "switch", "-c", BRANCH, "origin/main"], cwd=ROOT)
    if is_published(data):
        print("Ya está integrada la misma corrección; no duplicar.")
        return
    video = data["video_id"]
    dest = INDEX.parent / "conde-montecristo" / (video + ".png")
    if dest.exists() or dest.is_symlink():
        raise ValueError("El fichero de destino ya existe.")
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(raw)
    index = json.loads(INDEX.read_text(encoding="utf-8"))
    index["books"]["conde-montecristo"].setdefault("chapters", {})[video] = (
        f"./infografias/conde-montecristo/{video}.png"
    )
    INDEX.write_text(json.dumps(index, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    command(["git", "add", "biblioteca-montecristo/infografias"], cwd=ROOT)
    changed = set(command(["git", "diff", "--cached", "--name-only"], cwd=ROOT).splitlines())
    expected = {"biblioteca-montecristo/infografias/index.json",
                f"biblioteca-montecristo/infografias/conde-montecristo/{video}.png"}
    if changed != expected:
        raise ValueError("Diff no autorizado: " + repr(sorted(changed ^ expected)))
    command([
        "git", "-c", "user.name=IDEA LAB",
        "-c", "user.email=350414243+idealab2026@users.noreply.github.com",
        "commit", "--author", "IDEA LAB <350414243+idealab2026@users.noreply.github.com>",
        "-m", "Biblioteca: corregir ilustración y pies del capítulo 64 (#43)"
    ], cwd=ROOT)
    command(["git", "push", "-u", "origin", BRANCH], cwd=ROOT, timeout=180)
    description = (
        "PNG corregido #43 según el capítulo 64 de Dumas.\n"
        f"SHA-256 aprobado: {data['corrected_sha256']}\n"
        "Revisión: biblioteca-montecristo/REVISION_CORRECCION_43_2026-11-16.md\n"
        "Solo la imagen corregida y el índice. No incluye las alternativas inventadas.\n"
        "El audio de YouTube no ha sido cotejado íntegramente."
    )
    pr = command([
        "gh", "pr", "create", "-R", REPO, "--base", "main", "--head", BRANCH,
        "--title", "Biblioteca: publicar corrección visual #43, capítulo 64",
        "--body", description
    ], cwd=ROOT).strip()
    print("PR creada:", pr)
    if do_merge:
        command(["gh", "pr", "merge", pr, "-R", REPO, "--squash",
                 "--delete-branch"], cwd=ROOT, timeout=180)
        print("PR fusionada. Falta verificar Pages:", pr)


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--zip", type=Path, default=ZIP_DEFAULT)
    p.add_argument("--execute", action="store_true", help="Crear PR sin fusionarla")
    p.add_argument("--publish", action="store_true", help="Crear y fusionar PR")
    args = p.parse_args()
    data = validate_approval(json.loads(APPROVAL.read_text(encoding="utf-8")))
    raw = verify_zip(args.zip.expanduser(), data)
    verify_original(data)
    if is_published(data):
        print("Corrección #43 ya publicada con el hash exacto. Operación idempotente.")
        return
    print("#43: ZIP, PNG corregido, original y catálogo verificados.")
    if args.execute or args.publish:
        create_pr(data, raw, do_merge=args.publish)
    else:
        print("Solo lectura. Añadir --publish para crear y fusionar la PR.")


if __name__ == "__main__":
    main()
