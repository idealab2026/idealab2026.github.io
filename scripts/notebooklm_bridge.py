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
HEALTH_PATH = HOME / ".local/state/idea-lab/notebooklm-generation-health.json"
FAILURE_WINDOW = 5
FAILURE_THRESHOLD = 3
PENDING = HOME / "Pictures/IDEA-LAB/NotebookLM/Pendientes"
MARK = "IDEA_LAB_NLM_REQUEST_V1"
REQ = re.compile(r"<!-- " + MARK + r"\s*\n(\{[^\n]*\})\s*\n-->", re.ASCII)
VALID_BOOK = re.compile(r"[a-z0-9-]{2,60}\Z")
VALID_VOLUME = re.compile(r"tomo-[a-z0-9-]{1,22}\Z")
VALID_VIDEO = re.compile(r"[A-Za-z0-9_-]{11}\Z")
VALID_ID = re.compile(r"[A-Za-z0-9_-]{8,100}\Z")
SUBMITTED_COMMENT = ("Solicitud enviada a NotebookLM desde el Mac de IDEA LAB. "
                     "Generación en curso; pendiente de revisión visual antes de publicar.")
DOWNLOADED_COMMENT = ("Infografía descargada en el Mac. PENDIENTE de revisión editorial, "
                      "privacidad y aprobación explícita para publicar. "
                      "No se ha subido ninguna imagen.")
# Only these two whitelisted public comments may be retried automatically.
FAILED_COMMENT = ("NotebookLM ha informado de un fallo de generación. "
                  "Revisión necesaria; no se reintentará automáticamente.")
PUBLISH_COMMENT = ("Imagen revisada y propuesta para publicación mediante pull request "
                   "de IDEA LAB. Pendiente de revisión/fusión final.")
RETRY_COMMENT = ("Se ha solicitado de nuevo a NotebookLM una infografía cuyo intento "
                 "anterior falló. Pendiente de descarga y revisión.")
ALLOWED_COMMENTS = (SUBMITTED_COMMENT, DOWNLOADED_COMMENT, FAILED_COMMENT,
                    PUBLISH_COMMENT, RETRY_COMMENT)


class NotebookLMQuotaError(RuntimeError):
    """A CLI response explicitly indicates exhausted NotebookLM usage."""


def looks_like_quota_error(output: str) -> bool:
    # Match only recognizable quota phrases. Never log raw CLI output,
    # which could contain private notebook IDs or other user data.
    low = str(output or "").lower()
    return any(x in low for x in (
        "resource_exhausted", "quota exceeded", "quota exhausted",
        "usage limit", "limit reached", "daily limit", "weekly limit",
        "límite de uso", "limite de uso", "cuota agotada",
        "too many requests", "http 429", "status 429",
    ))


def cli_failure_hint(argv: list[str], stderr: str) -> str:
    """Useful, redact-safe diagnosis; never print raw stderr, tokens or IDs."""
    program = Path(argv[0]).name if argv else ""
    if program != "gh":
        return "Revisa la sesión de NotebookLM y el límite de uso."
    low = (stderr or "").lower()
    operation = " ".join(argv[1:3]) if len(argv) >= 3 else "operación"
    if any(x in low for x in ("rate limit", "secondary rate", "too many requests")):
        reason = "límite de llamadas GitHub (esperar y reintentar)"
    elif any(x in low for x in ("authentication", "not logged", "unauthorized",
                                "bad credentials", "http 401")):
        reason = "autenticación de GitHub (comprobar gh auth status)"
    elif any(x in low for x in ("timeout", "connection", "network",
                                "could not resolve", "dial tcp", "tls handshake")):
        reason = "conectividad GitHub (se reintentará en el próximo ciclo)"
    elif any(x in low for x in ("http 403", "forbidden")):
        reason = "permisos o restricciones de GitHub (HTTP 403)"
    else:
        reason = "causa no identificada; ejecutar gh auth status y gh api rate_limit"
    return f"Operación gh {operation}: {reason}."



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
        if Path(argv[0]).name == "nlm" and looks_like_quota_error(
                str(result.stderr or "") + " " + str(result.stdout or "")):
            raise NotebookLMQuotaError(
                "NotebookLM informó de cuota o límite de uso. "
                "Generación pausada; revisar el límite en Studio."
            )
        raise RuntimeError(
            f"Fallo de {Path(argv[0]).name} (código {result.returncode}). "
            + cli_failure_hint(argv, result.stderr if capture else "")
        )
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


def generation_health() -> dict:
    """Health state lives only on the Mac; never publish it in IDEA LAB."""
    return load_json(HEALTH_PATH, {"paused": False, "recent": []})


def pause_generation(reason: str) -> None:
    health = generation_health()
    health["paused"] = True
    health["pause_reason"] = reason
    health["paused_at"] = dt.datetime.now(dt.timezone.utc).isoformat()
    save_json(HEALTH_PATH, health)
    print("PAUSA DE SEGURIDAD: ", reason,
          "No se enviarán nuevas generaciones; los PNG existentes se conservan.")


