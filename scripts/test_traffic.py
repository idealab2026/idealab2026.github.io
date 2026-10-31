#!/usr/bin/env python3
"""No-network contract checks for the public-only analytics export."""
import datetime as dt
import json
import unittest
from pathlib import Path
from importlib.util import spec_from_file_location,module_from_spec
ROOT=Path(__file__).resolve().parents[1]
spec=spec_from_file_location("traffic",ROOT/"scripts"/"build_traffic.py")
traffic=module_from_spec(spec)
spec.loader.exec_module(traffic)

class TrafficExportTests(unittest.TestCase):
    def test_prefixes_are_exact_and_not_any_path(self):
        self.assertEqual(traffic.site_for_path("/dashboard-gobierno/finanzas-publicas.html"),"observatorio")
        self.assertEqual(traffic.site_for_path("/laboratorio-cuantitativo/research.html"),"midas")
        self.assertEqual(traffic.site_for_path("/sistemas-complejos"),"psicohistoria")
        self.assertIsNone(traffic.site_for_path("/laboratorio-cuantitativo-personal/"))
        self.assertIsNone(traffic.site_for_path("/"))
    def test_placeholder_contains_no_fake_numbers(self):
        out=traffic.make_placeholder()
        self.assertEqual(out["status"],"unconfigured")
        self.assertEqual(out["days"],[])
    def test_only_aggregated_metrics_and_no_unrelated_paths(self):
        day=dt.date(2026,10,31)
        rows=[
         {"count":3,"sum":{"visits":0},"avg":{"sampleInterval":1},"dimensions":{"date":"2026-10-31","requestHost":"idealab2026.github.io","requestPath":"/dashboard-gobierno/"}},
         {"count":6,"sum":{"visits":2},"avg":{"sampleInterval":1},"dimensions":{"date":"2026-10-31","requestHost":"idealab2026.github.io","requestPath":"/laboratorio-cuantitativo/"}},
         {"count":10,"sum":{"visits":4},"avg":{"sampleInterval":1},"dimensions":{"date":"2026-10-31","requestHost":"other.example","requestPath":"/dashboard-gobierno/"}},
        ]
        out=traffic.build_public_summary(rows,day)
        r=out["days"][0]["values"]
        self.assertEqual(r["observatorio"],{"visits":0,"pageViews":3})
        self.assertEqual(r["midas"],{"visits":2,"pageViews":6})
        self.assertEqual(r["psicohistoria"],{"visits":0,"pageViews":0})
        self.assertNotIn("requestPath",json.dumps(out))
        self.assertNotIn("other.example",json.dumps(out))
    def test_fails_closed_for_sampling_and_truncation(self):
        d={"count":3,"sum":{"visits":1},"avg":{"sampleInterval":10},"dimensions":{"date":"2026-10-31","requestHost":"idealab2026.github.io","requestPath":"/dashboard-gobierno/"}}
        with self.assertRaises(ValueError):
            traffic.build_public_summary([d],dt.date(2026,10,31))
        with self.assertRaises(ValueError):
            traffic.build_public_summary([d]*5000,dt.date(2026,10,31))

if __name__=="__main__":unittest.main()
