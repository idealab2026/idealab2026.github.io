#!/usr/bin/env python3
"""Publicador estricto de las 3 infografías editoriales aprobadas del lote 5.

Solo lectura:
  python3 scripts/notebooklm_publicar_lote5.py
Crear PR, sin fusionar:
  python3 scripts/notebooklm_publicar_lote5.py --execute
Crear PR, fusionar y solicitar Pages:
  python3 scripts/notebooklm_publicar_lote5.py --publish

Exige el SHA del PNG original, SHA del PNG saneado, catálogo,
estado local de descarga, árbol de trabajo limpio y diff exacto.
No publica ni reutiliza los cinco originales con errores editoriales.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
from pathlib import Path

from notebooklm_bridge import PENDING, ROOT, STATE_PATH, check_identity, command, load_json
from notebooklm_infografias import find_item, import_file, sanitized_png

APPROVED = ROOT / "biblioteca-montecristo/APROBADAS_PARA_PR_LOTE5_2026-11-16.json"
INDEX = ROOT / "biblioteca-montecristo/infografias/index.json"
REPO = "idealab2026/idealab2026.github.io"
BRANCH = "feat/biblioteca-lote5-publicacion-46-89-90"
ALLOWED = {46, 89, 90}
SHA = re.compile(r"[0-9a-f]{64}\Z")
VIDEO = re.compile(r"[A-Za-z0-9_-]{11}\Z")


def validate_manifest(data):
    if (data.get("version") != 1 or data.get("status") != "APROBADO_PARA_PUBLICACION_NOVELA"
            or data.get("approved_issues") != [46, 89, 90]):
        raise ValueError("Aprobaciones editoriales del lote 5 no reconocidas.")
    rows = data.get("items", [])
    if len(rows) != 3 or {r.get("issue") for r in rows} != ALLOWED:
        raise ValueError("Solo 3 originales concretos están aprobados.")
    seen = set()
    for row in rows:
        vid = row.get("video_id")
        if (not row.get("approved_for_publication") or row.get("book") != "conde-montecristo"
                or not isinstance(vid, str) or not VIDEO.fullmatch(vid)
                or vid in seen
                or not isinstance(row.get("sha256"), str)
                or not SHA.fullmatch(row["sha256"])
                or not isinstance(row.get("export_sha256"), str)
                or not SHA.fullmatch(row["export_sha256"])
                or row.get("source") !=
                    f"https://fr.wikisource.org/wiki/Le_Comte_de_Monte-Cristo/Chapitre_{row.get('chapter')}"):
            raise ValueError("Aprobación por issue, vídeo, hash o fuente no válida.")
        seen.add(vid)
    return rows


def inspect_approved():
    items = validate_manifest(json.loads(APPROVED.read_text(encoding="utf-8")))
    state = load_json(STATE_PATH, {})
    index = json.loads(INDEX.read_text(encoding="utf-8"))
    if index.get("version") != 1:
        raise ValueError("Índice público inválido.")
    ready = []
    for row in items:
        issue, video = row["issue"], row["video_id"]
        public = index.get("books", {}).get(row["book"], {}).get("chapters", {})
        if video in public:
            print(f"#{issue}: ya está publicada; excluida del lote.")
            continue
        job = state.get(str(issue)) or {}
        request = job.get("request") or {}
        source = PENDING / f"issue-{issue}.png"
        if (job.get("phase") != "downloaded"
                or request.get("book") != row["book"] or request.get("video_id") != video
                or request.get("volume") is not None
                or Path(job.get("path") or "/") != source
                or source.is_symlink() or not source.is_file()
                or source.resolve().parent != PENDING.resolve()):
            raise ValueError(f"#{issue}: original descargado ausente, inseguro o de otra fuente.")
        raw = source.read_bytes()
        actual = hashlib.sha256(raw).hexdigest()
        if actual != row["sha256"]:
            raise ValueError(f"#{issue}: SHA del ORIGINAL no coincide.")
        cleaned = sanitized_png(raw)
        if hashlib.sha256(cleaned).hexdigest() != row["export_sha256"]:
            raise ValueError(f"#{issue}: SHA del PNG saneado no coincide con el ZIP revisado.")
        book, chapter = find_item(row["book"], video)
        if chapter is None or book["slug"] != row["book"]:
            raise ValueError(f"#{issue}: correspondencia catálogo/episodio incorrecta.")
        ready.append((row, source))
        print(f'#{issue} · Cap. {row["chapter"]} · Original y PNG revisado: SHA-256 correctos')
    return ready


def prepare_pr(rows, publish=False):
    check_identity()
    if command(["git", "status", "--porcelain", "--untracked-files=all"], cwd=ROOT).strip():
        raise RuntimeError("El repositorio no está limpio; guardar cambios antes de crear PR.")
    command(["git", "fetch", "origin", "main"], cwd=ROOT, timeout=180)
    command(["git", "switch", "-c", BRANCH, "origin/main"], cwd=ROOT)
    current = json.loads(INDEX.read_text(encoding="utf-8"))
    for row, _ in rows:
        if row["video_id"] in current.get("books", {}).get(row["book"], {}).get("chapters", {}):
            raise RuntimeError(f'#{row["issue"]}: publicado durante la preparación; cancelar.')
    for row, source in rows:
        import_file(row["book"], row["video_id"], source, True)
    command(["git", "add", "biblioteca-montecristo/infografias"], cwd=ROOT)
    diff = set(command(["git", "diff", "--cached", "--name-only"], cwd=ROOT).splitlines())
    expected = {"biblioteca-montecristo/infografias/index.json"} | {
        f'biblioteca-montecristo/infografias/{row["book"]}/{row["video_id"]}.png'
        for row, _ in rows
    }
    if diff != expected:
        raise RuntimeError("Diff no autorizado; no publicar: " + repr(sorted(diff ^ expected)))
    pr_body = [
        "Tres PNG del lote 5 aprobados individualmente tras inspección original a 2752x1536 y contraste con la novela.",
        "Cotejo editorial: biblioteca-montecristo/CONTRASTE_EDITORIAL_LOTE5_2026-11-16.md",
        "Audio de YouTube no cotejado íntegramente; los cinco originales con errores no se incluyen.",
        "",
    ]
    for row, _ in rows:
        pr_body.extend([
            f'#{row["issue"]} · capítulo {row["chapter"]} · {row["chapter_title"]}',
            f'Original SHA-256: {row["sha256"]}',
            f'Exportación saneada SHA-256: {row["export_sha256"]}',
            f'Fuente: {row["source"]}',
            f'Nota: {row["note"]}',
            "",
        ])
    command(["git", "-c", "user.name=IDEA LAB",
             "-c", "user.email=350414243+idealab2026@users.noreply.github.com",
             "commit", "--author", "IDEA LAB <350414243+idealab2026@users.noreply.github.com>",
             "-m", "Biblioteca: publicar lote 5 revisado #46 #89 #90"], cwd=ROOT)
    command(["git", "push", "-u", "origin", BRANCH], cwd=ROOT, timeout=180)
    pr = command(["gh", "pr", "create", "-R", REPO, "--base", "main", "--head", BRANCH,
                  "--title", "Biblioteca: 3 infografías revisadas lote 5 (#46 #89 #90)",
                  "--body", "\n".join(pr_body)], cwd=ROOT).strip()
    print("PR creada:", pr)
    if publish:
        command(["gh", "pr", "merge", pr, "-R", REPO, "--squash", "--delete-branch"],
                cwd=ROOT, timeout=180)
        print("PR fusionada y Pages solicitada:", pr)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--execute", action="store_true", help="Crea PR, sin fusionarla.")
    parser.add_argument("--publish", action="store_true", help="Crea y fusiona PR.")
    args = parser.parse_args()
    rows = inspect_approved()
    if not rows:
        print("No quedan originales aprobados pendientes; operación idempotente.")
        return
    print("Lote aprobado y verificable:", len(rows))
    if not (args.execute or args.publish):
        print("Solo lectura. --execute crea PR; --publish crea y fusiona PR.")
        return
    prepare_pr(rows, publish=args.publish)


if __name__ == "__main__":
    main()