def record_generation_outcome(number: str, outcome: str) -> None:
    """Protect quota: count terminal failures and ambiguous generation launches.

    A CLI exception can be a quota exhaustion even without an explicit 429.
    Count such ambiguous attempts as an operational fault; never retry them
    automatically, nor mark them as completed.
    """
    if outcome not in ("failed", "downloaded", "uncertain"):
        return
    health = generation_health()
    recent = list(health.get("recent", []))
    recent.append({"issue": str(number), "outcome": outcome,
                   "at": dt.datetime.now(dt.timezone.utc).isoformat()})
    health["recent"] = recent[-FAILURE_WINDOW:]
    failures = sum(x.get("outcome") == "failed" for x in health["recent"])
    uncertain = sum(x.get("outcome") == "uncertain" for x in health["recent"])
    if failures + uncertain >= FAILURE_THRESHOLD:
        health["paused"] = True
        if uncertain:
            health["pause_reason"] = (
                "NotebookLM: " + str(failures) + " fallos y " + str(uncertain)
                + " envíos inciertos en los últimos " + str(len(health["recent"]))
                + " intentos. Revisar cuota y conciliación."
            )
        else:
            health["pause_reason"] = (
                "NotebookLM devolvió " + str(failures) + " fallos en los últimos "
                + str(len(health["recent"])) + " intentos terminados."
            )
        health["paused_at"] = dt.datetime.now(dt.timezone.utc).isoformat()
    save_json(HEALTH_PATH, health)
    if health.get("paused"):
        print("PAUSA DE SEGURIDAD:", health.get("pause_reason"))

def show_generation_health() -> None:
    health = generation_health()
    print("Generación automática:",
          "PAUSADA" if health.get("paused") else "sin pausa de seguridad")
    if health.get("paused"):
        print("Motivo:", health.get("pause_reason") or "Sin detalle")
    recent = health.get("recent", [])
    print("Resultados recientes:", len(recent),
          "fallidos:", sum(x.get("outcome") == "failed" for x in recent),
          "inciertos:", sum(x.get("outcome") == "uncertain" for x in recent))


def resume_generations(args) -> None:
    if not args.confirm:
        raise ValueError("Debes confirmar la reanudación con --confirm.")
    check_identity()
    health = generation_health()
    health["paused"] = False
    health.pop("pause_reason", None)
    health.pop("paused_at", None)
    health["recent"] = []
    save_json(HEALTH_PATH, health)
    print("Pausa de seguridad restablecida. No se han reenviado trabajos existentes.")
    print("Las solicitudes failed, uncertain y deferred mantienen sus estados.")


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
    if message not in ALLOWED_COMMENTS:
        raise ValueError("Comentario GitHub no autorizado.")
    command(["gh", "issue", "comment", str(number), "-R", REPO, "--body", message])


def remote_comment_exists(number: str, message: str) -> bool:
    """Check before retrying a comment to avoid posting duplicated checks."""
    if message not in ALLOWED_COMMENTS:
        raise ValueError("Comentario GitHub no autorizado.")
    raw = command(["gh", "api",
                   f"repos/{REPO}/issues/{int(number)}/comments?per_page=100"])
    comments = json.loads(raw)
    if not isinstance(comments, list):
        raise RuntimeError("Respuesta de GitHub inesperada.")
    return any((c.get("user") or {}).get("login", "").lower() == OWNER
               and c.get("body") == message
               for c in comments if isinstance(c, dict))


def comment_or_queue(number: str, message: str, job: dict, state: dict) -> None:
    """Never block a downloaded PNG because its GitHub check cannot be posted."""
    if message not in ALLOWED_COMMENTS:
        raise ValueError("Comentario GitHub no autorizado.")
    try:
        issue_comment(number, message)
    except (RuntimeError, OSError, subprocess.TimeoutExpired) as exc:
        pending = job.setdefault("github_comments_pending", [])
        if message not in pending:
            pending.append(message)
            save_json(STATE_PATH, state)
        print(f"GitHub no confirmó el comentario de #{number}; "
              "se conservará y reintentará. ", type(exc).__name__)


def retry_github_comments(state: dict) -> None:
    """Restore public checkmarks idempotently when GitHub becomes available."""
    for number, job in state.items():
        pending = list(job.get("github_comments_pending", []))
        for message in pending:
            if message not in ALLOWED_COMMENTS:
                print("Comentario pendiente no reconocido; no se enviará.")
                continue
            try:
                if not remote_comment_exists(number, message):
                    issue_comment(number, message)
            except (RuntimeError, ValueError, OSError, subprocess.TimeoutExpired) as exc:
                print(f"No se pudo sincronizar el check de #{number}; "
                      "se volverá a intentar.", type(exc).__name__)
                break
            job["github_comments_pending"].remove(message)
            if not job["github_comments_pending"]:
                job.pop("github_comments_pending")
            save_json(STATE_PATH, state)


