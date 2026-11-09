#!/usr/bin/env python3
"""IDEA LAB <-> local NotebookLM bridge.

ChatGPT creates a public, *non-sensitive* GitHub issue as an authenticated
IDEA LAB account. This trusted, local-only worker translates whitelisted
requests into NotebookLM generation using notebook/source mappings held ONLY
on the Mac. Never exposes notebook IDs, passwords or private source text.
No untrusted code, shells or arbitrary prompts are executed from issues.
"""
from __future__ import annotations

import argparse
import datetime as dt
import fcntl
import json
import os
import re
import shutil
import subprocess
import sys
from contextlib import contextmanager
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from notebooklm_infografias import find_item, import_file  # noqa: E402

REPO = "idealab2026/idealab2026.github.io"
OWNER = "idealab2026"
HOME = Path.home()
CONFIG_PATH = HOME / ".config/idea-lab/notebooklm-bridge.json"
STATE_PATH = HOME / ".local/state/idea-lab/notebooklm-bridge.json"
LOCK_PATH = HOME / ".local/state/idea-lab/notebooklm-bridge.lock"
PENDING = HOME / "Pictures/IDEA-LAB/NotebookLM/Pendientes"
MARK = "IDEA_LAB_NLM_REQUEST_V1"
REQ = re.compile(r"<!-- " + MARK + r"\s*\n(\{[^\n]*\})\s*\n-->", re.ASCII)
VALID_BOOK = re.compile(r"[a-z0-9-]{2,60}\Z")
VALID_VOLUME = re.compile(r"tomo-[a-z0-9-]{1,22}\Z")
VALID_VIDEO = re.compile(r"[A-Za-z0-9_-]{11}\Z")
VALID_ID = re.compile(r"[A-Za-z0-9_-]{8,100}\Z")


def command(argv: list[str], timeout: int = 90, capture=True, cwd=None):
    # uv installs notebooklm CLI in ~/.local/bin. GUI-launched shells may omit
    # that directory from PATH; resolve only this trusted, fixed local binary.
    if argv and argv[0] == "nlm" and not shutil.which("nlm"):
        local_nlm = HOME / ".local/bin/nlm"
        if local_nlm.is_file() and os.access(local_nlm, os.X_OK):
            argv = [str(local_nlm), *argv[1:]]
    result = subprocess.run(argv, check=False, text=True, encoding="utf-8",
                            capture_output=capture, timeout=timeout, cwd=cwd)
    if result.returncode != 0:
        raise RuntimeError(f"Fallo de {argv[0]} (código {result.returncode}). "
                           "Revisa autenticación, conexión y límites en el Mac.")
    return result.stdout if capture else ""


def load_json(path: Path, default):
    if not path.exists():
        return default
    return json.loads(path.read_text(encoding="utf-8"))


def save_json(path: Path, value):
    path.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
    tmp = path.with_suffix(".tmp")
    with open(tmp, "w", encoding="utf-8") as stream:
        json.dump(value, stream, ensure_ascii=False, indent=2)
        stream.write("\n")
    os.chmod(tmp, 0o600)
    tmp.replace(path)


@contextmanager
def exclusive_state_lock():
    """Serialize Mac LaunchAgent and manual CLI invocations across processes.

    Holding the OS lock across NotebookLM creation and GitHub comments prevents
    two pollers from independently starting requests using a stale JSON state.
    """
    LOCK_PATH.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    fd = os.open(LOCK_PATH, os.O_RDWR | os.O_CREAT, 0o600)
    held = False
    try:
        try:
            fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
            held = True
        except BlockingIOError:
            yield False
            return
        yield True
    finally:
        if held:
            fcntl.flock(fd, fcntl.LOCK_UN)
        os.close(fd)


def private_config():
    return load_json(CONFIG_PATH, {"version": 1, "books": {}})


def check_identity():
    user = json.loads(command(["gh", "api", "user"]))
    if user.get("login", "").lower() != OWNER:
        raise RuntimeError("La sesión activa de gh NO es la cuenta IDEA LAB. "
                           "Ejecuta gh auth switch -u idealab2026 en tu Mac.")


def list_notebooks():
    return command(["nlm", "notebook", "list", "--title"], timeout=90)


