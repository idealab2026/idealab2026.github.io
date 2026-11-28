"""Real generation from two local transformer backends; not a quality benchmark."""
import os,json,time
from pathlib import Path
import httpx
keys=dict(line.split("=",1) for line in Path(os.environ["GATEWAY_ENV_FILE"]).read_text().splitlines())
with httpx.Client(base_url="http://127.0.0.1:8080",timeout=120) as c:
    for p,model in [("KEY_MIDAS","qwen3-0.6b"),("KEY_OBSERVATORIO","smollm2-135m")]:
        r=c.post("/v1/generate",headers={"X-API-Key":keys[p]},json={"question":"Say hello in one short sentence.","max_new_tokens":24})
        r.raise_for_status();d=r.json()
        assert d["model"]==model and d["usage"]["input_tokens"]>0 and d["usage"]["output_tokens"]>0
        print(json.dumps({k:v for k,v in d.items() if k!="text"}))
    r=c.get("/v1/metrics",headers={"X-API-Key":keys["OBSERVER_KEY"]});r.raise_for_status();m=r.json()
    assert m["scope"]=="ci_test" and m["total"]["success"]==2 and len(m["by_model"])==2
    print(json.dumps(m))
    Path(os.environ["REPORT_DIR"]).mkdir(parents=True,exist_ok=True)
    Path(os.environ["REPORT_DIR"],"metrics.json").write_text(json.dumps(m,indent=2))
    r=c.get("/v1/metrics/export",headers={"X-API-Key":keys["OBSERVER_KEY"]});r.raise_for_status()
    Path(os.environ["REPORT_DIR"],"events.ndjson").write_text(r.text)