def github_issues():
    out = command(["gh", "issue", "list", "-R", REPO, "--state", "open",
                   "--limit", "1000", "--json", "number,title,body,author,state,createdAt"])
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


def generation_args(req: dict, notebook: str, sources: list[str]) -> list[str]:
    """The same constrained generator applies to first attempts and manual retries."""
    argv = ["nlm", "infographic", "create", notebook,
            "--orientation", "landscape", "--detail", "detailed",
            "--style", "editorial", "--language", "es-ES",
            "--focus", build_prompt(req), "--confirm"]
    if sources:
        argv.extend(["--source-ids", ",".join(sources)])
    return argv


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
    try:
        command(generation_args(req, notebook, sources), timeout=180)
    except NotebookLMQuotaError:
        job["phase"] = "uncertain"
        job["failure_kind"] = "quota"
        save_json(STATE_PATH, state)
        record_generation_outcome(number, "uncertain")
        pause_generation("Límite de uso detectado por NotebookLM.")
        print("Solicitud #", number, "incierta. No se reenvía automáticamente.")
        return True
    except Exception as exc:
        job["phase"] = "uncertain"
        job["failure_kind"] = "unclassified"
        save_json(STATE_PATH, state)
        record_generation_outcome(number, "uncertain")
        print("Solicitud incierta #", number, "- ", type(exc).__name__,
              ": revisar NotebookLM antes de continuar con este cuaderno.")
        return True
    job["phase"] = "submitted"
    save_json(STATE_PATH, state)
    comment_or_queue(number, SUBMITTED_COMMENT, job, state)
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
        record_generation_outcome(number, "failed")
        comment_or_queue(number, FAILED_COMMENT, job, state)
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
    record_generation_outcome(number, "downloaded")
    comment_or_queue(number, DOWNLOADED_COMMENT, job, state)
    print("Infografía disponible localmente:", path)


def queue_retry_failed(args):
    """One explicit opt-in queues a confirmed failed job, without generating yet."""
    check_identity()
    state = load_json(STATE_PATH, {})
    number = str(args.issue)
    job = state.get(number)
    if not job or job.get("phase") != "failed":
        raise ValueError("Solo puede repetirse una solicitud cuyo estado es failed.")
    if not job.get("artifact_id"):
        raise ValueError("No existe un artefacto fallido identificable; revisión manual.")
    if job.get("retry_requested"):
        print("El reintento ya está en cola para #", number)
        return
    job["retry_requested"] = True
    job["retry_queued_at"] = dt.datetime.now(dt.timezone.utc).isoformat()
    save_json(STATE_PATH, state)
    print("Reintento #", number, "PROGRAMADO. No se ha enviado todavía.")
    print("El agente lo ejecutará tras terminar cualquier solicitud activa,")
    print("comprobando que el artefacto anterior sigue fallido y sin duplicarlo.")


def launch_queued_retry(state: dict, config: dict) -> bool:
    """Start at most one explicitly queued retry, after existing work settles.

    The local lock surrounds the entire poll. The old artifact must still
    report failure; prior completed PNGs are never removed or overwritten.
    """
    for number, job in sorted(state.items(), key=lambda item: int(item[0])):
        if not job.get("retry_requested") or job.get("phase") != "failed":
            continue
        req = job.get("request") or {}
        mapping = select_mapping(config, req)
        if not mapping or mapping != (job.get("notebook"), job.get("source_ids")):
            print("Reintento #", number, "pendiente: asociación privada modificada.")
            return False
        notebook, sources = mapping
        if any(other is not job and other.get("notebook") == notebook
               and other.get("phase") in ("deferred", "uncertain", "launching", "submitted")
               for other in state.values()):
            print("Reintento #", number, "pendiente: el cuaderno tiene otro trabajo no conciliado.")
            return False
        rows = infographic_rows(notebook)
        old_id = job.get("artifact_id")
        old = next((row for row in rows if artifact_id(row) == old_id), None)
        status = status_text(old) if old else ""
        if not old or not (status == "4" or any(
                key in status for key in ("fail", "error", "cancel"))):
            # Never start a duplicate if NotebookLM changed the result.
            job.pop("retry_requested", None)
            job["retry_blocked"] = "El artefacto original ya no figura como fallido"
            save_json(STATE_PATH, state)
            print("Reintento #", number, "CANCELADO: el artefacto original")
            print("no consta inequívocamente como fallido. Revisión manual.")
            return False
        job.setdefault("past_attempts", []).append({
            "artifact_id": old_id,
            "phase": "failed",
            "retry_requested_at": job.get("retry_queued_at"),
        })
        job["before"] = [artifact_id(row) for row in rows if artifact_id(row)]
        job.pop("artifact_id", None)
        job.pop("retry_requested", None)
        job.pop("retry_queued_at", None)
        job.pop("retry_blocked", None)
        job["phase"] = "launching"
        save_json(STATE_PATH, state)
        try:
            command(generation_args(req, notebook, sources), timeout=180)
        except NotebookLMQuotaError:
            job["phase"] = "uncertain"
            job["failure_kind"] = "quota"
            save_json(STATE_PATH, state)
            record_generation_outcome(number, "uncertain")
            pause_generation("Límite de uso detectado durante un reintento.")
            print("Reintento #", number, "incierto; no se reenviará automáticamente.")
            return True
        except Exception as exc:
            job["phase"] = "uncertain"
            job["failure_kind"] = "unclassified"
            save_json(STATE_PATH, state)
            record_generation_outcome(number, "uncertain")
            print("Reintento #", number, "INCIERTO: ", type(exc).__name__,
                  "; no se reenviará automáticamente.")
            return True
        job["phase"] = "submitted"
        save_json(STATE_PATH, state)
        comment_or_queue(number, RETRY_COMMENT, job, state)
        print("Reintento confirmado en NotebookLM: #", number)
        return True
    return False