def map_book(args):
    find_item(args.book, None)
    if not VALID_ID.fullmatch(args.notebook_id):
        raise ValueError("ID de cuaderno no válido.")
    if args.volume and not VALID_VOLUME.fullmatch(args.volume):
        raise ValueError("Identificador de tomo no válido (ej.: tomo-i).")
    command(["nlm", "notebook", "get", args.notebook_id])
    config = private_config()
    books = config.setdefault("books", {})
    b = books.setdefault(args.book, {"notebooks": {}, "episodes": {}})
    b["notebooks"][args.volume or "libro"] = args.notebook_id
    save_json(CONFIG_PATH, config)
    print("Vinculación privada guardada para:", args.book, args.volume or "libro")


def map_episode(args):
    book, ch = find_item(args.book, args.video_id)
    if ch is None:
        raise ValueError("El vídeo no corresponde al libro.")
    if not VALID_ID.fullmatch(args.notebook_id):
        raise ValueError("ID de cuaderno no válido.")
    source_ids = [x.strip() for x in args.source_ids.split(",") if x.strip()]
    if not source_ids or any(not VALID_ID.fullmatch(x) for x in source_ids):
        raise ValueError("Se requieren IDs válidos y explícitos de las fuentes exactas.")
    command(["nlm", "notebook", "get", args.notebook_id])
    # Fail closed: no episodic generation with all sources or guessed matches.
    cfg = private_config()
    row = cfg.setdefault("books", {}).setdefault(args.book, {"notebooks": {}, "episodes": {}})
    row.setdefault("episodes", {})[args.video_id] = {
        "notebook": args.notebook_id, "sources": source_ids}
    save_json(CONFIG_PATH, cfg)
    print("Fuentes privadas vinculadas al episodio:", ch["title"])


def parse_request(issue):
    if issue.get("state", "").upper() not in ("OPEN", "OPENED"):
        return None
    if issue.get("author", {}).get("login", "").lower() != OWNER:
        return None
    if not issue.get("title", "").startswith("[NLM] "):
        return None
    match = REQ.fullmatch((issue.get("body") or "").strip())
    if not match:
        return None
    obj = json.loads(match.group(1))
    if set(obj) != {"version", "action", "book", "video_id", "volume"}:
        return None
    if obj["version"] != 1 or obj["action"] != "infographic":
        return None
    if not isinstance(obj["book"], str) or not VALID_BOOK.fullmatch(obj["book"]):
        return None
    vid, vol = obj["video_id"], obj["volume"]
    if (vid is not None and (not isinstance(vid, str) or not VALID_VIDEO.fullmatch(vid))
            or vol is not None and (not isinstance(vol, str) or not VALID_VOLUME.fullmatch(vol))):
        return None
    if vid and vol:
        return None
    try:
        find_item(obj["book"], vid)
    except ValueError:
        return None
    return obj


def select_mapping(cfg, req):
    b = cfg.get("books", {}).get(req["book"], {})
    if req["video_id"]:
        m = b.get("episodes", {}).get(req["video_id"])
        if not m or not m.get("sources"):
            return None
        return m["notebook"], m["sources"]
    notebooks = b.get("notebooks", {})
    notebook = notebooks.get(req["volume"] or "libro")
    if not notebook:
        return None
    # If multiple notebooks exist, never use one volume as a whole-book synthesis.
    if not req["volume"] and any(k != "libro" for k in notebooks):
        return None
    return notebook, []


def build_prompt(req):
    book, chapter = find_item(req["book"], req["video_id"])
    common = ("Infografía editorial excelente en español de España, horizontal 16:9, "
              "máximo seis bloques visuales, tipografía grande, sin texto superpuesto. "
              "Usar SOLO las fuentes seleccionadas. Precisar personajes, ideas, relaciones "
              "causales y consecuencias. Prohibido inventar fechas, datos, citas o escenas. "
              "Evitar datos personales o referencias al usuario.")
    if chapter:
        return common + " Centrarse exclusivamente en el episodio: " + chapter["title"] + "."
    if req["volume"]:
        return common + " Resumir solamente el " + req["volume"].replace("-", " ") + " de " + book["title"] + "."
    return common + " Visión integral de " + book["title"] + ", de " + book.get("author", "") + "."


def artifact_rows(raw):
    try:
        parsed = json.loads(raw)
    except (ValueError, TypeError):
        return []
    if isinstance(parsed, list):
        return [x for x in parsed if isinstance(x, dict)]
    if isinstance(parsed, dict):
        for key in ("artifacts", "items", "data", "results"):
            arr = parsed.get(key)
            if isinstance(arr, list):
                return [x for x in arr if isinstance(x, dict)]
    return []


