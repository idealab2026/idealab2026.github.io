#!/usr/bin/env python3
"""Install/remove a per-user macOS LaunchAgent to poll approved GitHub requests.

No sudo, ports, HTTP server, GitHub Actions self-hosted runner, or credentials
in this launch agent. Only works while the Mac is awake and the user is logged in.
"""
from __future__ import annotations

import argparse
import os
import plistlib
import subprocess
import sys
from pathlib import Path

NAME = "com.idealab.notebooklm-bridge"
ROOT = Path(__file__).resolve().parents[1]
TARGET = Path.home() / "Library/LaunchAgents" / (NAME + ".plist")
LOGS = Path.home() / "Library/Logs/IDEA-LAB"
DOMAIN = "gui/" + str(os.getuid())
PATH = ":".join(str(p) for p in (
    Path.home() / ".local/bin", Path.home() / ".cargo/bin",
    Path("/opt/homebrew/bin"), Path("/usr/local/bin"), Path("/usr/bin"), Path("/bin")))


def launchctl(*args):
    res = subprocess.run(["launchctl", *args], check=False,
                         text=True, capture_output=True)
    return res.returncode, (res.stdout + res.stderr).strip()


def agent_config(mode: str) -> dict:
    """Pure plist builder; reconcile-only NEVER requests a generation."""
    if mode not in ("poll", "reconcile-only"):
        raise ValueError("Modo de agente no permitido.")
    return {
        "Label": NAME,
        "ProgramArguments": [
            sys.executable, str(ROOT / "scripts/notebooklm_bridge.py"), mode
        ],
        "WorkingDirectory": str(ROOT),
        "EnvironmentVariables": {"PATH": PATH, "PYTHONUNBUFFERED": "1"},
        "RunAtLoad": True,
        "StartInterval": 180,
        "StandardOutPath": str(LOGS / "notebooklm-bridge.log"),
        "StandardErrorPath": str(LOGS / "notebooklm-bridge.err.log"),
    }


def install(mode: str = "poll"):
    if sys.platform != "darwin":
        raise SystemExit("Este instalador requiere macOS.")
    config = agent_config(mode)
    TARGET.parent.mkdir(parents=True, exist_ok=True)
    LOGS.mkdir(parents=True, exist_ok=True)
    launchctl("bootout", DOMAIN + "/" + NAME)
    with open(TARGET, "wb") as f:
        plistlib.dump(config, f)
    TARGET.chmod(0o600)
    rc, out = launchctl("bootstrap", DOMAIN, str(TARGET))
    if rc:
        raise SystemExit("No se pudo activar launchd: " + out)
    if mode == "reconcile-only":
        print("Agente seguro de conciliación instalado. Cada 3 minutos comprobará "
              "generaciones anteriores y descargará PNG terminados.")
        print("No generará nuevas infografías ni recuperará trabajos fallidos.")
    else:
        print("Agente local instalado. Consulta GitHub cada 3 minutos "
              "mientras el Mac esté despierto.")
    print("Archivo:", TARGET)
    print("Registros:", LOGS)


def remove():
    launchctl("bootout", DOMAIN + "/" + NAME)
    TARGET.unlink(missing_ok=True)
    print("Agente desactivado. No se han borrado las credenciales ni los PNG pendientes.")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=["install", "install-reconcile", "remove"])
    args = parser.parse_args()
    if args.action == "install":
        install()
    elif args.action == "install-reconcile":
        install("reconcile-only")
    else:
        remove()


if __name__ == "__main__":
    main()