def reconcile_only() -> None:
    """Reconcile previously submitted Studio jobs without launching new work.

    Use after temporarily uninstalling the LaunchAgent to create a safe
    recovery window for blocked requests. This operation preserves all
    pending PNGs and never calls request_new or launch_queued_retry.
    """
    check_identity()
    state = load_json(STATE_PATH, {})
    for issue, job in list(state.items()):
        if job.get("phase") == "submitted":
            check_submitted(issue, job, state)
    retry_github_comments(state)
    still_active = [(number, job) for number, job in state.items()
                    if job.get("phase") in ("submitted", "launching")]
    if still_active:
        print("Generaciones activas:", len(still_active))
        for number, job in sorted(still_active, key=lambda x: int(x[0])):
            print("#" + number, job.get("request", {}).get("book", "desconocido"),
                  job.get("phase"))
        print("No se ha iniciado ninguna nueva generación. "
              "Repite reconcile-only cuando Studio termine.")
    else:
        print("No hay generaciones activas. "
              "Puedes recuperar una solicitud bloqueada de forma individual.")
    print("No se han reenviado solicitudes ni borrado archivos.")


# Explicit project hold: never submit this request during recovery.
# The normal unattended poll is quarantined while failed jobs still exist.
RECOVERY_HELD_ISSUES = frozenset({"201"})


def safe_queue_candidate(state: dict, config: dict, books: set[str],
                         extra_held: set[str] | None = None):
    """Find ONE independent request; never read Studio or modify local state.

    An explicitly allowed book is insufficient if its notebook has prior
    failed, uncertain or deferred work. Skip those notebooks entirely.
    """
    if not books:
        raise ValueError("Indica al menos un --book para la prueba controlada.")
    for book in books:
        find_item(book, None)
    health = generation_health()
    if health.get("paused"):
        print("PAUSA DE SEGURIDAD: no se despacharán solicitudes.")
        return None
    if any(job.get("phase") in ("submitted", "launching")
           for job in state.values()):
        print("Hay trabajos activos; no se inicia ni se propone otro.")
        return None
    quarantined = [job for job in state.values()
                   if job.get("phase") in ("failed", "uncertain", "deferred")]
    if any(not job.get("notebook") for job in quarantined):
        print("Estado sin cuaderno identificado: no es seguro continuar.")
        return None
    if any(job.get("retry_requested") for job in state.values()):
        print("Hay reintentos pendientes: conciliar antes de la ejecución controlada.")
        return None
    blocked_notebooks = {job["notebook"] for job in quarantined}
    held = RECOVERY_HELD_ISSUES | (extra_held or set())
    for number, req in next_requests(state, config):
        if number in held or req["book"] not in books:
            continue
        mapping = select_mapping(config, req)
        if mapping is None or mapping[0] in blocked_notebooks:
            continue
        # The real submitter rechecks GitHub comments and snapshots Studio.
        return number, req
    return None


