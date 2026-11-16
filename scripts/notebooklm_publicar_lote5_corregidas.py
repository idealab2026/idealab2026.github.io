#!/usr/bin/env python3
"""Publicar únicamente cuatro infografías corregidas del lote 5.

Desde el Mac autenticado, con el ZIP corregido en ~/Downloads:
    python3 scripts/notebooklm_publicar_lote5_corregidas.py
    python3 scripts/notebooklm_publicar_lote5_corregidas.py --execute
    python3 scripts/notebooklm_publicar_lote5_corregidas.py --publish

Sin flags: solo comprobación. --execute: prepara PR sin fusionarla.
--publish: prepara PR, la fusiona y solicita Pages.
No es una herramienta de edición; solo acepta cuatro SHA aprobados.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import struct
import zipfile
from pathlib import Path

from notebooklm_bridge import PENDING, ROOT, STATE_PATH, check_identity, command, load_json
from notebooklm_infografias import find_item, sanitized_png

APPROVAL = ROOT / "biblioteca-montecristo/APROBADAS_CORREGIDAS_LOTE5_2026-11-16.json"
CATALOG = ROOT / "biblioteca-montecristo/catalogo.json"
INDEX = ROOT / "biblioteca-montecristo/infografias/index.json"
REPO = "idealab2026/idealab2026.github.io"
BRANCH = "feat/biblioteca-corregidas-lote5-44-50-87-92"
DEFAULT_ZIP = Path.home() / "Downloads/BBTK_MONT_LOTE5_4_CORRECCIONES_PARA_REVISION.zip"
ALLOWED = (44, 50, 87, 92)
SHA = re.compile(r"[a-f0-9]{64}\Z")
VIDEO = re.compile(r"[A-Za-z0-9_-]{11}\Z")
PNG_SIG = b"\x89PNG\r\n\x1a\n"


def digest(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def validate_manifest(data: dict) -> list[dict]:
    if (data.get("version") != 1 or data.get("status") != "APROBADO_PARA_PUBLICACION_CORREGIDA"
            or data.get("approved_issues") != list(ALLOWED) or data.get("blocked_issues") != [43]
            or data.get("source_zip_name") != DEFAULT_ZIP.name):
        raise ValueError("Aprobaciones de los originales corregidos no reconocidas.")
    rows = data.get("items")
    if not isinstance(rows, list) or len(rows) != 4 or [r.get("issue") for r in rows] != list(ALLOWED):
        raise ValueError("Solo las cuatro correcciones editoriales están aprobadas.")
    seen = set()
    for row in rows:
        issue, video = row["issue"], row.get("video_id")
        if (row.get("book") != "conde-montecristo" or not row.get("approved_for_publication")
                or not isinstance(video, str) or not VIDEO.fullmatch(video) or video in seen
                or row.get("file") != f"issue-{issue}-corregida.png"
                or row.get("source") != f"https://fr.wikisource.org/wiki/Le_Comte_de_Monte-Cristo/Chapitre_{row.get('chapter')}"
                or not all(isinstance(row.get(k), str) and SHA.fullmatch(row[k]) for k in
                           ("corrected_sha256", "source_export_sha256", "source_original_sha256"))
                or row["corrected_sha256"] == row["source_export_sha256"]):
            raise ValueError(f'#{issue}: approval incorrect or duplicate video.')
        seen.add(video)
    return rows


def read_approved_zip(path: Path, rows: list[dict]) -> dict[int, bytes]:
    if path.is_symlink() or not path.is_file():
        raise ValueError("ZIP corregido no disponible o enlace simbólico.")
    if path.stat().st_size > 130_000_000:
        raise ValueError("ZIP demasiado grande para el lote autorizado.")
    expected = {r["file"] for r in rows} | {"manifest.json", "LEEME.md"}
    out = {}
    with zipfile.ZipFile(path) as archive:
        files = archive.infolist()
        if len(files) != len(expected) or {i.filename for i in files} != expected:
            raise ValueError("ZIP con archivos inesperados o repetidos.")
        if archive.testzip() is not None:
            raise ValueError("ZIP corrupto.")
        metadata = json.loads(archive.read("manifest.json"))
        if (metadata.get("version") != 1 or len(metadata.get("items", [])) != 4
                or {r.get("issue") for r in metadata["items"]} != set(ALLOWED)):
            raise ValueError("Manifiesto del ZIP inesperado.")
        zip_rows = {r["issue"]: r for r in metadata["items"]}
        for row in rows:
            info = archive.getinfo(row["file"])
            if info.file_size > 22_000_000 or info.file_size < 100_000:
                raise ValueError(f'#{row["issue"]}: tamaño inesperado.')
            if (zip_rows[row["issue"]].get("sha256") != row["corrected_sha256"]
                    or zip_rows[row["issue"]].get("source_export_sha256") != row["source_export_sha256"]):
                raise ValueError(f'#{row["issue"]}: manifest SHA mismatch.')
            raw = archive.read(row["file"])
            if digest(raw) != row["corrected_sha256"] or not raw.startswith(PNG_SIG):
                raise ValueError(f'#{row["issue"]}: PNG corregido no coincide con SHA.')
            if len(raw) < 24 or struct.unpack(">II", raw[16:24]) != (2752, 1536):
                raise ValueError(f'#{row["issue"]}: resolución no admitida.')
            if sanitized_png(raw) != raw:
                raise ValueError(f'#{row["issue"]}: PNG contiene datos auxiliares o no es válido.')
            out[row["issue"]] = raw
    return out


def verify_sources(rows: list[dict]) -> None:
    state = load_json(STATE_PATH, {})
    for row in rows:
        issue = row["issue"]
        src = PENDING / f"issue-{issue}.png"
        job = state.get(str(issue)) or {}
        request = job.get("request") or {}
        if (not src.is_file() or src.is_symlink() or src.resolve().parent != PENDING.resolve()
                or job.get("phase") != "downloaded" or Path(job.get("path") or "/") != src
                or request.get("book") != row["book"]
                or request.get("video_id") != row["video_id"]
                or request.get("volume") is not None):
            raise ValueError(f'#{issue}: no hay original local autenticado.')
        original = src.read_bytes()
        if (digest(original) != row["source_original_sha256"]
                or digest(sanitized_png(original)) != row["source_export_sha256"]):
            raise ValueError(f'#{issue}: procedencia original o saneada no coincide.')
        book, chapter = find_item(row["book"], row["video_id"])
        if chapter is None or book["slug"] != row["book"]:
            raise ValueError(f'#{issue}: capítulo no pertenece al catálogo.')


def pending(rows: list[dict], images: dict[int, bytes]) -> list[dict]:
    index = json.loads(INDEX.read_text(encoding="utf-8"))
    if index.get("version") != 1:
        raise ValueError("Índice público no válido.")
    result = []
    for row in rows:
        issue, video = row["issue"], row["video_id"]
        path = f'./infografias/conde-montecristo/{video}.png'
        public = index["books"]["conde-montecristo"].get("chapters", {})
        if video in public:
            deployed = ROOT / "biblioteca-montecristo" / path.removeprefix("./")
            if public[video] != path or not deployed.is_file() or digest(deployed.read_bytes()) != row["corrected_sha256"]:
                raise RuntimeError(f'#{issue}: versión pública distinta; revisión manual obligatoria.')
            print(f'#{issue}: versión corregida ya integrada, no duplicar.')
        else:
            result.append(row)
            print(f'#{issue}: versión corregida y procedencia verificadas; pendiente de publicación.')
    return result


def publish(rows: list[dict], images: dict[int, bytes], publish_now: bool) -> None:
    check_identity()
    if command(["git", "status", "--porcelain", "--untracked-files=all"], cwd=ROOT).strip():
        raise RuntimeError("Git tiene cambios locales; no crear PR.")
    command(["git", "fetch", "origin", "main"], cwd=ROOT, timeout=180)
    command(["git", "switch", "-c", BRANCH, "origin/main"], cwd=ROOT)
    current = json.loads(INDEX.read_text(encoding="utf-8"))
    for row in rows:
        if row["video_id"] in current["books"]["conde-montecristo"].get("chapters", {}):
            raise RuntimeError(f'#{row["issue"]}: publicación concurrente; cancelar.')
    published = current["books"]["conde-montecristo"].setdefault("chapters", {})
    for row in rows:
        path = ROOT / "biblioteca-montecristo/infografias/conde-montecristo" / (row["video_id"] + ".png")
        if path.exists() or path.is_symlink():
            raise RuntimeError(f'#{row["issue"]}: el destino ya existe en el repositorio.')
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(images[row["issue"]])
        published[row["video_id"]] = f'./infografias/conde-montecristo/{row["video_id"]}.png'
    INDEX.write_text(json.dumps(current,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    command(["git","add","biblioteca-montecristo/infografias"],cwd=ROOT)
    changed=set(command(["git","diff","--cached","--name-only"],cwd=ROOT).splitlines())
    expected={"biblioteca-montecristo/infografias/index.json"} | {
        "biblioteca-montecristo/infografias/conde-montecristo/"+row["video_id"]+".png"
        for row in rows
    }
    if changed != expected:
        raise RuntimeError("Diff del lote no permitido: "+repr(sorted(changed ^ expected)))
    command(["git","-c","user.name=IDEA LAB",
        "-c","user.email=350414243+idealab2026@users.noreply.github.com","commit",
        "--author","IDEA LAB <350414243+idealab2026@users.noreply.github.com>",
        "-m","Biblioteca: publicar cuatro infografías corregidas lote 5"],cwd=ROOT)
    command(["git","push","-u","origin",BRANCH],cwd=ROOT,timeout=180)
    body="\n".join([
       "Cuatro PNG corregidos tras revisión editorial del lote 5:",
       "biblioteca-montecristo/REVISION_CORRECCIONES_LOTE5_2026-11-16.md",
       "Solo versiones con SHA-256 aprobado; original #43 expresamente excluido.",
       "Audio completo del canal no contrastado.", "",
       *[f'#{row["issue"]} · cap. {row["chapter"]} · {row["corrected_sha256"]}'
         for row in rows],
    ])
    pr=command(["gh","pr","create","-R",REPO,"--base","main","--head",BRANCH,
                "--title","Biblioteca: publicar cuatro infografías corregidas lote 5",
                "--body",body],cwd=ROOT).strip()
    print("PR creada:",pr)
    if publish_now:
        command(["gh","pr","merge",pr,"-R",REPO,"--squash","--delete-branch"],cwd=ROOT,timeout=180)
        print("PR fusionada; verificar el despliegue de Pages:",pr)


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--zip",type=Path,default=DEFAULT_ZIP)
    parser.add_argument("--execute",action="store_true",help="Crear PR sin fusionar")
    parser.add_argument("--publish",action="store_true",help="Crear PR y fusionarla")
    args=parser.parse_args()
    rows=validate_manifest(json.loads(APPROVAL.read_text(encoding="utf-8")))
    images=read_approved_zip(args.zip.expanduser(), rows)
    verify_sources(rows)
    queue=pending(rows,images)
    print("Correcciones autorizadas aún pendientes:",len(queue))
    if not queue:
        return
    if args.execute or args.publish:
        publish(queue,images,args.publish)
    else:
        print("Solo lectura: añada --execute o --publish para subir cuatro PNG.")


if __name__=="__main__":
    main()
