#!/usr/bin/env python3
"""Empaquetar únicamente PNG descargados todavía no recibidos para QA editorial.

Lee el estado local del puente y la tabla de revisión del repositorio. No inicia
NotebookLM, no altera el estado de trabajos y NO publica material en GitHub.
El ZIP es privado: adjuntarlo en ChatGPT únicamente cuando se desee revisarlo.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import struct
import zipfile
from pathlib import Path

from notebooklm_bridge import PENDING, ROOT, STATE_PATH, load_json

REVIEW = ROOT / "biblioteca-montecristo" / "REVISION_EDITORIAL.md"
PUBLIC_STATUSES = (
    "PENDIENTE DE CONTRASTE", "REVISAR ATRIBUCIÓN", "VERIFICAR DATOS",
    "AJUSTE OPCIONAL", "CORREGIR", "BLOQUEADA",
)
ISSUE_ROW = re.compile(
    r"^\| \[#(\d+)\]\([^)]+\) \| (" + "|".join(PUBLIC_STATUSES)
    + r") \|$"
)
PNG_MAGIC = bytes((137, 80, 78, 71, 13, 10, 26, 10))


def reviewed_issue_ids() -> set[int]:
    if not REVIEW.is_file():
        raise RuntimeError("No existe REVISION_EDITORIAL.md en el clon local.")
    reviewed = set()
    for line in REVIEW.read_text(encoding="utf-8").splitlines():
        match = ISSUE_ROW.fullmatch(line.strip())
        if match:
            reviewed.add(int(match.group(1)))
    if len(reviewed) < 69:
        raise RuntimeError(
            "Inventario editorial incompleto: no se excluyen archivos sin verificar."
        )
    return reviewed


def assert_local_png(path: Path) -> bytes:
    if path.is_symlink() or not path.is_file():
        raise ValueError("PNG ausente o acceso simbólico no permitido")
    if path.resolve().parent != PENDING.resolve():
        raise ValueError("PNG original fuera de la carpeta privada Pendientes")
    raw = path.read_bytes()
    if not raw.startswith(PNG_MAGIC) or len(raw) < 33:
        raise ValueError("Formato PNG inválido")
    if raw[12:16] != b"IHDR":
        raise ValueError("Cabecera IHDR de PNG no encontrada")
    width, height = struct.unpack(">II", raw[16:24])
    if not (256 <= width <= 10000 and 256 <= height <= 10000):
        raise ValueError("Dimensiones PNG fuera de rango")
    return raw


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--output", type=Path,
        default=Path.home() / "Desktop" / "IDEA_LAB_PNG_pendientes_QA.zip",
        help="Ruta del ZIP privado de revisión",
    )
    args = parser.parse_args()
    reviewed = reviewed_issue_ids()
    state = load_json(STATE_PATH, {})
    selected = []
    problems = []
    for key, job in state.items():
        try:
            issue = int(key)
        except (TypeError, ValueError):
            continue
        if issue in reviewed or job.get("phase") not in ("downloaded", "review-pr"):
            continue
        request = job.get("request") or {}
        if not request.get("book"):
            problems.append(f"#{issue}: sin libro de origen")
            continue
        path = Path(job.get("path") or "")
        try:
            raw = assert_local_png(path)
        except (ValueError, OSError) as exc:
            problems.append(f"#{issue}: {exc}")
            continue
        selected.append((issue, raw, {
            "issue": issue,
            "book": request["book"],
            "video_id": request.get("video_id"),
            "volume": request.get("volume"),
            "sha256": hashlib.sha256(raw).hexdigest(),
            "name": f"issue-{issue}.png",
        }))
    selected.sort(key=lambda item: item[0])
    if problems:
        for problem in problems:
            print("ERROR:", problem)
        print("No se ha generado un ZIP parcial.")
        return 1
    if not selected:
        print("No hay nuevos PNG descargados pendientes de entregar a QA.")
        return 0
    args.output.parent.mkdir(parents=True, exist_ok=True)
    if args.output.is_symlink():
        raise RuntimeError("El ZIP de destino no puede ser un enlace simbólico.")
    tmp = args.output.with_suffix(".tmp")
    try:
        with zipfile.ZipFile(tmp, "w", compression=zipfile.ZIP_DEFLATED) as archive:
            manifest = []
            for issue, raw, entry in selected:
                archive.writestr(f"issue-{issue}.png", raw)
                manifest.append(entry)
            archive.writestr(
                "MANIFIESTO_QA.json",
                json.dumps({"version": 1, "count": len(manifest), "issues": manifest},
                           ensure_ascii=False, indent=2) + "\n",
            )
        tmp.replace(args.output)
    finally:
        tmp.unlink(missing_ok=True)
    print(f"PNG pendientes para revisión: {len(selected)}")
    print("Incidencias:", ", ".join("#" + str(x[0]) for x in selected))
    print("ZIP privado:", args.output)
    print("No se ha publicado nada ni modificado ningún estado local.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