def explain_safe_queue(state: dict, config: dict, books: set[str],
                       extra_held: set[str] | None = None) -> None:
    """Explain queue exclusions without exposing private notebook/source IDs.

    This is a local read-only audit, even when --execute was requested.
    It never resets the generation epoch, remaps sources, or retries jobs.
    """
    import collections
    counts = {book: collections.Counter() for book in sorted(books)}
    held = RECOVERY_HELD_ISSUES | (extra_held or set())
    bad_notebooks = {job.get("notebook") for job in state.values()
                     if job.get("phase") in ("failed", "uncertain", "deferred")}
    active = sum(job.get("phase") in ("submitted", "launching")
                 for job in state.values())
    queued_retries = sum(bool(job.get("retry_requested")) for job in state.values())
    health = generation_health()
    activated_raw = config.get("activated_at")
    try:
        activated = dt.datetime.fromisoformat(activated_raw.replace("Z", "+00:00"))
    except (AttributeError, TypeError, ValueError):
        activated = None
    if activated is not None:
        print("Fecha de activación local:", activated.isoformat())
    else:
        print("Sin fecha de activación local válida: cola detenida.")
    print("Bloqueos globales: pausa=", bool(health.get("paused")),
          "| activos=", active, "| reintentos programados=", queued_retries,
          "| cuadernos en cuarentena=", len(bad_notebooks))
    for issue in github_issues():
        number = str(issue.get("number", ""))
        # Never parse unrelated public issues for diagnostic purposes.
        if not issue.get("title", "").startswith("[NLM] "):
            continue
        try:
            req = parse_request(issue)
        except (ValueError, KeyError, TypeError):
            req = None
        if req is None or req["book"] not in books:
            continue
        c = counts[req["book"]]
        c["total"] += 1
        if number in state:
            phase = str(state[number].get("phase", "unknown"))
            c["local-" + phase] += 1
            continue
        if number in held:
            c["held"] += 1
            continue
        try:
            opened = dt.datetime.fromisoformat(issue["createdAt"].replace("Z", "+00:00"))
        except (KeyError, TypeError, ValueError):
            c["invalid-date"] += 1
            continue
        if activated is None or opened < activated:
            c["before-activation"] += 1
            continue
        mapping = select_mapping(config, req)
        if mapping is None:
            c["unmapped"] += 1
        elif mapping[0] in bad_notebooks:
            c["quarantined-notebook"] += 1
        elif active or queued_retries or health.get("paused"):
            c["global-hold"] += 1
        else:
            c["eligible"] += 1
    for book, c in counts.items():
        print(book + ": " +
              " | ".join(k + "=" + str(c[k]) for k in (
                  "total", "eligible", "unmapped", "before-activation",
                  "quarantined-notebook", "held", "global-hold",
                  "invalid-date") if c[k] or k == "total"))
        previous = {k[len("local-"):]: v for k, v in c.items()
                    if k.startswith("local-")}
        if previous:
            print("  Ya en estado local:", ", ".join(
                k + "=" + str(v) for k, v in sorted(previous.items())))
    if any(c["unmapped"] for c in counts.values()):
        print("Faltan asociaciones de fuentes. Consulta sin cambios: "
              "python3 scripts/notebooklm_map_catalog.py")
        if "conde-montecristo" in books:
            print("Para Montecristo, diagnosticar por tomo: "
                  "python3 scripts/notebooklm_source_mapper.py "
                  "--book conde-montecristo --volume tomo-i")
    if any(c["before-activation"] for c in counts.values()):
        print("Hay solicitudes anteriores a la activación: NO cambiar "
              "activated_at ni reinicializar; requieren adopción auditada.")
    print("Diagnóstico finalizado. No se han enviado ni modificado trabajos.")


def safe_poll(args) -> None:
    """Manual one-shot recovery. Without --execute: pure queue preview."""
    check_identity()
    state = load_json(STATE_PATH, {})
    config = private_config()
    candidate = safe_queue_candidate(
        state, config, set(args.book or []),
        {str(n) for n in (args.hold_issue or [])})
    if candidate is None:
        print("Sin solicitud apta para este conjunto de libros. No se ha enviado nada.")
        explain_safe_queue(state, config, set(args.book or []),
                           {str(n) for n in (args.hold_issue or [])})
        return
    if getattr(args, "diagnose", False):
        explain_safe_queue(state, config, set(args.book or []),
                           {str(n) for n in (args.hold_issue or [])})
    number, req = candidate
    print("Solicitud elegible:", "#" + number, "| Libro:", req["book"])
    print("Retención obligatoria: #201. Cuadernos fallidos/inciertos excluidos.")
    if not args.execute:
        print("SOLO PREVISUALIZACIÓN. Para una única generación: añade --execute.")
        return
    # Single request; preserves the existing Studio/GitHub deduplication and
    # the same five-result circuit breaker as the unattended agent.
    if not request_new(number, req, state, config):
        print("Solicitud no enviada: asignación privada no válida o incompleta.")


