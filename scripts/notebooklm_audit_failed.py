#!/usr/bin/env python3
"""Audita trabajos NotebookLM fallidos desde el Mac, en modo solo lectura.

Solo muestra recuentos y correspondencias. No expone IDs ni títulos de fuentes,
cuadernos, rutas privadas o artefactos. No modifica cola ni genera infografías.
"""
from __future__ import annotations

import argparse
import sys

from notebooklm_bridge import (
    STATE_PATH, artifact_id, command, infographic_rows, load_json,
    private_config, safe_studio_failure_detail, select_mapping, status_text,
)
from notebooklm_infografias import find_item
from notebooklm_map_catalog import chapter_key
from notebooklm_source_mapper import (
    chapter_interval, source_id, source_objects, source_scope, source_title,
)


def source_status(row: dict) -> str:
    """Solo clasifica estados explícitos; los desconocidos siguen desconocidos."""
    raw = row.get("status", row.get("state"))
    if isinstance(raw, dict):
        raw = raw.get("status", raw.get("state"))
    if raw is None:
        return "unknown"
    status = str(raw).strip().lower()
    if status == "4" or any(x in status for x in ("fail", "error", "cancel", "reject")):
        return "failed"
    if any(x in status for x in ("processing", "upload", "pend", "creat")):
        return "processing"
    if status == "3" or any(x in status for x in ("ready", "complet", "success", "finish")):
        return "ready"
    return "unknown"


def scope_key(slug: str, title: str, source: bool = False):
    if slug == "conde-montecristo":
        return chapter_interval(title) if not source else source_scope(title)
    return chapter_key(slug, title, source=source)


def inspect_issue(number: int) -> dict:
    """Consulta estado local y metadatos de NotebookLM sin modificar ninguno."""
    job = load_json(STATE_PATH, {}).get(str(number))
    if not isinstance(job, dict):
        return {"issue": number, "result": "missing-local-state"}
    if job.get("phase") != "failed":
        return {"issue": number, "result": "not-failed", "phase": str(job.get("phase", "unknown"))}
    req = job.get("request")
    if not isinstance(req, dict) or not req.get("video_id"):
        return {"issue": number, "result": "invalid-episode-request"}
    mapping = select_mapping(private_config(), req)
    if mapping is None or mapping[0] != job.get("notebook") or mapping[1] != job.get("source_ids"):
        return {"issue": number, "result": "mapping-changed"}
    notebook, requested = mapping
    if not requested or len(requested) != len(set(requested)):
        return {"issue": number, "result": "invalid-source-selection"}
    try:
        book, chapter = find_item(req["book"], req["video_id"])
        if chapter is None:
            return {"issue": number, "result": "catalog-entry-missing"}
        command(["nlm", "notebook", "get", notebook], timeout=120)
        sources = source_objects(command(["nlm", "source", "list", notebook, "--json"], timeout=120))
    except Exception as exc:
        # Nunca mostrar stderr crudo: podría contener IDs o nombres privados.
        return {"issue": number, "result": "notebook-or-sources-unavailable", "error_type": type(exc).__name__}
    indexed = {sid: row for row in sources if (sid := source_id(row))}
    present = [indexed[sid] for sid in requested if sid in indexed]
    expected = scope_key(req["book"], chapter["title"])
    found_scope = [scope_key(req["book"], source_title(row), source=True) for row in present]
    matched = sum(expected is not None and key == expected for key in found_scope)
    mismatched = sum(expected is not None and key is not None and key != expected for key in found_scope)
    status_counts = {k: sum(source_status(row) == k for row in present)
                     for k in ("ready", "processing", "failed", "unknown")}
    out = {"issue": number, "result": "inspected", "book": book["slug"],
           "requested_sources": len(requested), "present_sources": len(present),
           "missing_sources": len(requested) - len(present),
           "semantic_matches": matched, "semantic_mismatches": mismatched,
           "semantic_unknown": len(present) - matched - mismatched,
           "source_status": status_counts}
    try:
        rows = infographic_rows(notebook)
        target = next((row for row in rows if artifact_id(row) == job.get("artifact_id")), None)
        if target is None:
            out["studio_artifact"] = "not-visible"
        else:
            out["studio_artifact"] = "visible"
            out["studio_status"] = source_status({"status": status_text(target)})
            out["studio_error_detail"] = bool(safe_studio_failure_detail(target)[1])
    except Exception as exc:
        out["studio_artifact"] = "unavailable"
        out["studio_error_type"] = type(exc).__name__
    return out


def format_report(report: dict) -> str:
    n, kind = report["issue"], report["result"]
    if kind != "inspected":
        return f"#{n}: {kind}" + (f" ({report['error_type']})" if "error_type" in report else "")
    lines = [f"#{n} · {report['book']} · diagnóstico de solo lectura",
             f"Fuentes asignadas: {report['requested_sources']} | presentes: {report['present_sources']} | ausentes: {report['missing_sources']}",
             f"Correspondencia con capítulo: {report['semantic_matches']} compatibles, {report['semantic_mismatches']} incompatibles, {report['semantic_unknown']} sin clasificación inequívoca",
             "Estado de fuentes: " + ", ".join(f"{k}={v}" for k, v in report["source_status"].items()),
             "Artefacto Studio: " + report.get("studio_artifact", "no consultado")]
    if report.get("studio_artifact") == "visible":
        lines.append("Estado Studio: " + report.get("studio_status", "unknown") +
                     " | motivo detallado: " + ("sí" if report.get("studio_error_detail") else "no"))
    if report["missing_sources"] or report["semantic_mismatches"] or report["source_status"]["failed"]:
        lines.append("ALERTA: investigar asignación, disponibilidad o procesamiento antes de repetir.")
    else:
        lines.append("Sin incompatibilidad demostrada; esto NO prueba que la cuota ni la generación estén correctas.")
    lines.append("Ningún trabajo enviado, modificado o publicado.")
    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--issue", type=int, action="append", required=True)
    args = parser.parse_args()
    errors = False
    for number in args.issue:
        try:
            report = inspect_issue(number)
        except Exception as exc:
            report = {"issue": number, "result": "preflight-error",
                      "error_type": type(exc).__name__}
        print(format_report(report))
        print()
        if (report["result"] != "inspected" or report.get("missing_sources")
                or report.get("semantic_mismatches")
                or report.get("source_status", {}).get("failed")):
            errors = True
    return int(errors)


if __name__ == "__main__":
    sys.exit(main())
