#!/usr/bin/env python3
"""Fail closed before publishing a static institutional web."""
from pathlib import Path
from html.parser import HTMLParser
import re, sys, json

ROOT = Path(__file__).resolve().parents[1]
required = ("index.html", "stats.js", "data/traffic.json", "data/traffic-snapshot.json", "favicon.svg", "logo-idea-lab.svg", "social-preview.svg")
errors = [f"Missing public asset: {file}" for file in required if not (ROOT / file).is_file()]
html = (ROOT / "index.html").read_text(encoding="utf-8") if (ROOT / "index.html").exists() else ""
class Scanner(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag in ("a", "img", "link", "script"):
            val = attrs.get("href") or attrs.get("src", "")
            if val: self.links.append(val)
scanner = Scanner()
scanner.feed(html)
for link in scanner.links:
    if link.startswith("/") and link not in ("/",):
        if not (ROOT / link.lstrip("/")).is_file():
            errors.append("Missing local asset: " + link)
for token in ("segundo-cerebro", "tfm", "tfg", "personal_mamg", "mamg97", "gmail.com", "cloudflare", "worker", "drive.google.com"):
    # Do not echo any matched private data in errors or action logs.
    if token in html.lower(): errors.append("Unapproved source identity marker detected")
if len(list(ROOT.rglob("*.html"))) != 1: errors.append("Unexpected HTML page in corporate public root")
if (ROOT / "data/traffic.json").exists():
    try:
        stats=json.loads((ROOT / "data/traffic.json").read_text(encoding="utf-8"))
        if stats.get("schema") != 1 or stats.get("status") not in ("unconfigured","verified"):
            errors.append("Invalid aggregate statistics schema")
        if not isinstance(stats.get("days"),list) or len(stats["days"])>45:
            errors.append("Invalid aggregate statistics days")
        for row in stats.get("days", []):
            if sorted(row.keys()) != ["day","values"]:
                errors.append("Unexpected traffic data fields")
            if set(row.get("values",{})) != {"observatorio","midas","psicohistoria"}:
                errors.append("Unexpected product grouping")
            for point in row.get("values", {}).values():
                if sorted(point.keys()) != ["pageViews","visits"] or any(type(v)!=int or v<0 for v in point.values()):
                    errors.append("Invalid aggregate metric values")
        if stats.get("status")=="unconfigured" and stats.get("days"):
            errors.append("Unconfigured metric provider cannot publish readings")
    except (ValueError,KeyError,AttributeError,TypeError):
        errors.append("Invalid aggregate statistics JSON")

if (ROOT / "data/traffic-snapshot.json").exists():
    try:
        snapshot=json.loads((ROOT / "data/traffic-snapshot.json").read_text(encoding="utf-8"))
        if set(snapshot) != {"schema","status","observationDate","period","source","values"}:
            errors.append("Unexpected snapshot fields")
        if snapshot.get("schema") != 1 or snapshot.get("status") != "manual_verified_snapshot":
            errors.append("Unverified snapshot")
        if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", snapshot.get("observationDate", "")):
            errors.append("Invalid snapshot date")
        values=snapshot.get("values")
        if not isinstance(values,dict) or not set(values).issubset({"observatorio","midas","psicohistoria"}):
            errors.append("Invalid snapshot products")
        else:
            for point in values.values():
                if set(point) != {"visits","pageViews"} or any(type(v)!=int or v<0 for v in point.values()):
                    errors.append("Invalid snapshot metrics")
    except (ValueError,TypeError,AttributeError,KeyError):
        errors.append("Invalid snapshot JSON")

for path in ROOT.rglob("*"):
    if not path.is_file() or ".git" in path.parts: continue
    if path.suffix in (".json", ".js", ".md", ".html", ".svg", ".yml", ".yaml", ".txt"):
        text = path.read_text(encoding="utf-8", errors="replace")
        for p in (r"-----BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY-----", r"github_pat_[A-Za-z0-9_]{20,}", r"ghp_[A-Za-z0-9]{30,}"):
            if re.search(p, text): errors.append("Sensitive credential pattern")
if errors:
    print("PUBLICATION AUDIT FAILED:", *errors, sep="\n- ")
    sys.exit(1)
print("OK: static public assets, identity boundary and credentials gate")
