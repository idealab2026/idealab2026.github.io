"""Fixed read-only source boundary for institutional research reproductions."""
import hashlib
import json
from urllib.request import urlopen
from pathlib import Path

SOURCE_COMMIT="6aed200e79395c09c3b30fc4b030a0629ac44df2"
ROOT="https://raw.githubusercontent.com/idealab2026/psicohistoria/"+SOURCE_COMMIT+"/data/"
FILES={"forecast":"forecast-2027-newconf.json","manifest":"forecast-2027-newconf-manifest.json",
       "panel":"coup-origin-panel.json","backtest":"coup-rolling-backtest.json"}

def read(key):
    url=ROOT+FILES[key]
    with urlopen(url,timeout=25) as response:
        if response.geturl()!=url:raise ValueError("Unexpected source redirect")
        raw=response.read(2_000_001)
    if len(raw)>2_000_000:raise ValueError("Source too large")
    doc=json.loads(raw)
    if not isinstance(doc,dict):raise ValueError("Expected object")
    return doc,{"url":url,"sha256":hashlib.sha256(raw).hexdigest(),"commit":SOURCE_COMMIT}

def atomic_json(path,doc):
    path=Path(path);path.parent.mkdir(parents=True,exist_ok=True)
    temporary=path.with_suffix(".tmp")
    temporary.write_text(json.dumps(doc,ensure_ascii=False,indent=2,allow_nan=False)+"\n",encoding="utf-8")
    temporary.replace(path)
    return str(path)
