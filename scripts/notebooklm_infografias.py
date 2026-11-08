#!/usr/bin/env python3
"""Prepare NotebookLM infographic creation and publish reviewed PNGs to IDEA LAB.

No private notebook identifiers, Google credentials or source names are committed.
Requires the user's locally authenticated 'nlm' CLI for generation/download.
Generated PNGs are only published after explicit local import.
"""
from __future__ import annotations
import argparse
import json
import re
import shlex
import struct
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / "biblioteca-montecristo"
CATALOG = BASE / "catalogo.json"
INDEX = BASE / "infografias" / "index.json"
PNG_SIG = b"\x89PNG\r\n\x1a\n"


def find_item(book_slug: str, video_id: str | None):
    catalog = json.loads(CATALOG.read_text(encoding="utf-8"))
    book = next((b for b in catalog["books"] if b["slug"] == book_slug), None)
    if not book:
        raise ValueError("Libro desconocido. Consulta el slug en catalogo.json.")
    if video_id and not any(c["id"] == video_id for c in book["chapters"]):
        raise ValueError("El identificador de vídeo no pertenece a ese libro.")
    return book, next((c for c in book["chapters"] if c["id"] == video_id), None)


def focus_prompt(book, chapter=None):
    shared = ("Crea una infografía editorial profesional en español de España, "
              "legible en móvil y ordenador, jerarquía visual clara, máximo seis bloques, "
              "tipografía grande, datos y nombres contrastables. Usa SOLO las fuentes "
              "seleccionadas. No inventes citas, fechas, cifras ni relaciones. "
              "No incluyas nombres de archivos, datos personales ni referencias a la "
              "cuenta de origen.")
    if chapter:
        return (shared + " Resumen visual preciso del capítulo del libro '" +
                book["title"] + "' de " + book["author"] + ": '" +
                chapter["title"] + "'. Mostrar contexto, acontecimientos o ideas "
                "fundamentales, relaciones causales y conclusión. Evitar mezclar capítulos.")
    return (shared + " Visión de conjunto del libro '" + book["title"] +
            "' de " + book["author"] + "'. Mostrar tesis o trama principal, "
            "estructura, ideas y relaciones relevantes. Si este cuaderno solo contiene "
            "un tomo, identificarlo como tal; no fingir que cubre la obra completa.")


def make_generation(args):
    book, chapter = find_item(args.book, args.video_id)
    if chapter and not args.source_ids:
        raise ValueError("Para un capítulo debes pasar --source-ids con sus fuentes concretas; evita mezclar el libro completo.")
    cmd = ["nlm", "infographic", "create", args.notebook_id,
           "--orientation", "landscape", "--detail", "standard", "--style", "editorial",
           "--language", "es-ES", "--focus", focus_prompt(book, chapter), "--confirm"]
    if args.source_ids:
        cmd += ["--source-ids", args.source_ids]
    print("Cuaderno y fuentes permanecen en el Mac; el repositorio público no los almacena.")
    print("Comando:", shlex.join(cmd))
    if args.execute:
        result = subprocess.run(cmd, check=False)
        if result.returncode:
            raise RuntimeError("NotebookLM no completó la solicitud. Comprueba nlm login y los límites de tu cuenta.")
        print("La solicitud de creación se ha enviado. Espera a que Studio marque el artefacto como completado.")
        print("Para incorporar la imagen usa: download --notebook-id ... --artifact-id ...")
    else:
        print("Vista previa. Añade --execute para enviar la solicitud desde tu Mac.")


def sanitized_png(raw: bytes) -> bytes:
    if len(raw) > 22_000_000 or not raw.startswith(PNG_SIG):
        raise ValueError("El archivo no es un PNG válido o supera 22 MB.")
    pos, chunks, have_ihdr, have_iend, have_idat = 8, [], False, False, False
    keep = {b"IHDR", b"PLTE", b"tRNS", b"IDAT", b"IEND"}
    while pos + 12 <= len(raw):
        length = struct.unpack(">I", raw[pos:pos + 4])[0]
        end = pos + 12 + length
        if end > len(raw):
            raise ValueError("PNG incompleto.")
        kind = raw[pos + 4:pos + 8]
        piece = raw[pos:end]
        if kind == b"IHDR":
            if have_ihdr or length != 13:
                raise ValueError("Cabecera PNG inválida.")
            w, h = struct.unpack(">II", raw[pos + 8:pos + 16])
            if w < 640 or h < 350 or w > 16000 or h > 16000:
                raise ValueError("La infografía requiere una resolución de al menos 640x350.")
            have_ihdr = True
        if kind == b"IDAT":
            have_idat = True
        if kind in keep:
            chunks.append(piece)
        pos = end
        if kind == b"IEND":
            have_iend = True
            break
    if not (have_ihdr and have_idat and have_iend):
        raise ValueError("Faltan bloques esenciales en el PNG.")
    # Omite metadatos textuales, EXIF, identificadores, perfiles y otros bloques
    # auxiliares. Esto no puede detectar información personal dibujada en píxeles.
    return PNG_SIG + b"".join(chunks)


