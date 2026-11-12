#!/usr/bin/env python3
"""Security and routing checks for the local NotebookLM issue bridge (offline)."""
from __future__ import annotations

import datetime as dt
import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parent))
import notebooklm_bridge as bridge  # noqa: E402

BOOK = "conde-montecristo"
CATALOG = json.loads((bridge.ROOT / "biblioteca-montecristo/catalogo.json").read_text(encoding="utf-8"))
VIDEO = next(b for b in CATALOG["books"] if b["slug"] == BOOK)["chapters"][0]["id"]


def issue(payload, author="idealab2026"):
    return {"number": 5, "title": "[NLM] Infografía pública",
            "state": "OPEN", "author": {"login": author},
            "body": "<!-- " + bridge.MARK + "\n" + json.dumps(payload) + "\n-->"}


def request(book=BOOK, vid=None, vol=None):
    return {"version": 1, "action": "infographic", "book": book,
            "video_id": vid, "volume": vol}


class BridgeTests(unittest.TestCase):
    def setUp(self):
        # Tests must never change a real Mac's quota/circuit-breaker state.
        health_tmp = tempfile.TemporaryDirectory()
        self.addCleanup(health_tmp.cleanup)
        health_patch = patch.object(bridge, "HEALTH_PATH",
                                   Path(health_tmp.name) / "health.json")
        health_patch.start()
        self.addCleanup(health_patch.stop)

    def test_valid_book_request(self):
        self.assertEqual(bridge.parse_request(issue(request())), request())

    def test_wrong_author_is_rejected(self):
        self.assertIsNone(bridge.parse_request(issue(request(), author="attacker")))

    def test_unrecognized_action_and_fields_are_rejected(self):
        altered = request()
        altered["action"] = "run-shell"
        self.assertIsNone(bridge.parse_request(issue(altered)))
        altered = request()
        altered["shell"] = "echo data"
        self.assertIsNone(bridge.parse_request(issue(altered)))

    def test_video_and_volume_must_not_coexist(self):
        self.assertIsNone(bridge.parse_request(issue(request(vid=VIDEO, vol="tomo-i"))))
        self.assertIsNone(bridge.parse_request(issue(request(vid="abcdefghijk"))))

    def test_strict_public_body(self):
        row = issue(request())
        row["body"] = "Prefix\n" + row["body"]
        self.assertIsNone(bridge.parse_request(row))

    def test_unknown_and_private_slugs_rejected(self):
        self.assertIsNone(bridge.parse_request(issue(request(book="my-secret-project"))))

    def test_private_mapping_must_exist(self):
        cfg = {"books": {BOOK: {"notebooks": {"tomo-i": "uuid-123456789"},
                                "episodes": {VIDEO: {
                                  "notebook": "uuid-123456789",
                                  "sources": ["sourceid123"]}}}}}
        self.assertIsNone(bridge.select_mapping(cfg, request()))
        self.assertEqual(bridge.select_mapping(cfg, request(vol="tomo-i")),
                         ("uuid-123456789", []))
        self.assertEqual(bridge.select_mapping(cfg, request(vid=VIDEO)),
                         ("uuid-123456789", ["sourceid123"]))
        del cfg["books"][BOOK]["episodes"][VIDEO]
        self.assertIsNone(bridge.select_mapping(cfg, request(vid=VIDEO)))

    def test_queue_orders_oldest_issue_first(self):
        newest = issue(request())
        newest["number"] = 51
        newest["createdAt"] = "2026-11-09T12:00:00Z"
        oldest = issue(request())
        oldest["number"] = 32
        oldest["createdAt"] = "2026-11-09T11:00:00Z"
        with patch.object(bridge, "command", return_value=json.dumps([newest, oldest])):
            listed = bridge.github_issues()
        self.assertEqual([x["number"] for x in listed], [32, 51])

    def test_job_epoch_rejects_old_issues(self):
        now = dt.datetime.now(dt.timezone.utc)
        fresh = issue(request())
        fresh["createdAt"] = (now + dt.timedelta(minutes=1)).isoformat()
        old = issue(request())
        old["number"] = 4
        old["createdAt"] = (now - dt.timedelta(minutes=1)).isoformat()
        with patch.object(bridge, "github_issues", return_value=[old, fresh]):
            out = list(bridge.next_requests({}, {"activated_at": now.isoformat()}))
        self.assertEqual([n for n, _ in out], ["5"])

    def test_defer_uncertain_rejects_new_artifacts(self):
        import argparse
        state = {"41": {"phase": "uncertain", "notebook": "notebook-123",
                        "before": ["existing-000"]}}
        args = argparse.Namespace(issue=41, confirm_no_artifact=True)
        with patch.object(bridge, "check_identity"), \
             patch.object(bridge, "load_json", return_value=state), \
             patch.object(bridge, "save_json") as save, \
             patch.object(bridge, "infographic_rows", return_value=[{"id": "newart-12345"}]):
            with self.assertRaises(RuntimeError):
                bridge.defer_uncertain(args)
            save.assert_not_called()
        self.assertEqual(state["41"]["phase"], "uncertain")

    def test_defer_uncertain_requires_approval_and_preserves_state(self):
        import argparse
        state = {"41": {"phase": "uncertain", "notebook": "notebook-123",
                        "before": ["existing-000"]}}
        with patch.object(bridge, "check_identity"), \
             patch.object(bridge, "load_json", return_value=state), \
             patch.object(bridge, "save_json") as save, \
             patch.object(bridge, "infographic_rows", return_value=[{"id": "existing-000"}]):
            with self.assertRaises(ValueError):
                bridge.defer_uncertain(argparse.Namespace(issue=41, confirm_no_artifact=False))
            save.assert_not_called()
            bridge.defer_uncertain(argparse.Namespace(issue=41, confirm_no_artifact=True))
            save.assert_called_once()
        self.assertEqual(state["41"]["phase"], "deferred")
        self.assertIsInstance(state["41"]["deferred_at"], str)

    def test_deferred_notebook_isolation_in_poll(self):
        work = {"41": {"phase": "deferred", "notebook": "notebook-II"}}
        pending = [("42", request(book=BOOK, vid=VIDEO)), ("63", request(book=BOOK, vid=VIDEO))]
        with patch.object(bridge, "check_identity"), \
             patch.object(bridge, "private_config", return_value={}), \
             patch.object(bridge, "load_json", return_value=work), \
             patch.object(bridge, "next_requests", return_value=pending), \
             patch.object(bridge, "select_mapping", side_effect=[
                 ("notebook-II", ["source-1"]), ("notebook-I", ["source-2"])]), \
             patch.object(bridge, "request_new", return_value=True) as dispatch:
            bridge.poll()
            dispatch.assert_called_once_with("63", pending[1][1], work, {})

    def test_uncertain_quarantines_only_its_notebook(self):
        state = {"115": {"phase": "uncertain", "notebook": "notebook-sapiens"}}
        pending = [("116", request(book=BOOK, vid=VIDEO)),
                   ("200", request(book=BOOK, vid=VIDEO))]
        with patch.object(bridge, "check_identity"), \
             patch.object(bridge, "private_config", return_value={}), \
             patch.object(bridge, "load_json", return_value=state), \
             patch.object(bridge, "retry_github_comments"), \
             patch.object(bridge, "next_requests", return_value=pending), \
             patch.object(bridge, "select_mapping", side_effect=[
                 ("notebook-sapiens", ["source-a"]),
                 ("notebook-independent", ["source-b"])]), \
             patch.object(bridge, "launch_queued_retry", return_value=False), \
             patch.object(bridge, "request_new", return_value=True) as dispatch:
            bridge.poll()
            dispatch.assert_called_once_with("200", pending[1][1], state, {})

    def test_submitted_still_blocks_all_concurrent_generation(self):
        state = {"106": {"phase": "submitted", "notebook": "notebook-active"}}
        with patch.object(bridge, "check_identity"), \
             patch.object(bridge, "private_config", return_value={}), \
             patch.object(bridge, "load_json", return_value=state), \
             patch.object(bridge, "check_submitted"), \
             patch.object(bridge, "retry_github_comments"), \
             patch.object(bridge, "launch_queued_retry") as retry, \
             patch.object(bridge, "next_requests") as pending:
            bridge.poll()
            retry.assert_not_called()
            pending.assert_not_called()

    def test_launching_still_blocks_all_concurrent_generation(self):
        state = {"106": {"phase": "launching", "notebook": "notebook-active"}}
        with patch.object(bridge, "check_identity"), \
             patch.object(bridge, "private_config", return_value={}), \
             patch.object(bridge, "load_json", return_value=state), \
             patch.object(bridge, "retry_github_comments"), \
             patch.object(bridge, "next_requests") as pending:
            bridge.poll()
            pending.assert_not_called()

    def test_uncertain_without_notebook_fails_closed(self):
        state = {"115": {"phase": "uncertain"}}
        with patch.object(bridge, "check_identity"), \
             patch.object(bridge, "private_config", return_value={}), \
             patch.object(bridge, "load_json", return_value=state), \
             patch.object(bridge, "retry_github_comments"), \
             patch.object(bridge, "launch_queued_retry") as retry, \
             patch.object(bridge, "next_requests") as pending:
            bridge.poll()
            retry.assert_not_called()
            pending.assert_not_called()

    def test_cli_uses_local_uv_bin_when_not_in_path(self):
        from unittest.mock import MagicMock
        local_nlm = bridge.HOME / ".local/bin/nlm"
        with patch.object(bridge.shutil, "which", return_value=None), \
             patch.object(bridge.Path, "is_file", return_value=True), \
             patch.object(bridge.os, "access", return_value=True), \
             patch.object(bridge.subprocess, "run") as runner:
            runner.return_value = MagicMock(returncode=0, stdout="ok")
            self.assertEqual(bridge.command(["nlm", "notebook", "list"]), "ok")
            self.assertEqual(runner.call_args.args[0][0], str(local_nlm))

    def test_exclusive_lock_prevents_simultaneous_pollers(self):
        with tempfile.TemporaryDirectory() as tmp, \
             patch.object(bridge, "LOCK_PATH", Path(tmp) / "state" / "bridge.lock"):
            with bridge.exclusive_state_lock() as first:
                self.assertTrue(first)
                with bridge.exclusive_state_lock() as second:
                    self.assertFalse(second)
            with bridge.exclusive_state_lock() as third:
                self.assertTrue(third)

    def test_submission_comments_require_trusted_account(self):
        good = {"user": {"login": bridge.OWNER},
                "body": "Solicitud enviada a NotebookLM desde el Mac de IDEA LAB. Generación en curso."}
        bad = {"user": {"login": "other"},
               "body": "Solicitud enviada a NotebookLM desde el Mac de IDEA LAB."}
        with patch.object(bridge, "command", return_value=json.dumps([bad, good])):
            self.assertTrue(bridge.submitted_comment_exists("67"))
        with patch.object(bridge, "command", return_value=json.dumps([bad])):
            self.assertFalse(bridge.submitted_comment_exists("67"))
        with patch.object(bridge, "command", return_value="{}"):
            with self.assertRaises(RuntimeError):
                bridge.submitted_comment_exists("67")

    def test_remote_comment_without_state_quarantines_not_retries(self):
        state = {}
        req = request(vid=VIDEO)
        cfg = {"books": {BOOK: {"episodes": {VIDEO: {
            "notebook": "private-notebook", "sources": ["private-source"]}}}}}
        with patch.object(bridge, "select_mapping", return_value=("private-notebook", ["private-source"])), \
             patch.object(bridge, "submitted_comment_exists", return_value=True), \
             patch.object(bridge, "save_json") as save:
            bridge.quarantine_existing_request("67", req, state, cfg)
            save.assert_called_once()
            self.assertEqual(state["67"]["phase"], "deferred")
            self.assertEqual(state["67"]["reason"], "remote_submission_without_local_state")
            self.assertEqual(state["67"]["notebook"], "private-notebook")
        with patch.object(bridge, "select_mapping", return_value=("private-notebook", ["private-source"])), \
             patch.object(bridge, "submitted_comment_exists", return_value=True), \
             patch.object(bridge, "quarantine_existing_request") as quarantine, \
             patch.object(bridge, "infographic_rows") as rows:
            self.assertTrue(bridge.request_new("67", req, {}, cfg))
            quarantine.assert_called_once()
            rows.assert_not_called()

    def test_quarantine_does_not_fabricate_unverified_remote_submission(self):
        with patch.object(bridge, "select_mapping", return_value=("private-notebook", ["private-source"])), \
             patch.object(bridge, "submitted_comment_exists", return_value=False), \
             patch.object(bridge, "save_json") as save:
            with self.assertRaises(ValueError):
                bridge.quarantine_existing_request("67", request(vid=VIDEO), {}, {})
            save.assert_not_called()

    def test_github_errors_do_not_disclose_raw_stderr(self):
        from unittest.mock import MagicMock
        secret = "ghp_FAKE_SECRET_MUST_NOT_BE_LOGGED"
        runner = MagicMock(returncode=1, stdout="", stderr=f"error HTTP 403 {secret}")
        with patch.object(bridge.subprocess, "run", return_value=runner):
            with self.assertRaises(RuntimeError) as cm:
                bridge.command(["gh", "issue", "list", "-R", bridge.REPO])
        message = str(cm.exception)
        self.assertIn("permisos", message)
        self.assertIn("gh issue list", message)
        self.assertNotIn(secret, message)

    def test_cannot_write_desktop_does_not_affect_poll(self):
        # LaunchAgents often cannot access ~/Desktop due to macOS TCC.
        # The background poll no longer writes there; PNGs stay in Pictures.
        with patch.object(bridge, "check_identity"), \
             patch.object(bridge, "private_config", return_value={}), \
             patch.object(bridge, "load_json", return_value={}), \
             patch.object(bridge, "next_requests", return_value=[]), \
             patch.object(bridge, "retry_github_comments") as retry, \
             patch("notebooklm_export_desktop.export_known",
                   side_effect=PermissionError("Desktop not allowed")) as export:
            bridge.poll()
            retry.assert_called_once_with({})
            export.assert_not_called()

    def test_download_comment_failure_keeps_image_state_and_queues_comment(self):
        state = {"102": {"phase": "downloaded", "path": "/tmp/image.png"}}
        job = state["102"]
        with patch.object(bridge, "issue_comment", side_effect=RuntimeError("gh unavailable")), \
             patch.object(bridge, "save_json") as saved:
            bridge.comment_or_queue("102", bridge.DOWNLOADED_COMMENT, job, state)
            self.assertEqual(job["phase"], "downloaded")
            self.assertEqual(job["github_comments_pending"], [bridge.DOWNLOADED_COMMENT])
            saved.assert_called_once()

    def test_replay_github_comments_verifies_remote_before_posting(self):
        state = {"102": {"phase": "downloaded",
                          "github_comments_pending": [bridge.DOWNLOADED_COMMENT]}}
        with patch.object(bridge, "remote_comment_exists", return_value=True), \
             patch.object(bridge, "issue_comment") as post, \
             patch.object(bridge, "save_json") as saved:
            bridge.retry_github_comments(state)
            post.assert_not_called()
            self.assertNotIn("github_comments_pending", state["102"])
            saved.assert_called_once()
        state["102"]["github_comments_pending"] = [bridge.DOWNLOADED_COMMENT]
        with patch.object(bridge, "remote_comment_exists", return_value=False), \
             patch.object(bridge, "issue_comment") as post, \
             patch.object(bridge, "save_json"):
            bridge.retry_github_comments(state)
            post.assert_called_once_with("102", bridge.DOWNLOADED_COMMENT)

    def test_failing_github_retries_do_not_block_other_work(self):
        state = {"102": {"phase": "downloaded",
                          "github_comments_pending": [bridge.DOWNLOADED_COMMENT]}}
        pending = [("200", request(book=BOOK, vid=VIDEO))]
        with patch.object(bridge, "check_identity"), \
             patch.object(bridge, "private_config", return_value={}), \
             patch.object(bridge, "load_json", return_value=state), \
             patch.object(bridge, "remote_comment_exists",
                          side_effect=RuntimeError("gh transient")), \
             patch.object(bridge, "next_requests", return_value=pending), \
             patch.object(bridge, "select_mapping", return_value=("another-notebook", ["src"])), \
             patch.object(bridge, "request_new", return_value=True) as submit:
            bridge.poll()
            submit.assert_called_once()
            self.assertEqual(state["102"]["phase"], "downloaded")

    def test_retry_failed_opt_in_only_and_idempotent(self):
        import argparse
        state = {"105": {"phase": "failed", "artifact_id": "failed-001",
                         "request": request()}}
        with patch.object(bridge, "check_identity"), \
             patch.object(bridge, "load_json", return_value=state), \
             patch.object(bridge, "save_json") as save:
            bridge.queue_retry_failed(argparse.Namespace(issue=105))
            self.assertTrue(state["105"]["retry_requested"])
            self.assertEqual(state["105"]["phase"], "failed")
            save.assert_called_once()
            bridge.queue_retry_failed(argparse.Namespace(issue=105))
            save.assert_called_once()
        state["105"]["phase"] = "downloaded"
        with patch.object(bridge, "check_identity"), \
             patch.object(bridge, "load_json", return_value=state):
            with self.assertRaises(ValueError):
                bridge.queue_retry_failed(argparse.Namespace(issue=105))

    def test_queued_retry_never_overlaps_active_generation(self):
        state = {
            "105": {"phase": "failed", "artifact_id": "failed-001",
                    "retry_requested": True, "request": request()},
            "106": {"phase": "submitted", "request": request()},
        }
        with patch.object(bridge, "check_identity"), \
             patch.object(bridge, "load_json", return_value=state), \
             patch.object(bridge, "private_config", return_value={}), \
             patch.object(bridge, "check_submitted"), \
             patch.object(bridge, "retry_github_comments"), \
             patch.object(bridge, "launch_queued_retry") as launch:
            bridge.poll()
            launch.assert_not_called()

    def test_retry_requires_old_remote_artifact_still_failed(self):
        job = {"phase": "failed", "artifact_id": "failed-001",
               "retry_requested": True, "request": request(vid=VIDEO),
               "notebook": "notebook-001", "source_ids": ["source-001"]}
        cfg = {"books": {BOOK: {"episodes": {VIDEO: {
            "notebook": "notebook-001", "sources": ["source-001"]}}}}}
        state = {"105": job}
        with patch.object(bridge, "infographic_rows",
                          return_value=[{"id": "failed-001", "status": "completed"}]), \
             patch.object(bridge, "command") as command, \
             patch.object(bridge, "save_json") as saved:
            self.assertFalse(bridge.launch_queued_retry(state, cfg))
            self.assertEqual(job["phase"], "failed")
            self.assertNotIn("retry_requested", job)
            self.assertIn("retry_blocked", job)
            command.assert_not_called()
            saved.assert_called_once()

    def test_retry_preserves_history_and_downloaded_pngs(self):
        job = {"phase": "failed", "artifact_id": "failed-001",
               "retry_requested": True, "request": request(vid=VIDEO),
               "notebook": "notebook-001", "source_ids": ["source-001"]}
        downloaded = {"phase": "downloaded", "path": "/tmp/issue-107.png",
                      "request": request(vid=VIDEO)}
        cfg = {"books": {BOOK: {"episodes": {VIDEO: {
            "notebook": "notebook-001", "sources": ["source-001"]}}}}}
        state = {"105": job, "107": downloaded}
        with patch.object(bridge, "infographic_rows",
                          return_value=[{"id": "failed-001", "status": "failed"},
                                        {"id": "other-001", "status": "completed"}]), \
             patch.object(bridge, "command") as command, \
             patch.object(bridge, "comment_or_queue") as comment, \
             patch.object(bridge, "save_json") as saved:
            self.assertTrue(bridge.launch_queued_retry(state, cfg))
            self.assertEqual(job["phase"], "submitted")
            self.assertEqual(job["before"], ["failed-001", "other-001"])
            self.assertNotIn("artifact_id", job)
            self.assertFalse(job.get("retry_requested"))
            self.assertEqual(job["past_attempts"][0]["artifact_id"], "failed-001")
            self.assertEqual(downloaded["path"], "/tmp/issue-107.png")
            self.assertEqual(downloaded["phase"], "downloaded")
            command.assert_called_once()
            self.assertEqual(command.call_args.args[0][0:3],
                             ["nlm", "infographic", "create"])
            comment.assert_called_once_with("105", bridge.RETRY_COMMENT, job, state)
            self.assertGreaterEqual(saved.call_count, 2)

    def test_uncertain_retry_not_repeated_without_explicit_action(self):
        job = {"phase": "failed", "artifact_id": "failed-001",
               "retry_requested": True, "request": request(vid=VIDEO),
               "notebook": "notebook-001", "source_ids": ["source-001"]}
        cfg = {"books": {BOOK: {"episodes": {VIDEO: {
            "notebook": "notebook-001", "sources": ["source-001"]}}}}}
        state = {"105": job}
        with patch.object(bridge, "infographic_rows",
                          return_value=[{"id": "failed-001", "status": "failed"}]), \
             patch.object(bridge, "command", side_effect=RuntimeError("limit")), \
             patch.object(bridge, "save_json"):
            self.assertTrue(bridge.launch_queued_retry(state, cfg))
            self.assertEqual(job["phase"], "uncertain")
            self.assertNotIn("retry_requested", job)
            self.assertFalse(bridge.launch_queued_retry(state, cfg))

    def test_batch_audit_blocked_only_selected_books_and_never_mutates(self):
        import argparse
        import contextlib
        import io
        state = {
            "41": {"phase": "deferred", "notebook": "private-monte-nb",
                   "request": {"book": "conde-montecristo"}, "before": ["artold00001"]},
            "63": {"phase": "deferred", "notebook": "private-sapiens-nb",
                   "request": {"book": "sapiens"}, "before": []},
            "115": {"phase": "failed", "notebook": "other-nb",
                    "request": {"book": "sapiens"}, "before": []},
            "200": {"phase": "uncertain", "notebook": "unrelated-nb",
                    "request": {"book": "1984"}, "before": []},
        }
        copy_state = json.loads(json.dumps(state))
        output = io.StringIO()
        args = argparse.Namespace(issue=None, book=["conde-montecristo", "sapiens"])
        with patch.object(bridge, "load_json", return_value=state), \
             patch.object(bridge, "infographic_rows", side_effect=[
                 [{"id": "artold00001", "status": "3"}],
                 [{"id": "newart00001", "status": "3"}]]), \
             patch.object(bridge, "save_json") as write, \
             patch.object(bridge, "command") as generate:
            with contextlib.redirect_stdout(output):
                bridge.audit_blocked(args)
            write.assert_not_called()
            generate.assert_not_called()
        self.assertEqual(copy_state, state)
        message = output.getvalue()
        self.assertIn("Solicitudes inciertas/aplazadas: 2", message)
        self.assertIn("con candidatos= 1", message)
        self.assertIn("sin candidatos= 1", message)
        self.assertNotIn("private-monte-nb", message)
        self.assertNotIn("private-sapiens-nb", message)
        self.assertNotIn("unrelated-nb", message)

    def test_batch_audit_blocked_fails_closed_when_studio_snapshot_is_incomplete(self):
        import argparse
        import contextlib
        import io
        state = {"41": {"phase": "deferred", "notebook": "private-nb",
                        "request": {"book": "conde-montecristo"},
                        "before": ["oldart00001"]}}
        output = io.StringIO()
        with patch.object(bridge, "load_json", return_value=state), \
             patch.object(bridge, "infographic_rows", return_value=[]), \
             patch.object(bridge, "save_json") as write:
            with contextlib.redirect_stdout(output):
                bridge.audit_blocked(argparse.Namespace(
                    issue=None, book=["conde-montecristo"]))
            write.assert_not_called()
        self.assertIn("instantánea no verificable= 1", output.getvalue())
        self.assertIn("NO reintentar", output.getvalue())

    def test_blocked_report_does_not_expose_notebook_ids(self):
        state = {
            "160": {"phase": "uncertain", "notebook": "PRIVATE_NOTEBOOK",
                    "request": {"book": "utopia"}, "failure_kind": "quota"},
            "163": {"phase": "deferred", "notebook": "PRIVATE_NOTEBOOK",
                    "request": {"book": "utopia"}}
        }
        import io
        from contextlib import redirect_stdout
        out = io.StringIO()
        with patch.object(bridge, "load_json", return_value=state), redirect_stdout(out):
            bridge.blocked_jobs(None)
        self.assertIn("Cuadernos bloqueados (uncertain/deferred): 1", out.getvalue())
        self.assertIn("#160 utopia uncertain quota", out.getvalue())
        self.assertNotIn("PRIVATE_NOTEBOOK", out.getvalue())

    def test_reconcile_only_never_dispatches_new_requests(self):
        import io
        from contextlib import redirect_stdout
        state = {"160": {"phase": "submitted", "notebook": "notebook-001",
                         "request": {"book": "utopia"}}}
        output = io.StringIO()
        with patch.object(bridge, "check_identity"), \
             patch.object(bridge, "load_json", return_value=state), \
             patch.object(bridge, "check_submitted") as check, \
             patch.object(bridge, "retry_github_comments") as comments, \
             patch.object(bridge, "request_new") as generate, \
             patch.object(bridge, "launch_queued_retry") as retry, \
             patch.object(bridge, "next_requests") as pending, \
             redirect_stdout(output):
            bridge.reconcile_only()
        check.assert_called_once_with("160", state["160"], state)
        comments.assert_called_once_with(state)
        generate.assert_not_called()
        retry.assert_not_called()
        pending.assert_not_called()
        self.assertIn("Generaciones activas: 1", output.getvalue())

    def test_reconcile_only_reports_free_when_submitted_downloaded(self):
        import io
        from contextlib import redirect_stdout
        state = {"160": {"phase": "submitted", "notebook": "notebook-001",
                         "request": {"book": "utopia"}}}
        def complete(number, job, _state):
            job["phase"] = "downloaded"
        output = io.StringIO()
        with patch.object(bridge, "check_identity"), \
             patch.object(bridge, "load_json", return_value=state), \
             patch.object(bridge, "check_submitted", side_effect=complete), \
             patch.object(bridge, "retry_github_comments"), \
             patch.object(bridge, "request_new") as generate, \
             redirect_stdout(output):
            bridge.reconcile_only()
        self.assertIn("No hay generaciones activas", output.getvalue())
        generate.assert_not_called()

    def test_safe_studio_failure_detail_redacts_sensitive_strings(self):
        row = {"status": "4", "error_message":
               "Falló en https://example.com/private y /Users/miguel/secret "
               "con test@example.com ref 47e40e6b-8fd7-4a2d-983e-eaf91b00320d"}
        key, detail = bridge.safe_studio_failure_detail(row)
        self.assertEqual(key, "error_message")
        self.assertNotIn("example.com", detail)
        self.assertNotIn("Users", detail)
        self.assertNotIn("miguel", detail)
        self.assertNotIn("test@", detail)
        self.assertNotIn("47e40e6b", detail)

    def test_diagnose_failed_reads_studio_without_mutating(self):
        import argparse
        import io
        from contextlib import redirect_stdout
        state = {"178": {"phase": "failed", "artifact_id": "failedartifact001",
                         "notebook": "private-nb",
                         "request": {"book": "psicologia-dinero"}}}
        row = {"id": "failedartifact001", "status": "4",
               "failure_reason": "Generation unavailable"}
        output = io.StringIO()
        with patch.object(bridge, "load_json", return_value=state), \
             patch.object(bridge, "infographic_rows", return_value=[row]) as studio, \
             patch.object(bridge, "save_json") as save, \
             patch.object(bridge, "request_new") as generate, \
             redirect_stdout(output):
            bridge.diagnose_failed(argparse.Namespace(issue=178))
        studio.assert_called_once_with("private-nb")
        self.assertIn("Estado de Studio: 4", output.getvalue())
        self.assertIn("Generation unavailable", output.getvalue())
        self.assertNotIn("private-nb", output.getvalue())
        self.assertNotIn("failedartifact001", output.getvalue())
        save.assert_not_called()
        generate.assert_not_called()

    def test_diagnose_failed_without_error_does_not_infer_cause(self):
        import argparse
        import io
        from contextlib import redirect_stdout
        state = {"163": {"phase": "failed", "artifact_id": "failedartifact001",
                         "notebook": "private-nb",
                         "request": {"book": "la-ola-que-viene"}}}
        output = io.StringIO()
        with patch.object(bridge, "load_json", return_value=state), \
             patch.object(bridge, "infographic_rows",
                          return_value=[{"id": "failedartifact001", "status": "4"}]), \
             redirect_stdout(output):
            bridge.diagnose_failed(argparse.Namespace(issue=163))
        self.assertIn("Studio no proporciona un motivo", output.getvalue())
        self.assertIn("no se ha reintentado", output.getvalue())

    def test_repeated_uncertain_launches_pause_automatic_generation(self):
        for n, outcome in [("160", "uncertain"), ("161", "downloaded"),
                           ("163", "uncertain"), ("178", "uncertain")]:
            bridge.record_generation_outcome(n, outcome)
        health = bridge.generation_health()
        self.assertTrue(health["paused"])
        self.assertEqual(len(health["recent"]), 4)
        self.assertIn("3 envíos inciertos", health["pause_reason"])

    def test_remote_delta_rejects_incomplete_snapshot(self):
        job = {"notebook": "private-notebook", "before": ["oldartifact001"]}
        with patch.object(bridge, "infographic_rows",
                          return_value=[{"id": "otherartifact001", "status": "3"}]):
            with self.assertRaisesRegex(RuntimeError, "instantánea anterior"):
                bridge.remote_artifact_delta(job)

    def test_remote_delta_identifies_unseen_artifact(self):
        job = {"notebook": "private-notebook", "before": ["oldartifact001"]}
        with patch.object(bridge, "infographic_rows", return_value=[
            {"id": "oldartifact001", "status": "3"},
            {"id": "newartifact001", "status": "4"},
        ]):
            rows, new = bridge.remote_artifact_delta(job)
        self.assertEqual(len(rows), 2)
        self.assertEqual(len(new), 1)
        self.assertEqual(bridge.artifact_id(new[0]), "newartifact001")

    def test_recovery_preflight_is_read_only_and_does_not_certify_quota(self):
        import argparse
        import contextlib
        import io
        state = {"115": {"phase": "deferred", "notebook": "private-nb",
                         "source_ids": ["private-source"],
                         "before": ["oldartifact001"],
                         "request": request(vid=VIDEO)}}
        output = io.StringIO()
        with patch.object(bridge, "check_identity"), \
             patch.object(bridge, "load_json", return_value=state), \
             patch.object(bridge, "generation_health", return_value={"paused": False}), \
             patch.object(bridge, "private_config", return_value={}), \
             patch.object(bridge, "select_mapping",
                          return_value=("private-nb", ["private-source"])), \
             patch.object(bridge, "submitted_comment_exists", return_value=False), \
             patch.object(bridge, "infographic_rows",
                          return_value=[{"id": "oldartifact001", "status": "3"}]), \
             patch.object(bridge, "save_json") as save, \
             patch.object(bridge, "command") as launch:
            with contextlib.redirect_stdout(output):
                bridge.recovery_preflight(argparse.Namespace(issue=115))
            save.assert_not_called()
            launch.assert_not_called()
        report = output.getvalue()
        self.assertIn("Controles superados", report)
        self.assertIn("NO certifica", report)
        self.assertNotIn("private-nb", report)
        self.assertNotIn("private-source", report)

    def test_recovery_preflight_detects_unfinished_studio_artifact(self):
        import argparse
        import contextlib
        import io
        state = {"115": {"phase": "deferred", "notebook": "private-nb",
                         "source_ids": ["private-source"],
                         "before": ["oldartifact001"],
                         "request": request(vid=VIDEO)}}
        output = io.StringIO()
        with patch.object(bridge, "check_identity"), \
             patch.object(bridge, "load_json", return_value=state), \
             patch.object(bridge, "generation_health", return_value={"paused": False}), \
             patch.object(bridge, "private_config", return_value={}), \
             patch.object(bridge, "select_mapping",
                          return_value=("private-nb", ["private-source"])), \
             patch.object(bridge, "submitted_comment_exists", return_value=False), \
             patch.object(bridge, "infographic_rows",
                          return_value=[{"id": "oldartifact001", "status": "2"}]), \
             patch.object(bridge, "command") as launch:
            with contextlib.redirect_stdout(output):
                bridge.recovery_preflight(argparse.Namespace(issue=115))
            launch.assert_not_called()
        self.assertIn("BLOQUEO:", output.getvalue())
        self.assertIn("estado sin finalizar", output.getvalue())

    def test_recover_blocked_rejects_pending_previous_artifact(self):
        import argparse
        state = {"115": {"phase": "deferred", "notebook": "private-nb",
                         "source_ids": ["private-source"],
                         "before": ["oldartifact001"],
                         "request": request(vid=VIDEO)}}
        args = argparse.Namespace(issue=115, confirm_no_artifact=True,
                                  confirm_quota_restored=True)
        with patch.object(bridge, "check_identity"), \
             patch.object(bridge, "generation_health", return_value={"paused": False}), \
             patch.object(bridge, "load_json", return_value=state), \
             patch.object(bridge, "private_config", return_value={}), \
             patch.object(bridge, "select_mapping",
                          return_value=("private-nb", ["private-source"])), \
             patch.object(bridge, "submitted_comment_exists", return_value=False), \
             patch.object(bridge, "infographic_rows",
                          return_value=[{"id": "oldartifact001", "status": "2"}]), \
             patch.object(bridge, "command") as launch:
            with self.assertRaisesRegex(RuntimeError, "artefactos en curso"):
                bridge.recover_blocked(args)
            launch.assert_not_called()
            self.assertEqual(state["115"]["phase"], "deferred")

    def test_inspect_submitted_reports_no_new_artifact_without_modifying_state(self):
        import argparse
        import contextlib
        import io
        state = {"115": {"phase": "submitted", "notebook": "private-nb",
                         "before": ["oldartifact001"], "request": request(vid=VIDEO)}}
        output = io.StringIO()
        with patch.object(bridge, "load_json", return_value=state), \
             patch.object(bridge, "infographic_rows",
                          return_value=[{"id": "oldartifact001", "status": "3"}]), \
             patch.object(bridge, "save_json") as save, \
             patch.object(bridge, "command") as launch:
            with contextlib.redirect_stdout(output):
                bridge.inspect_submitted(argparse.Namespace(issue=115))
            save.assert_not_called()
            launch.assert_not_called()
        self.assertIn("Artefactos nuevos respecto al envío: 0", output.getvalue())
        self.assertNotIn("private-nb", output.getvalue())

    def test_inspect_submitted_reports_single_completed_artifact(self):
        import argparse
        import contextlib
        import io
        state = {"115": {"phase": "submitted", "notebook": "private-nb",
                         "before": [], "request": request(vid=VIDEO)}}
        output = io.StringIO()
        with patch.object(bridge, "load_json", return_value=state), \
             patch.object(bridge, "infographic_rows",
                          return_value=[{"id": "newartifact001", "status": "3"}]), \
             patch.object(bridge, "save_json") as save:
            with contextlib.redirect_stdout(output):
                bridge.inspect_submitted(argparse.Namespace(issue=115))
            save.assert_not_called()
        self.assertIn("Candidato único: Studio informa de finalización.", output.getvalue())
        self.assertNotIn("newartifact001", output.getvalue())

    def test_inspect_submitted_reports_multiple_candidates_as_ambiguous(self):
        import argparse
        import contextlib
        import io
        state = {"115": {"phase": "submitted", "notebook": "private-nb",
                         "before": [], "request": request(vid=VIDEO)}}
        output = io.StringIO()
        with patch.object(bridge, "load_json", return_value=state), \
             patch.object(bridge, "infographic_rows",
                          return_value=[{"id": "newartifact001", "status": "3"},
                                        {"id": "newartifact002", "status": "2"}]), \
             patch.object(bridge, "save_json") as save:
            with contextlib.redirect_stdout(output):
                bridge.inspect_submitted(argparse.Namespace(issue=115))
            save.assert_not_called()
        self.assertIn("AMBIGÜEDAD: hay varios candidatos", output.getvalue())

    def test_inspect_submitted_fails_closed_on_incomplete_snapshot(self):
        import argparse
        import contextlib
        import io
        state = {"115": {"phase": "submitted", "notebook": "private-nb",
                         "before": ["oldartifact001"], "request": request(vid=VIDEO)}}
        output = io.StringIO()
        with patch.object(bridge, "load_json", return_value=state), \
             patch.object(bridge, "infographic_rows", return_value=[]), \
             patch.object(bridge, "save_json") as save:
            with contextlib.redirect_stdout(output):
                bridge.inspect_submitted(argparse.Namespace(issue=115))
            save.assert_not_called()
        self.assertIn("no permite contrastar la instantánea original", output.getvalue())

    def test_recovery_needs_explicit_quota_and_no_artifact_confirmation(self):
        import argparse
        with self.assertRaisesRegex(ValueError, "obligatorias"):
            bridge.recover_blocked(argparse.Namespace(
                issue=160, confirm_no_artifact=False, confirm_quota_restored=True))

    def test_recovery_aborts_if_new_remote_artifact_exists(self):
        import argparse
        state = {"160": {"phase": "uncertain", "notebook": "notebook-001",
                         "source_ids": ["source-001"], "before": [],
                         "request": request(vid=VIDEO)}}
        arg = argparse.Namespace(issue=160, confirm_no_artifact=True,
                                 confirm_quota_restored=True)
        with patch.object(bridge, "check_identity"), \
             patch.object(bridge, "generation_health", return_value={"paused": False}), \
             patch.object(bridge, "load_json", return_value=state), \
             patch.object(bridge, "private_config", return_value={}), \
             patch.object(bridge, "select_mapping",
                          return_value=("notebook-001", ["source-001"])), \
             patch.object(bridge, "submitted_comment_exists", return_value=False), \
             patch.object(bridge, "infographic_rows",
                          return_value=[{"id": "newartifact001", "status": "3"}]), \
             patch.object(bridge, "command") as command:
            with self.assertRaisesRegex(RuntimeError, "nuevos artefactos"):
                bridge.recover_blocked(arg)
            command.assert_not_called()
            self.assertEqual(state["160"]["phase"], "uncertain")

    def test_recovery_sends_single_manual_request_without_losing_state(self):
        import argparse
        state = {"160": {"phase": "uncertain", "notebook": "notebook-001",
                         "source_ids": ["source-001"],
                         "before": ["oldartifact001"],
                         "request": request(vid=VIDEO)}}
        arg = argparse.Namespace(issue=160, confirm_no_artifact=True,
                                 confirm_quota_restored=True)
        with tempfile.TemporaryDirectory() as tmp, \
             patch.object(bridge, "STATE_PATH", Path(tmp) / "jobs.json"), \
             patch.object(bridge, "check_identity"), \
             patch.object(bridge, "generation_health", return_value={"paused": False}), \
             patch.object(bridge, "load_json", return_value=state), \
             patch.object(bridge, "private_config", return_value={}), \
             patch.object(bridge, "select_mapping",
                          return_value=("notebook-001", ["source-001"])), \
             patch.object(bridge, "submitted_comment_exists", return_value=False), \
             patch.object(bridge, "infographic_rows",
                          return_value=[{"id": "oldartifact001", "status": "3"}]), \
             patch.object(bridge, "command", return_value="") as command, \
             patch.object(bridge, "comment_or_queue") as comment:
            bridge.recover_blocked(arg)
            command.assert_called_once()
            comment.assert_called_once()
            self.assertEqual(state["160"]["phase"], "submitted")
            self.assertEqual(state["160"]["recovery_count"], 1)
            self.assertEqual(state["160"]["past_attempts"][0]["phase"], "uncertain")

    def test_recovery_rejects_other_active_generation_and_public_submission(self):
        import argparse
        main = {"phase": "uncertain", "notebook": "notebook-001",
                "source_ids": ["source-001"], "before": [],
                "request": request(vid=VIDEO)}
        arg = argparse.Namespace(issue=160, confirm_no_artifact=True,
                                 confirm_quota_restored=True)
        state = {"160": main, "200": {"phase": "submitted", "notebook": "notebook-002"}}
        with patch.object(bridge, "check_identity"), \
             patch.object(bridge, "generation_health", return_value={"paused": False}), \
             patch.object(bridge, "load_json", return_value=state):
            with self.assertRaisesRegex(RuntimeError, "generación activa"):
                bridge.recover_blocked(arg)
        state.pop("200")
        with patch.object(bridge, "check_identity"), \
             patch.object(bridge, "generation_health", return_value={"paused": False}), \
             patch.object(bridge, "load_json", return_value=state), \
             patch.object(bridge, "private_config", return_value={}), \
             patch.object(bridge, "select_mapping",
                          return_value=("notebook-001", ["source-001"])), \
             patch.object(bridge, "submitted_comment_exists", return_value=True), \
             patch.object(bridge, "command") as command:
            with self.assertRaisesRegex(RuntimeError, "GitHub confirma"):
                bridge.recover_blocked(arg)
            command.assert_not_called()

    def test_recovery_quota_remains_uncertain_and_suspends_generation(self):
        import argparse
        state = {"160": {"phase": "uncertain", "notebook": "notebook-001",
                         "source_ids": ["source-001"], "before": [],
                         "request": request(vid=VIDEO)}}
        arg = argparse.Namespace(issue=160, confirm_no_artifact=True,
                                 confirm_quota_restored=True)
        with tempfile.TemporaryDirectory() as tmp, \
             patch.object(bridge, "STATE_PATH", Path(tmp) / "jobs.json"), \
             patch.object(bridge, "check_identity"), \
             patch.object(bridge, "generation_health", return_value={"paused": False}), \
             patch.object(bridge, "load_json", return_value=state), \
             patch.object(bridge, "private_config", return_value={}), \
             patch.object(bridge, "select_mapping",
                          return_value=("notebook-001", ["source-001"])), \
             patch.object(bridge, "submitted_comment_exists", return_value=False), \
             patch.object(bridge, "infographic_rows", return_value=[]), \
             patch.object(bridge, "command",
                          side_effect=bridge.NotebookLMQuotaError("quota")), \
             patch.object(bridge, "pause_generation") as pause, \
             patch.object(bridge, "comment_or_queue") as comment:
            bridge.recover_blocked(arg)
            self.assertEqual(state["160"]["phase"], "uncertain")
            self.assertEqual(state["160"]["failure_kind"], "quota")
            pause.assert_called_once()
            comment.assert_not_called()

    def test_three_failed_generations_in_last_five_pause(self):
        import argparse
        with tempfile.TemporaryDirectory() as tmp, \
             patch.object(bridge, "HEALTH_PATH", Path(tmp) / "health.json"):
            for n, outcome in [("139", "failed"), ("140", "failed"),
                               ("141", "downloaded"), ("142", "failed")]:
                bridge.record_generation_outcome(n, outcome)
            health = bridge.generation_health()
            self.assertTrue(health["paused"])
            self.assertEqual(len(health["recent"]), 4)
            self.assertIn("3 fallos", health["pause_reason"])
            with patch.object(bridge, "check_identity"):
                with self.assertRaises(ValueError):
                    bridge.resume_generations(argparse.Namespace(confirm=False))
                bridge.resume_generations(argparse.Namespace(confirm=True))
            after = bridge.generation_health()
            self.assertFalse(after["paused"])
            self.assertEqual(after["recent"], [])

    def test_a_few_failures_with_successes_does_not_pause(self):
        with tempfile.TemporaryDirectory() as tmp, \
             patch.object(bridge, "HEALTH_PATH", Path(tmp) / "health.json"):
            for n, outcome in [("139", "failed"), ("140", "failed"),
                               ("141", "downloaded"), ("143", "downloaded"),
                               ("144", "downloaded")]:
                bridge.record_generation_outcome(n, outcome)
            self.assertFalse(bridge.generation_health()["paused"])

    def test_poll_paused_still_checks_submitted_and_never_starts_new(self):
        state = {"142": {"phase": "submitted", "notebook": "notebook-a"}}
        with patch.object(bridge, "check_identity"), \
             patch.object(bridge, "private_config", return_value={}), \
             patch.object(bridge, "load_json", return_value=state), \
             patch.object(bridge, "check_submitted") as check, \
             patch.object(bridge, "retry_github_comments"), \
             patch.object(bridge, "generation_health",
                          return_value={"paused": True, "pause_reason": "testing"}), \
             patch.object(bridge, "next_requests") as pending, \
             patch.object(bridge, "launch_queued_retry") as retry:
            bridge.poll()
            check.assert_called_once()
            retry.assert_not_called()
            pending.assert_not_called()

    def test_quota_detection_redacts_cli_output(self):
        from unittest.mock import MagicMock
        marker = "DO_NOT_EXPOSE_PRIVATE_TOKEN"
        failure = MagicMock(returncode=1, stdout="",
                            stderr="resource_exhausted: usage limit " + marker)
        with patch.object(bridge.subprocess, "run", return_value=failure):
            with self.assertRaises(bridge.NotebookLMQuotaError) as cm:
                bridge.command(["nlm", "infographic", "create", "private-id"])
        self.assertNotIn(marker, str(cm.exception))
        self.assertTrue(bridge.looks_like_quota_error("HTTP 429"))
        self.assertFalse(bridge.looks_like_quota_error("unknown transient error"))

    def test_unknown_cli_errors_are_not_reported_as_quota(self):
        from unittest.mock import MagicMock
        failure = MagicMock(returncode=1, stdout="", stderr="temporary failure")
        with patch.object(bridge.subprocess, "run", return_value=failure):
            with self.assertRaises(RuntimeError) as cm:
                bridge.command(["nlm", "infographic", "create", "private-id"])
        self.assertNotIsInstance(cm.exception, bridge.NotebookLMQuotaError)

    def test_health_pause_does_not_modify_local_job_state(self):
        state = {"143": {"phase": "downloaded", "path": "/tmp/issue-143.png"}}
        with tempfile.TemporaryDirectory() as tmp, \
             patch.object(bridge, "HEALTH_PATH", Path(tmp) / "health.json"), \
             patch.object(bridge, "STATE_PATH", Path(tmp) / "jobs.json"):
            bridge.save_json(bridge.STATE_PATH, state)
            bridge.pause_generation("Prueba de protección")
            self.assertEqual(bridge.load_json(bridge.STATE_PATH, {}), state)
            self.assertTrue(bridge.generation_health()["paused"])

    def test_saved_config_is_user_only(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "private" / "config.json"
            bridge.save_json(path, {"notebook": "do-not-expose"})
            self.assertEqual(path.stat().st_mode & 0o777, 0o600)
            self.assertEqual(bridge.load_json(path, {}), {"notebook": "do-not-expose"})

    def test_status_parser_does_not_invent_ids(self):
        self.assertEqual(bridge.artifact_rows("invalid"), [])
        self.assertEqual(bridge.artifact_rows('{"artifacts":[{"id":"aabbccddeeff"}]}'),
                         [{"id": "aabbccddeeff"}])
        self.assertIsNone(bridge.artifact_id({"id": "../../etc/passwd"}))

    def test_prompt_has_source_boundary(self):
        self.assertIn("SOLO las fuentes", bridge.build_prompt(request(vid=VIDEO)))


    def test_reconcile_launch_agent_never_dispatches_new_generations(self):
        import notebooklm_bridge_launchd as launchd
        cfg = launchd.agent_config("reconcile-only")
        self.assertEqual(cfg["ProgramArguments"][-1], "reconcile-only")
        self.assertEqual(cfg["StartInterval"], 180)
        self.assertTrue(cfg["RunAtLoad"])
        self.assertNotIn("poll", cfg["ProgramArguments"])
        self.assertNotIn("recover-blocked", cfg["ProgramArguments"])

    def test_launch_agent_preserves_existing_mode_and_rejects_unknown(self):
        import notebooklm_bridge_launchd as launchd
        self.assertEqual(launchd.agent_config("poll")["ProgramArguments"][-1],
                         "poll")
        with self.assertRaises(ValueError):
            launchd.agent_config("recover-blocked")



    def test_github_recovery_approval_requires_exact_owner_identity_and_body(self):
        now = dt.datetime(2026, 11, 11, 20, 0, tzinfo=dt.timezone.utc)
        stamp = (now - dt.timedelta(minutes=5)).isoformat().replace("+00:00", "Z")
        sample = {
            "id": 428271, "user": {"login": "idealab2026", "id": 350414243},
            "issue_url": "https://api.github.com/repos/"
                         + bridge.REPO + "/issues/85",
            "body": bridge.recovery_approval_body("85"),
            "created_at": stamp, "updated_at": stamp,
        }
        with patch.object(bridge, "command", return_value=json.dumps([sample])):
            self.assertEqual(bridge.github_recovery_approvals(now), [("85", 428271)])
        variants = [
            dict(sample, user={"login": "attacker", "id": 350414243}),
            dict(sample, user={"login": "idealab2026", "id": 999}),
            dict(sample, issue_url=sample["issue_url"].replace("85", "84")),
            dict(sample, body=sample["body"] + "\nrun=anything"),
            dict(sample, updated_at=now.isoformat()),
            dict(sample, created_at=(now - dt.timedelta(hours=20)).isoformat(),
                 updated_at=(now - dt.timedelta(hours=20)).isoformat()),
            dict(sample, id="428271"),
        ]
        for variant in variants:
            with self.subTest(variant=variant):
                with patch.object(bridge, "command",
                                  return_value=json.dumps([variant])):
                    self.assertEqual(bridge.github_recovery_approvals(now), [])

    def test_github_recovery_approval_fails_closed_on_truncated_comment_page(self):
        now = dt.datetime(2026, 11, 11, 20, tzinfo=dt.timezone.utc)
        with patch.object(bridge, "command", return_value=json.dumps([{}] * 100)):
            with self.assertRaisesRegex(RuntimeError, "incompleto"):
                bridge.github_recovery_approvals(now)

    def test_authorized_poll_requires_approval_and_no_active_generations(self):
        state = {"85": {"phase": "deferred", "recovery_count": 0}}
        with patch.object(bridge, "reconcile_only") as reconcile, \
             patch.object(bridge, "load_json", return_value=state), \
             patch.object(bridge, "generation_health", return_value={"paused": False}), \
             patch.object(bridge, "github_recovery_approvals",
                          return_value=[("85", 428271)]) as approvals, \
             patch.object(bridge, "recover_blocked") as recover:
            bridge.poll_authorized()
            reconcile.assert_called_once()
            approvals.assert_called_once()
            recover.assert_called_once()
            args = recover.call_args.args[0]
            self.assertEqual(args.issue, 85)
            self.assertTrue(args.confirm_no_artifact)
            self.assertTrue(args.confirm_quota_restored)
            self.assertEqual(args.github_recovery_comment_id, 428271)
        state["85"]["phase"] = "submitted"
        with patch.object(bridge, "reconcile_only"), \
             patch.object(bridge, "load_json", return_value=state), \
             patch.object(bridge, "generation_health", return_value={"paused": False}), \
             patch.object(bridge, "github_recovery_approvals") as approvals, \
             patch.object(bridge, "recover_blocked") as recover, \
             patch.object(bridge, "launch_authorized_batch") as batches:
            bridge.poll_authorized()
            approvals.assert_not_called()
            recover.assert_not_called()
            batches.assert_not_called()

    def test_authorized_poll_does_not_replay_or_recover_held_issue(self):
        state = {
            "85": {"phase": "uncertain", "recovery_count": 1,
                   "github_recovery_comment_id": 428271},
            "201": {"phase": "uncertain", "recovery_count": 0},
        }
        with patch.object(bridge, "reconcile_only"), \
             patch.object(bridge, "load_json", return_value=state), \
             patch.object(bridge, "generation_health", return_value={"paused": False}), \
             patch.object(bridge, "github_recovery_approvals") as approvals, \
             patch.object(bridge, "recover_blocked") as recover, \
             patch.object(bridge, "launch_authorized_batch") as batches:
            bridge.poll_authorized()
            approvals.assert_not_called()
            recover.assert_not_called()
            batches.assert_called_once_with(state)

    def test_authorized_recovery_persists_approval_before_network_launch(self):
        import argparse
        state = {"85": {"phase": "deferred", "notebook": "notebook-001",
                        "source_ids": ["source-001"],
                        "before": ["oldartifact001"],
                        "request": request(vid=VIDEO)}}
        arg = argparse.Namespace(issue=85, confirm_no_artifact=True,
                                 confirm_quota_restored=True,
                                 github_recovery_comment_id=428271)
        seen = []
        def send(argv, **kwargs):
            seen.append((state["85"]["phase"],
                         state["85"].get("github_recovery_comment_id")))
            return ""
        with tempfile.TemporaryDirectory() as tmp, \
             patch.object(bridge, "STATE_PATH", Path(tmp) / "jobs.json"), \
             patch.object(bridge, "check_identity"), \
             patch.object(bridge, "generation_health", return_value={"paused": False}), \
             patch.object(bridge, "load_json", return_value=state), \
             patch.object(bridge, "private_config", return_value={}), \
             patch.object(bridge, "select_mapping",
                          return_value=("notebook-001", ["source-001"])), \
             patch.object(bridge, "submitted_comment_exists", return_value=False), \
             patch.object(bridge, "infographic_rows",
                          return_value=[{"id": "oldartifact001", "status": "3"}]), \
             patch.object(bridge, "command", side_effect=send), \
             patch.object(bridge, "comment_or_queue"):
            bridge.recover_blocked(arg)
            self.assertEqual(seen, [("launching", 428271)])
            self.assertEqual(state["85"]["phase"], "submitted")
            self.assertEqual(state["85"]["recovery_count"], 1)
            with self.assertRaisesRegex(ValueError, "uncertain/deferred"):
                bridge.recover_blocked(arg)

    def test_authorized_launch_agent_mode_is_separate_and_safe(self):
        import notebooklm_bridge_launchd as launchd
        self.assertEqual(launchd.agent_config("poll-authorized")[
                         "ProgramArguments"][-1], "poll-authorized")
        self.assertEqual(launchd.agent_config("reconcile-only")[
                         "ProgramArguments"][-1], "reconcile-only")


    def test_batch_approval_requires_official_author_fresh_unedited_comment(self):
        now = dt.datetime(2026, 11, 12, 18, tzinfo=dt.timezone.utc)
        created = (now - dt.timedelta(minutes=5)).isoformat().replace("+00:00", "Z")
        sample = {
            "id": 654321, "user": {"id": 350414243, "login": "idealab2026"},
            "body": bridge.batch_approval_body("conde-montecristo"),
            "created_at": created, "updated_at": created,
        }
        with patch.object(bridge, "command", return_value=json.dumps([sample])):
            self.assertEqual(bridge.github_batch_approvals(now),
                             [("conde-montecristo", 654321)])
        for variant in [
            dict(sample, user={"id": 350414243, "login": "impostor"}),
            dict(sample, user={"id": 111, "login": "idealab2026"}),
            dict(sample, body=sample["body"] + "\nexecute=anything"),
            dict(sample, body=sample["body"].replace("max_generations=5",
                                                  "max_generations=50")),
            dict(sample, updated_at=now.isoformat()),
            dict(sample, created_at=(now - dt.timedelta(days=8)).isoformat(),
                 updated_at=(now - dt.timedelta(days=8)).isoformat()),
            dict(sample, id=True),
        ]:
            with self.subTest(variant=variant):
                with patch.object(bridge, "command",
                                  return_value=json.dumps([variant])):
                    self.assertEqual(bridge.github_batch_approvals(now), [])
        with patch.object(bridge, "command", return_value=json.dumps([{}] * 100)):
            with self.assertRaisesRegex(RuntimeError, "historial"):
                bridge.github_batch_approvals(now)

    def test_authorized_batch_respects_five_attempt_limit(self):
        state = {"42": {"github_batch_comment_id": 654321},
                 "43": {"github_batch_comment_id": 654321}}
        with patch.object(bridge, "private_config", return_value={}), \
             patch.object(bridge, "github_batch_approvals",
                          return_value=[("conde-montecristo", 654321)]), \
             patch.object(bridge, "safe_queue_candidate",
                          return_value=("86", request(vid=VIDEO))) as choose, \
             patch.object(bridge, "request_new", return_value=True) as launch:
            self.assertTrue(bridge.launch_authorized_batch(state))
            choose.assert_called_once()
            self.assertEqual(launch.call_args.kwargs["batch_comment_id"], 654321)
            self.assertEqual(launch.call_args.args[0], "86")
        for n in range(5):
            state[str(n)] = {"github_batch_comment_id": 654321}
        with patch.object(bridge, "private_config", return_value={}), \
             patch.object(bridge, "github_batch_approvals",
                          return_value=[("conde-montecristo", 654321)]), \
             patch.object(bridge, "safe_queue_candidate") as choose, \
             patch.object(bridge, "request_new") as launch:
            self.assertFalse(bridge.launch_authorized_batch(state))
            choose.assert_not_called()
            launch.assert_not_called()

    def test_authorized_batch_fails_closed_on_unfinished_studio_artifact(self):
        state = {}
        with patch.object(bridge, "select_mapping",
                          return_value=("notebook-001", ["source-001"])), \
             patch.object(bridge, "submitted_comment_exists", return_value=False), \
             patch.object(bridge, "infographic_rows",
                          return_value=[{"id": "unfinished001", "status": "2"}]), \
             patch.object(bridge, "save_json") as save, \
             patch.object(bridge, "command") as send:
            self.assertFalse(bridge.request_new("86", request(vid=VIDEO),
                                                state, {}, batch_comment_id=654321))
            send.assert_not_called()
            save.assert_not_called()

    def test_authorized_batch_persists_grant_before_creating_infographic(self):
        state = {}
        observed = []
        def fake_command(argv, **kwargs):
            observed.append((state["86"]["phase"],
                             state["86"]["github_batch_comment_id"]))
            return ""
        with patch.object(bridge, "select_mapping",
                          return_value=("notebook-001", ["source-001"])), \
             patch.object(bridge, "submitted_comment_exists", return_value=False), \
             patch.object(bridge, "infographic_rows",
                          return_value=[{"id": "oldartifact001", "status": "3"}]), \
             patch.object(bridge, "command", side_effect=fake_command), \
             patch.object(bridge, "save_json"), \
             patch.object(bridge, "comment_or_queue"):
            self.assertTrue(bridge.request_new("86", request(vid=VIDEO), state, {},
                                                batch_comment_id=654321))
            self.assertEqual(observed, [("launching", 654321)])
            self.assertEqual(state["86"]["phase"], "submitted")

    def test_authorized_poll_uses_batch_only_without_recovery_grants(self):
        state = {"101": {"phase": "deferred", "recovery_count": 1}}
        with patch.object(bridge, "reconcile_only"), \
             patch.object(bridge, "load_json", return_value=state), \
             patch.object(bridge, "generation_health", return_value={"paused": False}), \
             patch.object(bridge, "github_recovery_approvals") as recovery_grants, \
             patch.object(bridge, "launch_authorized_batch") as batches:
            bridge.poll_authorized()
            recovery_grants.assert_not_called()
            batches.assert_called_once_with(state)



if __name__ == "__main__":
    unittest.main()
