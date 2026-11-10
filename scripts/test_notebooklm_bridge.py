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


if __name__ == "__main__":
    unittest.main()
