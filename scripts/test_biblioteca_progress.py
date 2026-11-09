#!/usr/bin/env python3
"""Offline checks for public Biblioteca infographic progress generation."""
import json
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build_biblioteca_progress as progress

SLUGS = {"conde-montecristo", "sapiens"}
VID = "oVMG6QzBK64"


def request(vid=VID, volume=None):
    return {"version": 1, "action": "infographic", "book": "conde-montecristo",
            "video_id": vid, "volume": volume}


def issue(obj=None, number=27, user="idealab2026", comments=1):
    payload = request() if obj is None else obj
    return {"title": "[NLM] Montecristo II, capítulo 51",
            "user": {"login": user}, "body": "<!-- IDEA_LAB_NLM_REQUEST_V1\n" +
            json.dumps(payload) + "\n-->",
            "number": number, "comments": comments}


def comment(body, user="idealab2026", created="2026-11-09T10:00:00Z"):
    return {"body": body, "user": {"login": user}, "created_at": created}


class ProgressTests(unittest.TestCase):
    def test_authorized_issue_and_exact_body(self):
        self.assertEqual(progress.request_from_issue(issue(), SLUGS), request())
        self.assertIsNone(progress.request_from_issue(issue(user="other"), SLUGS))
        bogus = issue()
        bogus["body"] = "Some text\n" + bogus["body"]
        self.assertIsNone(progress.request_from_issue(bogus, SLUGS))

    def test_reject_unrelated_and_malicious_requests(self):
        self.assertIsNone(progress.request_from_issue(issue({**request(), "execute": "sh"}), SLUGS))
        self.assertIsNone(progress.request_from_issue(issue({**request(), "book": "personal"}), SLUGS))
        self.assertIsNone(progress.request_from_issue(issue({**request(), "video_id": "../x"}), SLUGS))
        self.assertIsNone(progress.request_from_issue(issue({**request(), "volume": "tomo-i"}), SLUGS))

    def test_request_sent_is_not_generated(self):
        c = comment("Solicitud enviada a NotebookLM desde el Mac de IDEA LAB. Generación en curso.")
        self.assertEqual(progress.issue_state([c]), "generando")
        self.assertEqual(progress.issue_state([]), "en_cola")

    def test_only_authorized_download_confirmation_counts(self):
        valid = comment("Infografía descargada en el Mac. PENDIENTE de revisión editorial.")
        spoof = comment("Infografía descargada en el Mac.", user="other")
        self.assertEqual(progress.issue_state([valid]), "generada")
        self.assertEqual(progress.issue_state([spoof]), "en_cola")
        self.assertEqual(progress.issue_state([spoof, valid]), "generada")
        self.assertEqual(progress.issue_state([valid, comment("Solicitud enviada a NotebookLM desde el Mac", created="2026-11-09T10:01:00Z")]), "generada")

    def test_prioritize_verified_download_over_duplicate_queue(self):
        good = issue(number=27)
        later = issue(number=68, comments=0)
        entries = progress.issue_map([good, later], SLUGS,
            get_comments=lambda n: [comment("Infografía descargada en el Mac.")] if n == 27 else [])
        self.assertEqual(entries[("conde-montecristo", VID, None)]["state"], "generada")
        self.assertEqual(entries[("conde-montecristo", VID, None)]["issue"], 27)

    def test_failed_comment_read_does_not_claim_not_requested(self):
        entries = progress.issue_map([issue()], SLUGS,
            get_comments=lambda n: (_ for _ in ()).throw(RuntimeError("API unavailable")))
        self.assertEqual(entries[("conde-montecristo", VID, None)]["state"], "no_verificado")

    def test_progress_rows_and_phase_counters(self):
        books = [{"slug": "conde-montecristo", "title": "Montecristo",
                  "chapters": [{"id": VID, "title": "Capítulo : 51"},
                               {"id": "FkAIE4ypFaI", "title": "Cap. 53"}]}]
        data = progress.build_progress(books,
            {("conde-montecristo", VID, None): {"state": "generada", "issue": 27, "url": "https://github.com/example"}},
            {"version": 1, "videos": {}})
        self.assertEqual(data["summary"], {"videos": 2, "generated": 1, "corrected": 0})
        self.assertEqual(data["rows"][0]["chapter"], "Cap. 51")
        self.assertEqual(data["rows"][1]["nlm_status"], "sin_solicitar")
        self.assertFalse(data["rows"][0]["corrected"])

    def test_corrected_requires_real_reviewed_file(self):
        fake = {"verified": True, "source": "chatgpt",
                "image": "./infografias/corregidas/" + VID + ".png",
                "reviewed_at": "2026-11-09"}
        self.assertIsNone(progress.verified_correction(VID, fake))
        self.assertIsNone(progress.verified_correction(VID, {"verified": False, **{k:v for k,v in fake.items() if k!="verified"}}))
        self.assertIsNone(progress.verified_correction(VID, {**fake, "source": "notebooklm"}))
        self.assertIsNone(progress.verified_correction(VID, {**fake, "image": "../../private.png"}))

    def test_unavailable_github_data_is_not_zero_progress(self):
        books = [{"slug":"conde-montecristo", "title":"Montecristo",
                  "chapters":[{"id":VID, "title":"Capítulo 51"}]}]
        data = progress.build_progress(books, {}, {"videos":{}}, sync_ok=False)
        self.assertFalse(data["sync_ok"])
        self.assertEqual(data["rows"][0]["nlm_status"], "no_verificado")

    def test_general_book_is_separate_from_episode_count(self):
        books = [{"slug":"conde-montecristo", "title":"Montecristo",
                  "chapters":[{"id":VID, "title":"Capítulo 51"}]}]
        entry = {("conde-montecristo", None, "tomo-ii"):
                 {"state":"generada","issue":20,"url":"https://github.com/example"}}
        data = progress.build_progress(books, entry, {"videos":{}})
        self.assertEqual(data["summary"]["generated"], 0)
        self.assertEqual(len(data["general"]), 1)
        self.assertEqual(data["general"][0]["label"], "Tomo II")


if __name__ == "__main__":
    unittest.main()