def poll():
    check_identity()
    config = private_config()
    state = load_json(STATE_PATH, {})
    for issue, job in list(state.items()):
        if job.get("phase") == "submitted":
            check_submitted(issue, job, state)
    # A macOS LaunchAgent is not guaranteed TCC access to ~/Desktop.
    # Keep automatic downloads in ~/Pictures; export JPGs to Desktop manually
    # from an interactive Terminal using notebooklm_export_desktop.py.
    # Sync any GitHub confirmation that was temporarily lost to network/auth.
    retry_github_comments(state)
    # Polling previously submitted jobs and downloading their PNGs is safe
    # even while paused. Never launch another request until explicitly resumed.
    health = generation_health()
    if health.get("paused"):
        print("PAUSA DE SEGURIDAD:", health.get("pause_reason") or "sin detalle")
        print("No se iniciarán nuevas generaciones. Consultar: health")
        return
    # A submitted or launching request can still be generating remotely:
    # preserve the single-active-request rule across all notebooks.
    globally_active = sum(j.get("phase") in ("submitted", "launching")
                          for j in state.values())
    if globally_active:
        print("Generaciones enviadas o en lanzamiento:", globally_active,
              "(no se enviarán otras automáticamente)")
        return
    # A prior CLI timeout can leave an *uncertain* request even when no
    # generation was confirmed. Quarantine only its own notebook, just as
    # deferred requests do. Never assign late artifacts to another request
    # in that notebook. The other independent notebooks may safely continue.
    quarantined = [j for j in state.values()
                   if j.get("phase") in ("uncertain", "deferred")]
    if any(not j.get("notebook") for j in quarantined):
        print("Solicitud incierta sin cuaderno identificado: "
              "se detiene la cola para evitar duplicados.")
        return
    blocked_notebooks = {j["notebook"] for j in quarantined}
    # A history of failed generations requires explicitly whitelisted,
    # one-shot manual dispatch. Never let a restarted LaunchAgent submit #201
    # or consume the next quota unit while diagnostic review is outstanding.
    if any(j.get("phase") == "failed" for j in state.values()):
        print("CUARENTENA DE GENERACIÓN: existen fallos confirmados.")
        print("Usa poll-safe con --book y --execute para un único trabajo independiente.")
        return
    # An explicitly queued failed-job retry is validated against the same
    # notebook isolation rules before any attempt is sent.
    if launch_queued_retry(state, config):
        return
    for number, req in next_requests(state, config):
        if number in RECOVERY_HELD_ISSUES:
            print("Solicitud #", number, "retenida expresamente; se pasa a la siguiente.")
            continue
        mapping = select_mapping(config, req)
        if mapping and mapping[0] in blocked_notebooks:
            print("Solicitud #", number,
                  "omitida temporalmente: cuaderno con trabajo incierto "
                  "o aplazado. Continuando con otros cuadernos.")
            continue
        if request_new(number, req, state, config):
            break


def blocked_jobs(args) -> None:
    """Summarize unfinished requests without exposing private notebook IDs."""
    state = load_json(STATE_PATH, {})
    blocked = [(n, j) for n, j in sorted(state.items(), key=lambda x: int(x[0]))
               if j.get("phase") in ("uncertain", "deferred")]
    print("Cuadernos bloqueados (uncertain/deferred):",
          len({j.get("notebook") for _, j in blocked}))
    print("Solicitudes sin conciliar:", len(blocked))
    for number, job in blocked:
        print("#" + number, job.get("request", {}).get("book", "desconocido"),
              job.get("phase"),
              job.get("failure_kind") or job.get("reason") or "sin causa clasificada")
    print("Estos estados impiden avanzar solo en sus cuadernos.")
    print("Para consultar candidatos remotos sin reenviar: audit-blocked --issue N")


def remote_artifact_delta(job: dict) -> tuple[list[dict], list[dict]]:
    """Return a verifiable Studio snapshot and its newly observed artifacts.

    If old artifacts have disappeared from the bounded Studio result, a
    negative result cannot be trusted. Fail closed rather than duplicate.
    """
    if "before" not in job or not isinstance(job["before"], list):
        raise ValueError("No existe una instantánea anterior fiable; revisión manual.")
    before = set(job["before"])
    if len(before) != len(job["before"]) or not all(
            isinstance(x, str) and VALID_ID.fullmatch(x) for x in before):
        raise ValueError("Instantánea anterior incompleta o inválida.")
    if not job.get("notebook"):
        raise ValueError("Cuaderno privado no identificado.")
    rows = infographic_rows(job["notebook"])
    current = {artifact_id(x) for x in rows if artifact_id(x)}
    if not before.issubset(current):
        raise RuntimeError("Studio no muestra todos los artefactos de la "
                           "instantánea anterior. No es seguro descartar duplicados.")
    return rows, [x for x in rows if artifact_id(x) not in before and artifact_id(x)]


def audit_blocked(args) -> None:
    """Read-only remote check; neither launches nor modifies any request."""
    state = load_json(STATE_PATH, {})
    number = str(args.issue)
    job = state.get(number)
    if not job or job.get("phase") not in ("uncertain", "deferred"):
        raise ValueError("La solicitud no está en estado uncertain o deferred.")
    rows, created = remote_artifact_delta(job)
    print("Solicitud #", number, "Estado:", job["phase"],
          "Libro:", job.get("request", {}).get("book", "desconocido"))
    print("Infografías visibles en Studio:", len(rows))
    print("Artefactos posteriores a la instantánea:", len(created))
    for row in created:
        print("Estado del artefacto candidato:", status_text(row))
    if created:
        print("NO reenviar. Revisar Studio y utilizar attach si hay un candidato inequívoco.")
    else:
        print("Sin candidatos visibles. La ausencia no demuestra que "
              "NotebookLM no pueda finalizar tarde la solicitud.")
        print("La recuperación exige confirmación explícita y comprobación de cuota.")


