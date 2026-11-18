#!/usr/bin/env python3
"""Lote 7: importar exclusivamente los dos PNG aprobados sin modificaciones.

Preflight (solo lectura):
    python3 scripts/notebooklm_publicar_lote7_aprobadas.py
Publicar (requiere Git y gh autenticados):
    python3 scripts/notebooklm_publicar_lote7_aprobadas.py --publish

El ZIP completo del lote 7 debe permanecer en ~/Downloads sin descomprimir.
No publica los otros seis originales ni consulta NotebookLM ni Codex.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import struct
import zipfile
from pathlib import Path

from notebooklm_bridge import ROOT, check_identity, command
from notebooklm_infografias import sanitized_png

APPROVAL = ROOT / "biblioteca-montecristo/APROBADAS_LOTE7_2026-11-18.json"
CANDIDATES = ROOT / "biblioteca-montecristo/CANDIDATAS_LOTE7_2026-11-17.json"
INDEX = ROOT / "biblioteca-montecristo/infografias/index.json"
SOURCE_ZIP = Path.home() / "Downloads/IDEA_LAB_LOTE7_REVISION_8PNG.zip"
REPO = "idealab2026/idealab2026.github.io"
BRANCH = "feat/biblioteca-publicar-lote7-39-51"
ALLOWED = (39, 51)
ZIP_ISSUES = (27, 32, 33, 35, 36, 37, 39, 51)
PINNED = {
    39: ("hGf4PtrijvE",
         "7d88219fb271fe4413c5ee223e56586d98f4b86d3584df82ee8fc0e7ce9acce1",
         "b166717851f93bb7a7f58686e8dc90f95831d935c48e29ec5c6b22d56245fd41"),
    51: ("BSoTWtrNVPc",
         "486110e3af30e3212d827ef2b2a07b3aeb01238617226fda504fdd95e4b98232",
         "9efda03c273670cd5885ee237f9d6aaa054012b87e272370b634a62480330bba"),
}
PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"
MAX_PNG = 22_000_000


def digest(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()


def verify_approval(approval: dict, candidates: dict) -> list[dict]:
    if (approval.get("version") != 1 or
            approval.get("status") != "APROBADO_PARA_PUBLICACION_TRAS_CONTRASTE_NOVELA" or
            approval.get("source_zip_name") != SOURCE_ZIP.name or
            approval.get("approved_issues") != list(ALLOWED) or
            approval.get("blocked_issues") != [27, 32, 33, 35, 36, 37]):
        raise ValueError("El dictamen de aprobación fue alterado.")
    all_candidates = candidates.get("originals", [])
    if [x.get("issue") for x in all_candidates] != list(ZIP_ISSUES):
        raise ValueError("El catálogo histórico del lote 7 no coincide.")
    historical = {x["issue"]: x for x in all_candidates}
    rows = approval.get("items")
    if not isinstance(rows, list) or [x.get("issue") for x in rows] != list(ALLOWED):
        raise ValueError("Solo se autorizaron dos imágenes exactas.")
    for row in rows:
        issue = row["issue"]
        video, original_sha, export_sha = PINNED[issue]
        old = historical[issue]
        if (row.get("book") != "conde-montecristo" or
                row.get("editorial_approved") is not True or
                row.get("chapter") != old.get("chapter") or
                row.get("video_id") != old.get("video_id") or
                row.get("video_id") != video or
                row.get("original_sha256") != original_sha or
                row.get("export_sha256") != export_sha or
                row.get("file") != f"issue-{issue}.png" or
                row.get("source_url") != old.get("source_url")):
            raise ValueError(f"#{issue}: identidad o SHA aprobado inválido.")
    return rows


def read_review_zip(source: Path, approved_rows: list[dict]) -> dict[int, bytes]:
    source = source.expanduser()
    if source.is_symlink() or not source.is_file() or source.stat().st_size > 100_000_000:
        raise ValueError("No está disponible el ZIP original del lote 7 en Descargas.")
    allowed_files = {f"issue-{i}.png" for i in ZIP_ISSUES} | {"manifest.json"}
    result = {}
    with zipfile.ZipFile(source) as archive:
        infos = archive.infolist()
        if len(infos) != len(allowed_files) or {x.filename for x in infos} != allowed_files:
            raise ValueError("El ZIP contiene originales faltantes, ajenos o duplicados.")
        if any(x.is_dir() or x.file_size > MAX_PNG for x in infos):
            raise ValueError("El ZIP contiene archivos no admitidos.")
        if archive.testzip() is not None:
            raise ValueError("El ZIP de revisión está corrupto.")
        meta = json.loads(archive.read("manifest.json"))
        if (meta.get("version") != 1 or
                meta.get("status") != "PENDIENTE_DE_REVISION_EDITORIAL" or
                meta.get("publication_authorized") is not False or
                [x.get("issue") for x in meta.get("items", [])] != list(ZIP_ISSUES)):
            raise ValueError("Manifiesto de revisión privada incompatible.")
        ziprows = {x["issue"]: x for x in meta["items"]}
        for row in approved_rows:
            issue = row["issue"]
            entry = ziprows[issue]
            if (entry.get("file") != row["file"] or
                    entry.get("video_id") != row["video_id"] or
                    entry.get("chapter") != row["chapter"] or
                    entry.get("book") != row["book"] or
                    entry.get("editorial_approved") is not False or
                    entry.get("original_sha256") != row["original_sha256"] or
                    entry.get("export_sha256") != row["export_sha256"]):
                raise ValueError(f"#{issue}: el ZIP no coincide con el ejemplar revisado.")
            raw = archive.read(row["file"])
            if (len(raw) < 100_000 or not raw.startswith(PNG_SIGNATURE) or
                    struct.unpack(">II", raw[16:24]) != (2752, 1536) or
                    digest(raw) != PINNED[issue][2] or sanitized_png(raw) != raw):
                raise ValueError(f"#{issue}: PNG inválido o SHA-256 distinto del aprobado.")
            result[issue] = raw
            print(f'#{issue} · capítulo {row["chapter"]} · SHA-256 aprobado y PNG verificados')
    return result


def remaining(rows: list[dict]) -> list[dict]:
    index = json.loads(INDEX.read_text(encoding="utf-8"))
    if index.get("version") != 1:
        raise ValueError("Índice de imágenes no reconocido.")
    public = index["books"]["conde-montecristo"].get("chapters", {})
    todo = []
    for row in rows:
        issue, video = row["issue"], row["video_id"]
        path = f"./infografias/conde-montecristo/{video}.png"
        dest = INDEX.parent / "conde-montecristo" / f"{video}.png"
        if video not in public:
            if dest.exists() or dest.is_symlink():
                raise ValueError(f"#{issue}: destino ocupado sin entrada del índice.")
            todo.append(row)
            continue
        if public[video] != path or not dest.is_file() or digest(dest.read_bytes()) != PINNED[issue][2]:
            raise ValueError(f"#{issue}: ya hay una imagen pública distinta; no sobreescribir.")
        print(f"#{issue}: ya publicado con la versión exacta.")
    return todo


def create_pr(rows: list[dict], images: dict[int, bytes], merge: bool) -> None:
    check_identity()
    if command(["git", "status", "--porcelain", "--untracked-files=all"], cwd=ROOT).strip():
        raise RuntimeError("El repositorio contiene cambios locales; abortado.")
    command(["git", "fetch", "origin", "main"], cwd=ROOT, timeout=180)
    command(["git", "switch", "-c", BRANCH, "origin/main"], cwd=ROOT)
    latest = remaining(rows)
    if {r["issue"] for r in latest} != {r["issue"] for r in rows}:
        raise RuntimeError("Publicación concurrente detectada; abortado.")
    index = json.loads(INDEX.read_text(encoding="utf-8"))
    entries = index["books"]["conde-montecristo"].setdefault("chapters", {})
    for row in rows:
        issue, video = row["issue"], row["video_id"]
        dest = INDEX.parent / "conde-montecristo" / f"{video}.png"
        if dest.exists() or dest.is_symlink():
            raise ValueError(f"#{issue}: destino ocupado.")
        dest.write_bytes(images[issue])
        entries[video] = f"./infografias/conde-montecristo/{video}.png"
    INDEX.write_text(json.dumps(index, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    command(["git", "add", "biblioteca-montecristo/infografias"], cwd=ROOT)
    paths = set(command(["git", "diff", "--cached", "--name-only"], cwd=ROOT).splitlines())
    expected = {"biblioteca-montecristo/infografias/index.json"} | {
        f'biblioteca-montecristo/infografias/conde-montecristo/{r["video_id"]}.png'
        for r in rows
    }
    if paths != expected:
        raise ValueError("Diff fuera del lote autorizado: " + repr(sorted(paths ^ expected)))
    command([
        "git", "-c", "user.name=IDEA LAB",
        "-c", "user.email=350414243+idealab2026@users.noreply.github.com",
        "commit", "--author", "IDEA LAB <350414243+idealab2026@users.noreply.github.com>",
        "-m", "Biblioteca: publicar dos infografías verificadas lote 7 (#39 y #51)"
    ], cwd=ROOT)
    command(["git", "push", "-u", "origin", BRANCH], cwd=ROOT, timeout=180)
    description = "\n".join([
        "Dos imágenes originales del lote 7 aprobadas tras inspección visual y cotejo con Dumas.",
        "Informe: biblioteca-montecristo/CONTRASTE_EDITORIAL_LOTE7_2026-11-18.md",
        "Seis originales no aprobados: #27, #32, #33, #35, #36, #37.",
        "El audio completo de YouTube no está contrastado.",
        "",
        *[f'#{r["issue"]}: SHA-256 exportación {r["export_sha256"]}' for r in rows],
    ])
    pr = command([
        "gh", "pr", "create", "-R", REPO, "--base", "main", "--head", BRANCH,
        "--title", "Biblioteca: publicar dos láminas verificadas del lote 7",
        "--body", description
    ], cwd=ROOT).strip()
    print("PR creada:", pr)
    if merge:
        command(["gh", "pr", "merge", pr, "-R", REPO, "--squash", "--delete-branch"],
                cwd=ROOT, timeout=180)
        print("PR fusionada; verificar GitHub Pages:", pr)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--zip", type=Path, default=SOURCE_ZIP)
    parser.add_argument("--execute", action="store_true", help="Preparar PR sin fusionar.")
    parser.add_argument("--publish", action="store_true", help="Preparar y fusionar PR.")
    args = parser.parse_args()
    rows = verify_approval(
        json.loads(APPROVAL.read_text(encoding="utf-8")),
        json.loads(CANDIDATES.read_text(encoding="utf-8")),
    )
    images = read_review_zip(args.zip, rows)
    todo = remaining(rows)
    print("Aprobadas por SHA:", len(rows), "| Aún pendientes:", len(todo))
    if not todo:
        print("No hay imágenes nuevas: operación idempotente.")
    elif args.execute or args.publish:
        create_pr(todo, images, merge=args.publish)
    else:
        print("Solo lectura. Añadir --publish para fusionar la PR de dos PNG.")


if __name__ == "__main__":
    main()