def artifact_id(row):
    value = row.get("artifact_id") or row.get("id")
    return str(value) if value and VALID_ID.fullmatch(str(value)) else None


def infographic_rows(nb):
    out = command(["nlm", "studio", "status", nb, "--json", "--full", "--limit", "100"], timeout=120)
    return [x for x in artifact_rows(out) if
            "infographic" in str(x.get("type", x.get("artifact_type", ""))).lower()
            or x.get("type") == 7 or x.get("artifact_type") == 7]


def status_text(row):
    state = row.get("status") or row.get("state")
    return str(state).lower()


def issue_comment(number, message):
    # Only fixed messages; no user-supplied text, source names, paths or tokens.
    command(["gh", "issue", "comment", str(number), "-R", REPO, "--body", message])


def github_issues():
    out = command(["gh", "issue", "list", "-R", REPO, "--state", "open",
                   "--limit", "100", "--json", "number,title,body,author,state,createdAt"])
    issues = json.loads(out)
    # GitHub's default issue listing is newest-first; honor playlist job order
    # by processing the oldest valid request before newer ones.
    if not isinstance(issues, list):
        return []
    return sorted(issues, key=lambda issue: int(issue.get("number", 0)))


def enroll():
    check_identity()
    command(["nlm", "notebook", "list", "--json"], timeout=120)
    config = private_config()
    config.setdefault("activated_at", dt.datetime.now(dt.timezone.utc).isoformat())
    save_json(CONFIG_PATH, config)
    STATE_PATH.parent.mkdir(parents=True, exist_ok=True)
    PENDING.mkdir(parents=True, exist_ok=True)
    print("Puente activado. Los ID privados se guardarán únicamente en:", CONFIG_PATH)
    print("Para asociar cada libro: python3 scripts/notebooklm_bridge.py map-book --help")


def next_requests(state, config):
    activated = config.get("activated_at")
    if not activated:
        raise RuntimeError("Debes ejecutar init primero; no se consumirán incidencias antiguas.")
    for issue in github_issues():
        number = str(issue["number"])
        if number in state:
            continue
        try:
            opened = dt.datetime.fromisoformat(issue["createdAt"].replace("Z", "+00:00"))
            active_since = dt.datetime.fromisoformat(activated.replace("Z", "+00:00"))
        except (KeyError, TypeError, ValueError):
            continue
        if opened < active_since:
            continue
        try:
            req = parse_request(issue)
        except (ValueError, KeyError, TypeError):
            continue
        if req:
            yield number, req


def submitted_comment_exists(number):
    """Fail closed on network errors rather than launching an existing request."""
    raw = command(["gh", "api",
                   f"repos/{REPO}/issues/{int(number)}/comments?per_page=100"])
    comments = json.loads(raw)
    if not isinstance(comments, list):
        raise RuntimeError("Respuesta de comentarios de GitHub no verificable.")
    return any(
        isinstance(c, dict) and
        (c.get("user") or {}).get("login", "").lower() == OWNER and
        str(c.get("body") or "").startswith(
            "Solicitud enviada a NotebookLM desde el Mac de IDEA LAB.")
        for c in comments)


def quarantine_existing_request(number, req, state, config):
    """Acknowledge a remote submission with missing local state, never replay it."""
    mapping = select_mapping(config, req)
    if mapping is None:
        raise ValueError("Sin mapeo privado no se puede conciliar esta solicitud.")
    notebook, sources = mapping
    if not submitted_comment_exists(number):
        raise ValueError("No hay evidencia pública de que ya se haya enviado a NotebookLM.")
    if number in state:
        raise ValueError("La solicitud ya está registrada en el estado local.")
    state[number] = {
        "request": req, "phase": "deferred", "notebook": notebook,
        "source_ids": sources, "before": [],
        "reason": "remote_submission_without_local_state",
        "deferred_at": dt.datetime.now(dt.timezone.utc).isoformat(),
    }
    save_json(STATE_PATH, state)
    print("Solicitud #", number, "EN CUARENTENA: GitHub confirma el envío,",
          "pero faltaba registro local. No se ha creado una nueva infografía.")
    print("Requiere identificar manualmente su artefacto antes de liberar ese cuaderno.")


def quarantine_remote(args):
    check_identity()
    state = load_json(STATE_PATH, {})
    number = str(args.issue)
    if number in state:
        raise ValueError("La solicitud ya existe en el estado local.")
    matching = [
        issue for issue in github_issues() if str(issue.get("number")) == number
    ]
    if len(matching) != 1:
        raise ValueError("La incidencia pública no se encontró inequívocamente.")
    req = parse_request(matching[0])
    if not req:
        raise ValueError("La incidencia no tiene una solicitud IDEA LAB válida.")
    quarantine_existing_request(number, req, state, private_config())


