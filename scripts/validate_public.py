#!/usr/bin/env python3
"""Fail closed before publishing a static institutional web."""
from pathlib import Path
from html.parser import HTMLParser
import re, sys

ROOT = Path(__file__).resolve().parents[1]
required = ("index.html", "favicon.svg", "logo-idea-lab.svg", "social-preview.svg")
errors = [f"Missing public asset: {file}" for file in required if not (ROOT / file).is_file()]
html = (ROOT / "index.html").read_text(encoding="utf-8") if (ROOT / "index.html").exists() else ""
class Scanner(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag in ("a", "img", "link"):
            val = attrs.get("href", attrs.get("src", ""))
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