def import_file(book_slug: str, video_id: str | None, source: Path, explicit_review: bool, volume: str | None = None):
    book, chapter = find_item(book_slug, video_id)
    if not explicit_review:
        raise ValueError("Revisa visualmente el PNG y ejecuta de nuevo con --confirm-public. IDEA LAB es público.")
    if volume and (video_id or not re.fullmatch(r"tomo-[a-z0-9-]+", volume)):
        raise ValueError("--volume debe ser tomo-i, tomo-ii, etc., y no admite --video-id.")
    data = sanitized_png(source.read_bytes())
    name = volume or video_id or "libro"
    target_dir = BASE / "infografias" / book_slug
    target_dir.mkdir(parents=True, exist_ok=True)
    target = target_dir / f"{name}.png"
    target.write_bytes(data)
    index = json.loads(INDEX.read_text(encoding="utf-8"))
    row = index.setdefault("books", {}).setdefault(book_slug, {"chapters": {}})
    rel = "./infografias/" + book_slug + "/" + name + ".png"
    if video_id:
        row.setdefault("chapters", {})[video_id] = rel
    elif volume:
        items = row.setdefault("volumes", [])
        label = volume.replace("-", " ").title().replace(" Ii", " II").replace(" Iii", " III")
        value = {"id": volume, "label": label, "image": rel}
        existing = next((i for i, x in enumerate(items) if x["id"] == volume), None)
        if existing is None:
            items.append(value)
        else:
            items[existing] = value
    else:
        row["book"] = rel
    INDEX.write_text(json.dumps(index, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("PNG revisado y sin metadatos auxiliares:", target.relative_to(ROOT))
    print("Manifest actualizado:", INDEX.relative_to(ROOT))
    print("El cambio solo será público tras revisar y subir estos archivos a GitHub.")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)
    generate = sub.add_parser("generate", help="Preparar o ejecutar una infografía en NotebookLM")
    generate.add_argument("--book", required=True)
    generate.add_argument("--video-id", help="ID de YouTube del episodio. Omitir para infografía del libro.")
    generate.add_argument("--notebook-id", required=True, help="ID del cuaderno privado, no se almacena.")
    generate.add_argument("--source-ids", help="IDs de las fuentes (separados por comas); obligatorio por capítulo.")
    generate.add_argument("--execute", action="store_true")
    imp = sub.add_parser("import", help="Importar un PNG generado por NotebookLM y ya revisado")
    imp.add_argument("--book", required=True)
    imp.add_argument("--video-id")
    imp.add_argument("--volume", help="Tomo de obra dividida: tomo-i, tomo-ii, etc.")
    imp.add_argument("--png", type=Path, required=True)
    imp.add_argument("--confirm-public", action="store_true")
    down = sub.add_parser("download", help="Descargar un artefacto concreto e importarlo tras revisión")
    down.add_argument("--book", required=True)
    down.add_argument("--video-id")
    down.add_argument("--volume", help="Tomo al que pertenece la infografía.")
    down.add_argument("--notebook-id", required=True)
    down.add_argument("--artifact-id", required=True, help="ID exacto del artefacto terminado, evita confundir imágenes.")
    down.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    try:
        if args.command == "generate":
            make_generation(args)
        elif args.command == "import":
            import_file(args.book, args.video_id, args.png, args.confirm_public, args.volume)
        else:
            find_item(args.book, args.video_id)
            args.output.parent.mkdir(parents=True, exist_ok=True)
            cmd = ["nlm", "download", "infographic", args.notebook_id,
                   "--id", args.artifact_id, "--output", str(args.output)]
            subprocess.run(cmd, check=True)
            sanitized_png(args.output.read_bytes())
            print("Descarga verificada. Revisa el PNG antes de publicarlo:", args.output)
            print("Importa con:", "python3 scripts/notebooklm_infografias.py import --book",
                  args.book, "--png", shlex.quote(str(args.output)),
                  ("--video-id " + args.video_id) if args.video_id else "",
                  ("--volume " + args.volume) if args.volume else "", "--confirm-public")
    except (ValueError, OSError, RuntimeError, subprocess.CalledProcessError) as err:
        print("ERROR:", err, file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