def request_new(number, req, state, config):
    mapping = select_mapping(config, req)
    if mapping is None:
        print("Pendiente de mapear las fuentes de la solicitud #", number)
        return False
    notebook, sources = mapping
    # Another invocation may have launched this issue before its state was
    # persisted. A trusted public submission comment is evidence against retry.
    if submitted_comment_exists(number):
        quarantine_existing_request(number, req, state, config)
        return True
    # Snapshot before starting avoids confusing an older graphic with the new one.
    before = [artifact_id(x) for x in infographic_rows(notebook)]
    job = {"request": req, "phase": "launching", "before": before,
           "notebook": notebook, "source_ids": sources}
    state[number] = job
    save_json(STATE_PATH, state)  # No blind retry after an ambiguous failure.
    argv = ["nlm", "infographic", "create", notebook,
            "--orientation", "landscape", "--detail", "detailed",
            "--style", "editorial", "--language", "es-ES",
            "--focus", build_prompt(req), "--confirm"]
    if sources:
        argv.extend(["--source-ids", ",".join(sources)])
    try:
        command(argv, timeout=180)
    except Exception:
        job["phase"] = "uncertain"
        save_json(STATE_PATH, state)
        print("Solicitud incierta #", number, ": revisa NotebookLM; NO se reenvía automáticamente.")
        return True
    job["phase"] = "submitted"
    save_json(STATE_PATH, state)
    try:
        issue_comment(number, "Solicitud enviada a NotebookLM desde el Mac de IDEA LAB. Generación en curso; pendiente de revisión visual antes de publicar.")
    except Exception:
        print("No se pudo comentar la solicitud, pero NotebookLM ya está generando.")
    print("Generación solicitada:", number, req["book"])
    return True


def check_submitted(number, job, state):
    if job["phase"] != "submitted":
        return
    notebook = job["notebook"]
    try:
        rows = infographic_rows(notebook)
    except Exception:
        print("No se pudo leer el estado de NotebookLM; se reintentará la consulta.")
        return
    created = [r for r in rows if artifact_id(r) and artifact_id(r) not in job.get("before", [])]
    if not job.get("artifact_id"):
        # Multiple new infographics? Ambiguous; do not download the wrong one.
        if len(created) != 1:
            print("Solicitud #", number, ": esperando identificación inequívoca del artefacto.")
            return
        job["artifact_id"] = artifact_id(created[0])
        save_json(STATE_PATH, state)
    target = next((x for x in rows if artifact_id(x) == job["artifact_id"]), None)
    if target is None:
        return
    status = status_text(target)
    if any(x in status for x in ("fail", "error", "cancel")) or status == "4":
        job["phase"] = "failed"
        save_json(STATE_PATH, state)
        issue_comment(number, "NotebookLM ha informado de un fallo de generación. Revisión necesaria; no se reintentará automáticamente.")
        return
    # A non-complete artifact will be picked up on the next local polling cycle.
    if not any(x in status for x in ("complet", "ready", "finish", "success")) and status != "3":
        return
    PENDING.mkdir(parents=True, exist_ok=True)
    path = PENDING / ("issue-" + number + ".png")
    try:
        command(["nlm", "download", "infographic", notebook, "--id",
                 job["artifact_id"], "--output", str(path)], timeout=180)
        from notebooklm_infografias import sanitized_png
        sanitized_png(path.read_bytes())
    except Exception:
        print("Descarga pendiente para #", number, "- comprobar sesión y estado del artefacto.")
        return
    job["phase"] = "downloaded"
    job["path"] = str(path)
    save_json(STATE_PATH, state)
    issue_comment(number, "Infografía descargada en el Mac. PENDIENTE de revisión editorial, privacidad y aprobación explícita para publicar. No se ha subido ninguna imagen.")
    print("Infografía disponible localmente:", path)


