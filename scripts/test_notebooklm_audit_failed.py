#!/usr/bin/env python3
"""Regresiones del preflight NotebookLM; las pruebas no contactan NotebookLM."""
from __future__ import annotations

import json
import unittest
from unittest.mock import patch

import notebooklm_audit_failed as audit


class SourceAuditTests(unittest.TestCase):
    def test_classifies_only_explicit_source_status(self):
        self.assertEqual(audit.source_status({"status": "FAILED"}), "failed")
        self.assertEqual(audit.source_status({"state": "COMPLETED"}), "ready")
        self.assertEqual(audit.source_status({"status": "PROCESSING"}), "processing")
        self.assertEqual(audit.source_status({"name": "Private file"}), "unknown")
        self.assertEqual(audit.source_status({"status": "mystery"}), "unknown")

    def test_mismatched_mapping_stops_without_cli(self):
        job = {"phase": "failed", "request": {"book": "test", "video_id": "youtube"},
               "notebook": "private-nb", "source_ids": ["private-old-id"]}
        with patch.object(audit, "load_json", return_value={"163": job}), \\
             patch.object(audit, "private_config", return_value={}), \\
             patch.object(audit, "select_mapping", return_value=("private-nb", ["new-id"])), \\
             patch.object(audit, "command") as cmd:
            result = audit.inspect_issue(163)
            self.assertEqual(result["result"], "mapping-changed")
            cmd.assert_not_called()

    def test_readonly_preflight_identifies_wrong_and_missing_sources(self):
        job = {"phase": "failed", "request": {"book": "psicologia-dinero", "video_id": "public-video"},
               "notebook": "private-notebook", "source_ids": ["source-1", "source-2", "source-3"],
               "artifact_id": "private-artifact"}
        rows = [{"id": "source-1", "title": "PDF 1", "status": "ready"},
                {"id": "source-2", "title": "PDF 2", "status": "failed"}]
        with patch.object(audit, "load_json", return_value={"178": job}), \\
             patch.object(audit, "private_config", return_value={}), \\
             patch.object(audit, "select_mapping", return_value=("private-notebook", job["source_ids"])), \\
             patch.object(audit, "find_item", return_value=({"slug": "psicologia-dinero"}, {"title": "Capitulo 1"})), \\
             patch.object(audit, "command", side_effect=["{}", json.dumps(rows)]) as cmd, \\
             patch.object(audit, "source_objects", side_effect=lambda data: json.loads(data)), \\
             patch.object(audit, "source_id", side_effect=lambda row: row["id"]), \\
             patch.object(audit, "scope_key", side_effect=lambda slug, title, source=False: ("chapter", 2) if title == "PDF 2" else ("chapter", 1)), \\
             patch.object(audit, "infographic_rows", return_value=[]):
            report = audit.inspect_issue(178)
        self.assertEqual(report["result"], "inspected")
        self.assertEqual(report["missing_sources"], 1)
        self.assertEqual(report["semantic_mismatches"], 1)
        self.assertEqual(report["source_status"]["failed"], 1)
        self.assertEqual(report["studio_artifact"], "not-visible")
        self.assertEqual(len(cmd.call_args_list), 2)
        self.assertEqual(cmd.call_args_list[0].args[0][:3], ["nlm", "notebook", "get"])
        self.assertEqual(cmd.call_args_list[1].args[0][:3], ["nlm", "source", "list"])
        public = audit.format_report(report)
        for private in ["private-notebook", "source-1", "source-2", "PDF 1", "PDF 2"]:
            self.assertNotIn(private, public)
        self.assertIn("ALERTA", public)

    def test_nonfailed_jobs_never_touched(self):
        with patch.object(audit, "load_json", return_value={"201": {"phase": "submitted"}}), \\
             patch.object(audit, "command") as cmd:
            report = audit.inspect_issue(201)
        self.assertEqual(report["result"], "not-failed")
        cmd.assert_not_called()

    def test_unavailable_notebook_redacts_error(self):
        job = {"phase": "failed", "request": {"book": "test", "video_id": "test-video"},
               "notebook": "private-notebook", "source_ids": ["private-source"]}
        with patch.object(audit, "load_json", return_value={"163": job}), \\
             patch.object(audit, "private_config", return_value={}), \\
             patch.object(audit, "select_mapping", return_value=("private-notebook", ["private-source"])), \\
             patch.object(audit, "find_item", return_value=({"slug": "test"}, {"title": "A"})), \\
             patch.object(audit, "command", side_effect=RuntimeError("private-source auth failure")):
            report = audit.inspect_issue(163)
        msg = audit.format_report(report)
        self.assertNotIn("private-source", msg)
        self.assertIn("RuntimeError", msg)


if __name__ == "__main__":
    unittest.main()