def safe_studio_failure_detail(row: dict) -> tuple[str, str]:
    """Select error-only metadata and redact sensitive paths/addresses/URLs.

    No notebook ID, artifact ID, source names or prompt are surfaced. A
    generic status=4 alone cannot reveal the underlying cause.
    """
    for key in ("error_message", "failure_reason", "error", "reason", "error_code"):
        value = row.get(key)
        if isinstance(value, dict):
            value = next((value[k] for k in ("message", "reason", "code")
                          if isinstance(value.get(k), (str, int))), None)
        if not isinstance(value, (str, int)) or not str(value).strip():
            continue
        detail = " ".join(str(value).split())
        detail = re.sub(r"https?://\S+", "[enlace privado]", detail)
        detail = re.sub(r"/Users/[^\s]+", "[ruta privada]", detail)
        detail = re.sub(r"[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}", "[correo privado]", detail)
        detail = re.sub(r"\b[0-9a-fA-F]{8}-(?:[0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}\b",
                        "[identificador privado]", detail)
        return key, detail[:240]
    return "", ""


def diagnose_failed(args) -> None:
    """Read-only classification of a Studio failure, without triggering retries."""
    state = load_json(STATE_PATH, {})
    number = str(args.issue)
    job = state.get(number)
    if not job or job.get("phase") != "failed":
        raise ValueError("Solo se diagnostican solicitudes en estado failed.")
    aid = job.get("artifact_id")
    if not aid:
        print("Solicitud #", number, "failed: sin artefacto identificable.")
        print("No repetir ni atribuir una causa sin inspección manual de Studio.")
        return
    rows = infographic_rows(job["notebook"])
    row = next((x for x in rows if artifact_id(x) == aid), None)
    if row is None:
        print("Solicitud #", number, "failed: el artefacto no aparece en Studio.")
        print("No se puede concluir la causa; no se ha reenviado nada.")
        return
    print("Solicitud #", number, "Libro:",
          job.get("request", {}).get("book", "desconocido"))
    print("Estado de Studio:", status_text(row))
    key, detail = safe_studio_failure_detail(row)
    if detail:
        print("Campo de error:", key)
        print("Detalle comunicado por Studio:", detail)
    else:
        print("Studio no proporciona un motivo de fallo específico "
              "en los campos de error conocidos.")
        print("No es posible determinar aquí si fue cuota, fuentes o fallo interno.")
    print("Consulta de solo lectura; no se ha reintentado ni modificado el estado.")


