"""Compare two independent processes only if the input and splits match."""
import json,sys
from pathlib import Path
a,b=[json.loads(Path(p).read_text()) for p in sys.argv[1:3]]
for key in ("scope","dataset_sha256","config","train_rows","validation_rows","train_last_target","validation_first_signal","normalization","production_custody"):
    if a[key]!=b[key]:raise ValueError("Comparison mismatch: "+key)
if set(a["models"])!={"pytorch"} or set(b["models"])!={"keras"}:raise ValueError("Expected separate framework reports")
out={k:a[k] for k in ("scope","dataset_sha256","config","train_rows","validation_rows","train_last_target","validation_first_signal","production_custody")}
out["models"]={**a["models"],**b["models"]}
assert all(v["peak_rss_bytes_process"]>0 for v in out["models"].values())
print(json.dumps(out,indent=2))
if len(sys.argv)>3:Path(sys.argv[3]).write_text(json.dumps(out,indent=2)+"\n")
