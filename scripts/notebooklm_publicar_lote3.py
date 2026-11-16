#!/usr/bin/env python3
"""Publicar el lote 3 de PNG de la Biblioteca, con validación estricta SHA-256.

Uso (solo lectura):
  python3 scripts/notebooklm_publicar_lote3.py
Uso (crear PR, sin fusionar):
  python3 scripts/notebooklm_publicar_lote3.py --execute
Uso (crear PR y publicarla):
  python3 scripts/notebooklm_publicar_lote3.py --publish

No genera imágenes ni reintenta NotebookLM. Comprueba hashes y ficheros, crea
una única PR en GitHub y solo con --publish la fusiona automáticamente.
Los originales y las credenciales permanecen exclusivamente en el Mac.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import subprocess
from pathlib import Path

from notebooklm_bridge import (
    PENDING, ROOT, STATE_PATH, check_identity, command, load_json
)
from notebooklm_infografias import find_item, import_file, sanitized_png

APPROVED = ROOT / "biblioteca-montecristo" / "APROBADAS_PARA_PR_LOTE3_2026-11-16.json"
INDEX = ROOT / "biblioteca-montecristo" / "infografias" / "index.json"
REPO = "idealab2026/idealab2026.github.io"
BRANCH = "feat/biblioteca-lote3-78-79-81-83-84"
SHA = re.compile(r"^[0-9a-f]{64}$")
VID = re.compile(r"^[A-Za-z0-9_-]{11}$")


def inspect_approved():
    approved = json.loads(APPROVED.read_text(encoding="utf-8"))
    items = approved.get("items", [])
    if approved.get("version") != 1 or not (1 <= len(items) <= 5):
        raise ValueError("Manifiesto de aprobación sin formato o fuera del límite 1–5.")
    state = load_json(STATE_PATH, {})
    index = json.loads(INDEX.read_text(encoding="utf-8"))
    if index.get("version") != 1 or not isinstance(index.get("books"), dict):
        raise ValueError("Índice público no válido.")
    seen = set()
    pending = []
    for item in items:
        issue = item.get("issue")
        slug = item.get("book")
        vid = item.get("video_id")
        expected = item.get("sha256")
        if (
            not isinstance(issue, int) or issue <= 0 or issue in seen
            or slug != "conde-montecristo" or not isinstance(vid, str)
            or not VID.fullmatch(vid) or not isinstance(expected, str)
            or not SHA.fullmatch(expected)
        ):
            raise ValueError("Entrada de aprobación inválida o duplicada.")
        seen.add(issue)
        job = state.get(str(issue))
        if not job or job.get("phase") != "downloaded":
            raise ValueError(f"#{issue}: no consta descarga local elegible.")
        request = job.get("request") or {}
        if (
            request.get("book") != slug or request.get("video_id") != vid
            or request.get("volume") is not None
        ):
            raise ValueError(f"#{issue}: la fuente local no coincide con la aprobación.")
        path = Path(job.get("path") or "")
        expected_path = PENDING / f"issue-{issue}.png"
        if (
            path.is_symlink() or not path.is_file()
            or path.resolve() != expected_path.resolve()
            or path.resolve().parent != PENDING.resolve()
        ):
            raise ValueError(f"#{issue}: falta PNG original o su ruta no es segura.")
        raw = path.read_bytes()
        actual = hashlib.sha256(raw).hexdigest()
        if actual != expected:
            raise ValueError(f"#{issue}: SHA-256 distinto al original aprobado.")
        sanitized_png(raw)  # valida formato/estructura; no escribe aquí
        book, chapter = find_item(slug, vid)
        if chapter is None or book["slug"] != slug:
            raise ValueError(f"#{issue}: episodio ausente del catálogo.")
        public_row = index["books"].get(slug, {})
        if vid in public_row.get("chapters", {}):
            print(f"#{issue}: ya publicada; se excluye del nuevo lote.")
            continue
        pending.append((item, path))
        print(f"#{issue} · {item.get('chapter')} · SHA-256 correcto")
    return pending


def prepare_pr(pending, *, publish=False):
    # Operación explícita con cuenta GitHub de IDEA LAB; nunca depende de Codex.
    check_identity()
    if command(["git", "status", "--porcelain", "--untracked-files=all"], cwd=ROOT).strip():
        raise RuntimeError("El clon no está limpio. Guarda o aparta cambios antes de seguir.")
    command(["git", "fetch", "origin", "main"], cwd=ROOT, timeout=180)
    command(["git", "switch", "-c", BRANCH, "origin/main"], cwd=ROOT)
    current = json.loads(INDEX.read_text(encoding="utf-8"))
    for item, path in pending:
        if item["video_id"] in current.get("books", {}).get(item["book"], {}).get("chapters", {}):
            raise ValueError(f"#{item['issue']}: ya publicado en main tras fetch; cancelar.")
    for item, path in pending:
        import_file(item["book"], item["video_id"], path, True)
    command(["git", "add", "biblioteca-montecristo/infografias"], cwd=ROOT)
    changed = set(
        command(["git", "diff", "--cached", "--name-only"], cwd=ROOT).splitlines()
    )
    expected = {
        "biblioteca-montecristo/infografias/index.json",
        *(
            f"biblioteca-montecristo/infografias/{i['book']}/{i['video_id']}.png"
            for i, _ in pending
        ),
    }
    if changed != expected:
        raise RuntimeError(f"Cambios inesperados: {sorted(changed ^ expected)}. No se publican.")
    body = [
        "Lote autorizado de infografías de la Biblioteca IDEA LAB.",
        "PNG originales de NotebookLM, verificados con SHA-256 e importados sin metadatos auxiliares.",
        "",
        "Fuente literaria de contraste: edición francesa pública de Alexandre Dumas.",
        "Las revisiones no equivalen al cotejo íntegro de todos los vídeos de YouTube.",
        "",
    ]
    for item, _ in pending:
        body.extend([
            f"- #{item['issue']} · {item['chapter']}",
            f"  - SHA-256 original: " + item["sha256"],
            f"  - Texto: " + item["source"],
            f"  - Nota: " + item["note"],
        ])
    body.extend([
        "",
        "No incluye PDFs, cookies, identificadores de cuadernos ni fuentes privadas.",
        "La publicación definitiva requiere revisión y fusión de esta PR.",
    ])
    command([
        "git", "-c", "user.name=IDEA LAB",
        "-c", "user.email=350414243+idealab2026@users.noreply.github.com",
        "commit", "--author", "IDEA LAB <350414243+idealab2026@users.noreply.github.com>",
        "-m", "Biblioteca: publicar lote 3 revisado #78 #79 #81 #83 #84",
    ], cwd=ROOT)
    command(["git", "push", "-u", "origin", BRANCH], cwd=ROOT, timeout=180)
    pr = command([
        "gh", "pr", "create", "-R", REPO, "--base", "main",
        "--head", BRANCH, "--title",
        "Biblioteca: infografías revisadas lote 3 (#78 #79 #81 #83 #84)", "--body", "\n".join(body),
    ], cwd=ROOT)
    print("PR preparada (NO fusionada):", pr.strip())
    if publish:
        # Únicamente después de validar los hashes, el libro y el diff exacto.
        command(["gh", "pr", "merge", pr.strip(), "-R", REPO,
                 "--squash", "--delete-branch"], cwd=ROOT, timeout=180)
        print("PR fusionada; despliegue de Pages solicitado:", pr.strip())


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--execute", action="store_true", help="Crear rama y PR en GitHub.")
    parser.add_argument("--publish", action="store_true",
                        help="Crear y fusionar la PR con los PNG aprobados.")
    args = parser.parse_args()
    pending = inspect_approved()
    if not pending:
        print("No hay nuevas imágenes aprobadas pendientes; no se crea PR.")
        return
    print("Lote verificable:", len(pending), "infografías.")
    if not args.execute and not args.publish:
        print("Solo lectura. Para crear PR: --execute; para publicar: --publish.")
        return
    prepare_pr(pending, publish=args.publish)


if __name__ == "__main__":
    main()