def recover_blocked(args) -> None:
    """Explicit, single-request recovery after a remote-negative check.

    No retries are made automatically. This never treats a missing remote
    artifact as proof that the original request definitively failed.
    """
    if not (args.confirm_no_artifact and args.confirm_quota_restored):
        raise ValueError("Son obligatorias --confirm-no-artifact "
                         "y --confirm-quota-restored.")
    check_identity()
    if generation_health().get("paused"):
        raise RuntimeError("La protección está pausada. Revisar health antes de recuperar.")
    state = load_json(STATE_PATH, {})
    number = str(args.issue)
    job = state.get(number)
    if not job or job.get("phase") not in ("uncertain", "deferred"):
        raise ValueError("Solo pueden recuperarse solicitudes uncertain/deferred.")
    if any(other is not job and other.get("phase") in ("submitted", "launching")
           for other in state.values()):
        raise RuntimeError("Existe una generación activa. No se inicia otra.")
    if any(other is not job and other.get("notebook") == job.get("notebook")
           and other.get("phase") in ("uncertain", "deferred", "submitted", "launching")
           for other in state.values()):
        raise RuntimeError("El mismo cuaderno tiene otra solicitud sin conciliar.")
    config = private_config()
    mapping = select_mapping(config, job.get("request", {}))
    if not mapping or mapping != (job.get("notebook"), job.get("source_ids")):
        raise RuntimeError("La asignación privada de cuaderno/fuentes ha cambiado.")
    # GitHub's trusted submission comment is independent evidence: never
    # re-send when the original may already have been launched.
    if submitted_comment_exists(number):
        raise RuntimeError("GitHub confirma un envío anterior. Revisión manual "
                           "del artefacto antes de cualquier reintento.")
    rows, created = remote_artifact_delta(job)
    if created:
        raise RuntimeError("Studio contiene nuevos artefactos; no se reenvía. "
                           "Utiliza audit-blocked y attach tras identificarlo.")
    job.setdefault("past_attempts", []).append({
        "phase": job["phase"],
        "reason": job.get("failure_kind") or job.get("reason") or "unknown",
        "recovered_at": dt.datetime.now(dt.timezone.utc).isoformat(),
    })
    job["before"] = [artifact_id(x) for x in rows if artifact_id(x)]
    job.pop("artifact_id", None)
    job["recovery_count"] = int(job.get("recovery_count", 0)) + 1
    job["phase"] = "launching"
    save_json(STATE_PATH, state)
    notebook, sources = mapping
    try:
        command(generation_args(job["request"], notebook, sources), timeout=180)
    except NotebookLMQuotaError:
        job["phase"] = "uncertain"
        job["failure_kind"] = "quota"
        save_json(STATE_PATH, state)
        record_generation_outcome(number, "uncertain")
        pause_generation("NotebookLM mantiene el límite de uso; "
                         "recuperación detenida.")
        print("Recuperación #", number,
              "incierta por cuota; no se repetirá automáticamente.")
        return
    except Exception as exc:
        job["phase"] = "uncertain"
        job["failure_kind"] = "unclassified"
        save_json(STATE_PATH, state)
        record_generation_outcome(number, "uncertain")
        print("Recuperación #", number,
              "incierta:", type(exc).__name__, "; no se repetirá automáticamente.")
        return
    job["phase"] = "submitted"
    save_json(STATE_PATH, state)
    comment_or_queue(number, SUBMITTED_COMMENT, job, state)
    print("Recuperación solicitada a NotebookLM: #", number)
    print("El agente descargará el resultado cuando Studio confirme el artefacto.")


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
        phase = "retry-queued" if job.get("retry_requested") else job["phase"]
        print("#" + issue, job["request"]["book"], phase,
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
    comment_or_queue(str(args.issue), PUBLISH_COMMENT, job, state)
    print("Pull request preparado:", pr.strip())


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)
    sub.add_parser("init", help="Activar el puente desde este momento; sin importar incidencias antiguas")
    sub.add_parser("doctor", help="Diagnosticar herramientas y conexiones, sin revelar IDs privados")
    sub.add_parser("poll", help="Procesar una solicitud y comprobar las anteriores")
    safe = sub.add_parser("poll-safe",
                          help="Previsualizar o enviar UNA solicitud de un libro independiente")
    safe.add_argument("--book", action="append", required=True,
                      help="Slug de libro permitido; se puede repetir")
    safe.add_argument("--hold-issue", action="append", type=int, default=[],
                      help="Incidencia adicional que no se debe enviar")
    safe.add_argument("--execute", action="store_true",
                      help="Autorizar una sola generación; sin esto es dry-run")
    safe.add_argument("--diagnose", action="store_true",
                      help="Desglosar exclusiones por libro, sin generar nada")
    sub.add_parser("reconcile-only", help="Conciliar envíos previos sin generar trabajos nuevos")
    sub.add_parser("status", help="Consultar trabajos locales sin enviar información privada")
    sub.add_parser("health", help="Consultar la pausa y últimos resultados sin datos privados")
    sub.add_parser("blocked", help="Listar cuadernos bloqueados, sin datos privados")
    diagnose = sub.add_parser("diagnose-failed",
                              help="Leer motivo remoto de fallo sin reenviar nada")
    diagnose.add_argument("--issue", type=int, required=True)
    audit = sub.add_parser("audit-blocked",
                           help="Comprobar artefactos de una solicitud incierta sin reenviar")
    audit.add_argument("--issue", type=int, required=True)
    recovery = sub.add_parser("recover-blocked",
                              help="Recuperación manual y verificada de una solicitud bloqueada")
    recovery.add_argument("--issue", type=int, required=True)
    recovery.add_argument("--confirm-no-artifact", action="store_true")
    recovery.add_argument("--confirm-quota-restored", action="store_true")
    resume = sub.add_parser("resume-generations",
                            help="Reanudar tras revisar la causa de la pausa de seguridad")
    resume.add_argument("--confirm", action="store_true")
    rf = sub.add_parser("retry-failed",
                        help="Programar una repetición explícita de un fallo confirmado, sin duplicar")
    rf.add_argument("--issue", type=int, required=True)
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
    mutating = {"init", "map-book", "map-episode", "poll", "poll-safe", "reconcile-only", "attach", "defer-uncertain", "quarantine-remote", "publish", "retry-failed", "resume-generations", "recover-blocked"}
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
        elif args.command == "poll-safe":
            safe_poll(args)
        elif args.command == "reconcile-only":
            reconcile_only()
        elif args.command == "status":
            show_status()
        elif args.command == "health":
            show_generation_health()
        elif args.command == "blocked":
            blocked_jobs(args)
        elif args.command == "diagnose-failed":
            diagnose_failed(args)
        elif args.command == "audit-blocked":
            audit_blocked(args)
        elif args.command == "recover-blocked":
            recover_blocked(args)
        elif args.command == "resume-generations":
            resume_generations(args)
        elif args.command == "retry-failed":
            queue_retry_failed(args)
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