def poll():
    check_identity()
    config = private_config()
    state = load_json(STATE_PATH, {})
    for issue, job in list(state.items()):
        if job.get("phase") == "submitted":
            check_submitted(issue, job, state)
    # Private, idempotent JPG copies on the user's Desktop. Export failures
    # must not block NotebookLM polling or cause a second remote generation.
    try:
        from notebooklm_export_desktop import export_known
        export_known(state, verbose=False)
    except Exception as exc:
        print("ATENCIÓN: no se pudo actualizar la copia JPEG del Escritorio:",
              type(exc).__name__)
    running = sum(j.get("phase") in ("submitted", "launching", "uncertain") for j in state.values())
    if running:
        print("Solicitudes activas o inciertas:", running, "(no se enviarán otras automáticamente)")
        return
    # A deferred request may still complete remotely after a timeout. Never
    # start another request in the same notebook: its new artifact could be
    # mistaken for the later request's result. Other notebooks are independent.
    deferred_notebooks = {
        j.get("notebook") for j in state.values() if j.get("phase") == "deferred"
    }
    for number, req in next_requests(state, config):
        mapping = select_mapping(config, req)
        if mapping and mapping[0] in deferred_notebooks:
            print("Solicitud #", number, "aplazada: existe un trabajo incierto",
                  "en ese cuaderno. Continuando con otros cuadernos.")
            continue
        if request_new(number, req, state, config):
            break


def defer_uncertain(args):
    """Release a blocked queue without retrying or misreporting a job as done.

    This is an explicit, user-approved deferral. It does NOT confirm that the
    remote service did nothing; a late artifact must be reconciled manually.
    """
    check_identity()
    state = load_json(STATE_PATH, {})
    job = state.get(str(args.issue))
    if not job or job.get("phase") != "uncertain":
        raise ValueError("Solo puede aplazarse una solicitud en estado uncertain.")
    if not args.confirm_no_artifact:
        raise ValueError("Se necesita --confirm-no-artifact tras comprobar NotebookLM.")
    before = set(job.get("before", []))
    rows = infographic_rows(job["notebook"])
    created = [x for x in rows if artifact_id(x) and artifact_id(x) not in before]
    if created:
        raise RuntimeError("Hay nuevos artefactos en NotebookLM. No se aplaza: utiliza attach o revisa Studio.")
    job["phase"] = "deferred"
    job["deferred_at"] = dt.datetime.now(dt.timezone.utc).isoformat()
    save_json(STATE_PATH, state)
    print("Solicitud #", args.issue, "APLAZADA, no completada ni reenviada.")
    print("La cola queda liberada. El capítulo aplazado requiere revisión manual.")
    print("Un artefacto tardío NO se atribuirá automáticamente a otra solicitud.")


def attach_artifact(args):
    state = load_json(STATE_PATH, {})
    job = state.get(str(args.issue))
    if not job or job.get("phase") not in ("submitted", "uncertain", "deferred"):
        raise ValueError("El número de solicitud no está pendiente de identificar.")
    if not VALID_ID.fullmatch(args.artifact_id):
        raise ValueError("ID de infografía inválido.")
    available = infographic_rows(job["notebook"])
    item = next((x for x in available if artifact_id(x) == args.artifact_id), None)
    if item is None:
        raise ValueError("No se encuentra esa infografía en el cuaderno privado correspondiente.")
    job["artifact_id"] = args.artifact_id
    job["phase"] = "submitted"
    save_json(STATE_PATH, state)
    print("Infografía vinculada a la solicitud #", args.issue, "sin publicar identificadores.")


def show_status():
    state = load_json(STATE_PATH, {})
    if not state:
        print("No hay trabajos registrados. Comprueba que hayas ejecutado init.")
    for issue, job in sorted(state.items(), key=lambda x: int(x[0])):
        print("#" + issue, job["request"]["book"], job["phase"],
              job.get("path", "") if job["phase"] == "downloaded" else "")


