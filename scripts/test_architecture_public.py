"""Public architecture is read-only and discloses only verified CI snapshots."""
from pathlib import Path
from html.parser import HTMLParser
root=Path(__file__).resolve().parents[1]
html=(root/"arquitectura/index.html").read_text()
class Check(HTMLParser):
    def handle_starttag(self,tag,attrs):
        attrs=dict(attrs)
        assert tag not in ("script","form","iframe","input","object","embed"),tag
        assert not any(k.startswith("on") for k in attrs)
        for k in ("href","src"):
            v=attrs.get(k)
            if v:assert v.startswith("/") or v.startswith("https://idealab2026.github.io/") or v.startswith("https://github.com/idealab2026/"),v
Check().feed(html)
for token in ("localhost","127.0.0.1","x-api-key","observer_key","/v1/generate","gmail.com","mamg97","segundo-cerebro"):
    assert token not in html.lower()
assert "form-action 'none'" in html and "no tráfico de visitantes" in html
assert "46137957980" in html and "46138552564" in html
assert 'href="/arquitectura/"' in (root/"index.html").read_text()
assert (root/"infrastructure/gateway/app/architecture.html.txt").exists()
assert not (root/"infrastructure/gateway/app/architecture.html").exists()
print("Public architecture: read-only, scoped CI evidence and approved links")
