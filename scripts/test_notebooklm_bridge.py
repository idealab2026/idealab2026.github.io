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