def publish(args):
    check_identity()
    state = load_json(STATE_PATH, {})
    job = state.get(str(args.issue))
    if not job or job["phase"] != "downloaded":
        raise ValueError("Solo pueden publicarse imágenes descargadas que estén pendientes de revisión.")
    if not args.confirm_public:
        raise ValueError("Debes revisar el PNG en tu Mac y añadir --confirm-public.")
    if not (ROOT / ".git").is_dir():
        raise RuntimeError("El script debe ejecutarse desde el clon Git del repositorio, no desde un ZIP.")
    if command(["git", "status", "--porcelain"], cwd=ROOT).strip():
        raise RuntimeError("El repositorio tiene cambios sin guardar. Revisa o guarda esos cambios antes.")
    req = job["request"]
    command(["git", "fetch", "origin", "main"], cwd=ROOT, timeout=180)
    branch = "feat/notebooklm-issue-" + str(args.issue)
    command(["git", "switch", "-c", branch, "origin/main"], cwd=ROOT)
    import_file(req["book"], req["video_id"], Path(job["path"]), True, req["volume"])
    command(["git", "add", "biblioteca-montecristo/infografias"], cwd=ROOT)
    command(["git", "-c", "user.name=IDEA LAB",
             "-c", "user.email=idealab.research2026@gmail.com",
             "commit", "-m", "Biblioteca: infografía revisada de la solicitud #" + str(args.issue)], cwd=ROOT)
    command(["git", "push", "-u", "origin", branch], cwd=ROOT, timeout=180)
    title = "Biblioteca: infografía NotebookLM revisada #" + str(args.issue)
    pr = command(["gh", "pr", "create", "-R", REPO, "--base", "main", "--head", branch,
                  "--title", title, "--body",
                  "Imagen revisada manualmente en Mac; fuentes y cuadernos privados no incluidos. "
                  "Verificar diseño final y derechos de publicación antes de fusionar."], cwd=ROOT)
    job["phase"] = "review-pr"
    job["pr"] = pr.strip()
    save_json(STATE_PATH, state)
    issue_comment(args.issue, "Imagen revisada y propuesta para publicación mediante pull request de IDEA LAB. Pendiente de revisión/fusión final.")
    print("Pull request preparado:", pr.strip())


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)
    sub.add_parser("init", help="Activar el puente desde este momento; sin importar incidencias antiguas")
    sub.add_parser("doctor", help="Diagnosticar herramientas y conexiones, sin revelar IDs privados")
    sub.add_parser("poll", help="Procesar una solicitud y comprobar las anteriores")
    sub.add_parser("status", help="Consultar trabajos locales sin enviar información privada")
    mb = sub.add_parser("map-book", help="Asociar en privado un libro o tomo a su cuaderno")
    mb.add_argument("--book", required=True)
    mb.add_argument("--notebook-id", required=True)
    mb.add_argument("--volume")
    me = sub.add_parser("map-episode", help="Asociar un vídeo y sus fuentes exactas")
    me.add_argument("--book", required=True)
    me.add_argument("--video-id", required=True)
    me.add_argument("--notebook-id", required=True)
    me.add_argument("--source-ids", required=True)
    d = sub.add_parser("defer-uncertain", help="Aplazar una solicitud incierta sin repetirla y liberar la cola")
    d.add_argument("--issue", type=int, required=True)
    d.add_argument("--confirm-no-artifact", action="store_true")
    qr = sub.add_parser("quarantine-remote", help="Evitar relanzar una solicitud ya enviada cuyo estado local falta")
    qr.add_argument("--issue", type=int, required=True)
    att = sub.add_parser("attach", help="Vincular manualmente un artefacto inequívoco si hay varios")
    att.add_argument("--issue", type=int, required=True)
    att.add_argument("--artifact-id", required=True)
    p = sub.add_parser("publish", help="Preparar PR público después de revisión local")
    p.add_argument("--issue", type=int, required=True)
    p.add_argument("--confirm-public", action="store_true")
    args = parser.parse_args()
    mutating = {"init", "map-book", "map-episode", "poll", "attach", "defer-uncertain", "quarantine-remote", "publish"}
    if args.command in mutating:
        with exclusive_state_lock() as acquired:
            if not acquired:
                print("Otro proceso NotebookLM está ejecutando una operación. No se inicia una segunda.")
                return 0
            return execute_command(args)
    return execute_command(args)


def execute_command(args):
    try:
        if args.command == "init":
            enroll()
        elif args.command == "doctor":
            check_identity()
            command(["nlm", "notebook", "list", "--json"], timeout=120)
            print("Conexiones válidas; cuadernos accesibles y sesión GitHub IDEA LAB activa.")
            print("Configuración local:", "existe" if CONFIG_PATH.exists() else "no activada")
            print("Libros asociados:", ", ".join(private_config().get("books", {})) or "ninguno")
        elif args.command == "map-book":
            map_book(args)
        elif args.command == "map-episode":
            map_episode(args)
        elif args.command == "poll":
            poll()
        elif args.command == "status":
            show_status()
        elif args.command == "attach":
            attach_artifact(args)
        elif args.command == "defer-uncertain":
            defer_uncertain(args)
        elif args.command == "quarantine-remote":
            quarantine_remote(args)
        elif args.command == "publish":
            publish(args)
    except (RuntimeError, ValueError, OSError, subprocess.TimeoutExpired) as err:
        print("ERROR:", err, file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
