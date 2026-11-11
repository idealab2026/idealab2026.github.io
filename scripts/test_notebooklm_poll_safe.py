#!/usr/bin/env python3
"""Regresiones de la recuperación puntual de NotebookLM."""
from __future__ import annotations

import argparse
import unittest
from unittest.mock import patch

import notebooklm_bridge as bridge


BOOK = "sapiens"
VIDEO = "abcdefghijk"


def request(book=BOOK):
    return {"version": 1, "action": "infographic", "book": book,
            "video_id": VIDEO, "volume": None}


class SafePollTests(unittest.TestCase):

    def setUp(self):
        self.health = patch.object(bridge, "generation_health",
                                   return_value={"paused": False,
                                                 "recent": [{"outcome": "failed"}]})
        self.health.start()
        self.addCleanup(self.health.stop)

    def test_preflight_skips_failed_notebook_and_held_201(self):
        state = {"163": {"phase": "failed", "notebook": "failed-nb"}}
        candidates = [("201", request("1984")), ("202", request("1984")),
                      ("204", request("sapiens"))]
        with patch.object(bridge, "find_item"), \
             patch.object(bridge, "next_requests", return_value=candidates), \
             patch.object(bridge, "select_mapping", side_effect=[
                 ("failed-nb", ["src"]), ("safe-nb", ["src"])]):
            selected = bridge.safe_queue_candidate(
                state, {}, {"1984", "sapiens"})
        self.assertEqual(selected, candidates[2])

    def test_without_allowlist_fail_closed(self):
        with self.assertRaises(ValueError):
            bridge.safe_queue_candidate({}, {}, set())

    def test_paused_and_active_do_not_choose_work(self):
        with patch.object(bridge, "find_item"), \
             patch.object(bridge, "next_requests") as pending:
            with patch.object(bridge, "generation_health",
                              return_value={"paused": True}):
                self.assertIsNone(
                    bridge.safe_queue_candidate({}, {}, {BOOK}))
            self.assertIsNone(bridge.safe_queue_candidate(
                {"17": {"phase": "submitted", "notebook": "nb"}}, {}, {BOOK}))
            pending.assert_not_called()

    def test_queued_retry_stops_safe_poll(self):
        with patch.object(bridge, "find_item"), \
             patch.object(bridge, "next_requests") as pending:
            result = bridge.safe_queue_candidate({
                "105": {"phase": "failed", "notebook": "failed",
                        "retry_requested": True},
            }, {}, {BOOK})
            self.assertIsNone(result)
            pending.assert_not_called()

    def test_no_execute_only_previews_and_never_submits(self):
        args = argparse.Namespace(book=[BOOK], hold_issue=[201], execute=False)
        with patch.object(bridge, "check_identity"), \
             patch.object(bridge, "load_json", return_value={}), \
             patch.object(bridge, "private_config", return_value={}), \
             patch.object(bridge, "safe_queue_candidate",
                          return_value=("202", request())) as candidate, \
             patch.object(bridge, "request_new") as submit:
            bridge.safe_poll(args)
            submit.assert_not_called()
            candidate.assert_called_once()

    def test_execute_dispatches_once_through_existing_submitter(self):
        args = argparse.Namespace(book=[BOOK], hold_issue=[], execute=True)
        state = {}
        cfg = {}
        selected = ("204", request())
        with patch.object(bridge, "check_identity"), \
             patch.object(bridge, "load_json", return_value=state), \
             patch.object(bridge, "private_config", return_value=cfg), \
             patch.object(bridge, "safe_queue_candidate",
                          return_value=selected), \
             patch.object(bridge, "request_new", return_value=True) as submit:
            bridge.safe_poll(args)
            submit.assert_called_once_with(selected[0], selected[1],
                                           state, cfg)

    def test_unattended_poll_blocks_historical_failures(self):
        state = {"163": {"phase": "failed", "notebook": "failed-nb"}}
        with patch.object(bridge, "check_identity"), \
             patch.object(bridge, "private_config", return_value={}), \
             patch.object(bridge, "load_json", return_value=state), \
             patch.object(bridge, "retry_github_comments"), \
             patch.object(bridge, "next_requests") as next_requests, \
             patch.object(bridge, "launch_queued_retry") as retry, \
             patch.object(bridge, "request_new") as new:
            bridge.poll()
            next_requests.assert_not_called()
            retry.assert_not_called()
            new.assert_not_called()


if __name__ == "__main__":
    unittest.main()
