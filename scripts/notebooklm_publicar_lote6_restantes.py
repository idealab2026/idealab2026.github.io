#!/usr/bin/env python3
"""Publica solo las 5 correcciones restantes del lote 6, con SHA-256 anclados.

    python3 scripts/notebooklm_publicar_lote6_restantes.py
    python3 scripts/notebooklm_publicar_lote6_restantes.py --execute
    python3 scripts/notebooklm_publicar_lote6_restantes.py --publish

Usar en el Mac del titular con ZIP privado en ~/Downloads.
Solo verifica/importa PNG; NO regenera imágenes, no consulta NotebookLM.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import struct
import zipfile
from pathlib import Path

from notebooklm_bridge import ROOT, check_identity, command
from notebooklm_infografias import sanitized_png

APPROVAL = ROOT / "biblioteca-montecristo/APROBADAS_RESTANTES_LOTE6_2026-11-17.json"
CANDIDATES = ROOT / "biblioteca-montecristo/CANDIDATAS_LOTE6_2026-11-16.json"
INDEX = ROOT / "biblioteca-montecristo/infografias/index.json"
DEFAULT_ZIP = Path.home() / "Downloads/BBTK_MONT_LOTE6_5_CORRECCIONES_REVISADAS.zip"
REPO = "idealab2026/idealab2026.github.io"
BRANCH = "feat/biblioteca-publicar-restantes-lote6-45-47-48-49-68"
PNG_SIG = b"\x89PNG\r\n\x1a\n"
ALLOWED = (45, 47, 48, 49, 68)
PINNED = {
    45: ("RrTdEQ6JNtk", "295b9d40d225f374cc0f263d8f86f6561171d3b694544ea814dd5bf81e698514"),
    47: ("XZId_LpNUeQ", "25803f22e5605f213715bf4f37af69f44ee4ee6e83492f5d68672be3a202c9f5"),
    48: ("KIdDQOOeKyE", "d86dbc8db8c00b31406c5d88c9a543fa4ffa9c56adbb286a5345045b50238041"),
    49: ("RygLw4NCQi0", "a554b07d821bde071dc8dc6e290cbde23471dacd0e388539ce401bb4f34e26ca"),
    68: ("EeJqT5KlvPA", "82416c3db73a562195f716f2634dd0bb57e5322f48fb58bd36da7e25c746203e"),
}
MAX_PNG = 22_000_000


def digest(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()


def validate_approval(data: dict, candidates: dict) -> list[dict]:
    if (data.get("version") != 1 or data.get("status") != "APROBADO_PARA_PUBLICACION_TRAS_CONTRASTE_NOVELA"
            or data.get("approved_issues") != list(ALLOWED)
            or data.get("blocked_issues") != []
            or data.get("source_zip_name") != DEFAULT_ZIP.name):
        raise ValueError("Manifiesto de aprobación no reconocido.")
    rows = data.get("items")
    if not isinstance(rows, list) or [x.get("issue") for x in rows] != list(ALLOWED):
        raise ValueError("Solo 5 infografías exactas están autorizadas.")
    historical = {x["issue"]: x for x in candidates.get("originals", [])}
    for row in rows:
        issue = row["issue"]
        video, sha = PINNED[issue]
        original = historical.get(issue)
        if (not original or not row.get("approved_for_publication")
                or row.get("book") != "conde-montecristo"
                or row.get("video_id") != video or row.get("corrected_sha256") != sha
                or row.get("chapter") != original.get("chapter")
                or row.get("source_original_sha256") != original.get("sha256")
                or row.get("source_url") != original.get("source_url")
                or row.get("file") != f"issue-{issue}-corregida.png"
                or not isinstance(row.get("source_export_sha256"), str)
                or len(row["source_export_sha256"]) != 64
                or not all(c in "0123456789abcdef" for c in row["source_export_sha256"])):
            raise ValueError(f"#{issue}: autorización/linaje original incorrectos.")
    return rows


def verify_zip(path: Path, rows: list[dict]) -> dict[int, bytes]:
    if path.is_symlink() or not path.is_file() or path.stat().st_size > 85_000_000:
        raise ValueError("ZIP privado ausente, enlace simbólico o tamaño excesivo.")
    expected = {x["file"] for x in rows} | {"manifest.json", "LEEME.md"}
    accepted = {}
    with zipfile.ZipFile(path) as z:
        entries = z.infolist()
        if len(entries) != len(expected) or {x.filename for x in entries} != expected:
            raise ValueError("ZIP incompleto, duplicado o con archivos ajenos.")
        if any(x.is_dir() or x.file_size > MAX_PNG for x in entries):
            raise ValueError("ZIP contiene directorios o entradas demasiado grandes.")
        if z.testzip() is not None:
            raise ValueError("ZIP corrupto.")
        inside = json.loads(z.read("manifest.json"))
        if (inside.get("version") != 1 or
            inside.get("status") != "APROBADO_PARA_PUBLICACION_TRAS_CONTRASTE_NOVELA" or
            inside.get("publication_authorized_issues") != list(ALLOWED)):
            raise ValueError("Manifest privado de revisión no reconocido.")
        ziprows = {x["issue"]: x for x in inside.get("items", [])}
        if len(ziprows) != len(ALLOWED):
            raise ValueError("Manifest privado incompleto o repetido.")
        for item in rows:
            issue = item["issue"]
            internal = ziprows.get(issue, {})
            for key in ("video_id", "source_original_sha256", "source_export_sha256", "corrected_sha256"):
                if internal.get(key) != item.get(key):
                    raise ValueError(f"#{issue}: hash o vídeo del ZIP no autorizado ({key}).")
            raw = z.read(item["file"])
            if (not raw.startswith(PNG_SIG) or len(raw) < 100_000
                    or digest(raw) != PINNED[issue][1]
                    or struct.unpack(">II", raw[16:24]) != (2752, 1536)
                    or sanitized_png(raw) != raw):
                raise ValueError(f"#{issue}: PNG no íntegro, metadatos inesperados o SHA incorrecto.")
            accepted[issue] = raw
    return accepted


def pending_files(rows: list[dict]) -> list[dict]:
    data = json.loads(INDEX.read_text(encoding="utf-8"))
    if data.get("version") != 1:
        raise ValueError("Manifest público inválido.")
    chapters = data.get("books", {}).get("conde-montecristo", {}).get("chapters", {})
    pending = []
    for row in rows:
        video = row["video_id"]
        expected = f"./infografias/conde-montecristo/{video}.png"
        if video not in chapters:
            pending.append(row)
            continue
        file = INDEX.parent / "conde-montecristo" / f"{video}.png"
        if (chapters[video] != expected or not file.is_file()
                or digest(file.read_bytes()) != row["corrected_sha256"]):
            raise RuntimeError(f'#{row["issue"]}: ya existe una versión pública DISTINTA. No sobrescribir.')
        print(f'#{row["issue"]}: ya publicada con el SHA aprobado.')
    return pending


def publish(rows: list[dict], images: dict[int, bytes], merge: bool) -> None:
    check_identity()
    if command(["git", "status", "--porcelain", "--untracked-files=all"], cwd=ROOT).strip():
        raise RuntimeError("El árbol local Git tiene cambios; no publicar.")
    command(["git", "fetch", "origin", "main"], cwd=ROOT, timeout=180)
    command(["git", "switch", "-c", BRANCH, "origin/main"], cwd=ROOT)
    # Protect against a concurrent publication since the initial check.
    latest = pending_files(rows)
    if {x["issue"] for x in latest} != {x["issue"] for x in rows}:
        raise RuntimeError("Se ha publicado otro archivo durante la revisión. Cancelado.")
    index = json.loads(INDEX.read_text(encoding="utf-8"))
    book = index["books"]["conde-montecristo"].setdefault("chapters", {})
    for item in rows:
        vid, issue = item["video_id"], item["issue"]
        dest = INDEX.parent / "conde-montecristo" / f"{vid}.png"
        if dest.exists() or dest.is_symlink():
            raise RuntimeError(f"#{issue}: destino ya existe; no sobrescribir.")
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(images[issue])
        book[vid] = f"./infografias/conde-montecristo/{vid}.png"
    INDEX.write_text(json.dumps(index, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    command(["git", "add", "biblioteca-montecristo/infografias"], cwd=ROOT)
    changed = set(command(["git", "diff", "--cached", "--name-only"], cwd=ROOT).splitlines())
    permitted = {"biblioteca-montecristo/infografias/index.json"} | {
        f'biblioteca-montecristo/infografias/conde-montecristo/{x["video_id"]}.png'
        for x in rows
    }
    if changed != permitted:
        raise RuntimeError("Cambios fuera de la selección autorizada: " + repr(sorted(changed ^ permitted)))
    command([
        "git", "-c", "user.name=IDEA LAB",
        "-c", "user.email=350414243+idealab2026@users.noreply.github.com",
        "commit", "--author", "IDEA LAB <350414243+idealab2026@users.noreply.github.com>",
        "-m", "Biblioteca: publicar 5 infografías corregidas restantes lote 6"
    ], cwd=ROOT)
    command(["git", "push", "-u", "origin", BRANCH], cwd=ROOT, timeout=180)
    description = "\n".join([
        "Lote 6: publicación exclusivamente de las cinco versiones corregidas #45 #47 #48 #49 #68.",
        "Revisión editorial: biblioteca-montecristo/REVISION_RESTANTES_LOTE6_2026-11-17.md",
        "Se cotejó la novela de Dumas, no el audio completo de los vídeos.",
        "No publicar originales rechazados ni versiones con SHA diferente del aprobado.",
        "",
        *[f'#{x["issue"]} · capítulo {x["chapter"]} · SHA corregido: {x["corrected_sha256"]}'
          for x in rows]
    ])
    pr = command([
        "gh", "pr", "create", "-R", REPO, "--base", "main", "--head", BRANCH,
        "--title", "Biblioteca: publicar cinco infografías corregidas restantes lote 6",
        "--body", description
    ], cwd=ROOT).strip()
    print("PR creada:", pr)
    if merge:
        command(["gh", "pr", "merge", pr, "-R", REPO, "--squash", "--delete-branch"],
                cwd=ROOT, timeout=180)
        print("PR fusionada; falta verificar el despliegue de Pages:", pr)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--zip", type=Path, default=DEFAULT_ZIP)
    parser.add_argument("--execute", action="store_true", help="Crear PR sin fusionar.")
    parser.add_argument("--publish", action="store_true", help="Crear y fusionar PR.")
    args = parser.parse_args()
    source = json.loads(APPROVAL.read_text(encoding="utf-8"))
    candidates = json.loads(CANDIDATES.read_text(encoding="utf-8"))
    rows = validate_approval(source, candidates)
    images = verify_zip(args.zip.expanduser(), rows)
    remaining = pending_files(rows)
    print("Originales corregidos con SHA correcto:", len(rows))
    print("Pendientes de publicar:", len(remaining))
    if not remaining:
        print("Las cinco infografías ya constan publicadas. No hay nada que hacer.")
        return
    if args.execute or args.publish:
        publish(remaining, images, merge=args.publish)
    else:
        print("Solo lectura. Para publicar las versiones aprobadas, añadir --publish.")


if __name__ == "__main__":
    main()
