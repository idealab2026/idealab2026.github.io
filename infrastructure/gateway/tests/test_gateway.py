import asyncio,json
from pathlib import Path
import httpx,pytest
from fastapi.testclient import TestClient
from app.main import create_app
from app.policy import Settings,PROJECTS,MODELS
from app.governance import Registry,evaluate
from app.metrics import Metrics

KEYS={p:(str(i+1)*40) for i,p in enumerate(PROJECTS)}
OBS="z"*40
def auth(p):return {"X-API-Key":KEYS[p]}
@pytest.fixture
def test_client(tmp_path):
    def handler(req):
        body=json.loads(req.content)
        assert "untrusted data" in body["system"]
        model="smollm2-135m" if req.url.host=="smol" else "qwen3-0.6b"
        if "timeout" in body["user"]:raise httpx.ReadTimeout("test")
        if "bad" in body["user"]:return httpx.Response(200,json={"model":"wrong"})
        return httpx.Response(200,json={"model":model,"revision":MODELS[model]["revision"],"text":"test response","usage":{"input_tokens":16,"output_tokens":3}})
    cfg=Settings(KEYS,OBS,"ci_test",2,3,str(tmp_path/"metrics.db"),"prompts")
    with TestClient(create_app(cfg,httpx.MockTransport(handler))) as c:yield c

def test_auth_and_registry(test_client):
    c=test_client
    assert c.get("/health").status_code==200
    assert c.get("/v1/models").status_code==401
    assert c.get("/v1/models",headers=auth("observatorio")).json()[0]["id"]=="smollm2-135m"
    assert c.get("/v1/prompts/active",headers=auth("midas")).json()["version"]=="v1"
    assert c.get("/v1/metrics",headers=auth("midas")).status_code==403

def test_route_and_permissions(test_client):
    c=test_client
    for p,want in [("midas","qwen3-0.6b"),("observatorio","smollm2-135m")]:
        r=c.post("/v1/generate",headers=auth(p),json={"question":"hello"})
        assert r.status_code==200 and r.json()["model"]==want and r.json()["usage"]["input_tokens"]==16
    assert c.post("/v1/generate",headers=auth("observatorio"),json={"model":"qwen3-0.6b","question":"hello"}).status_code==403
    assert c.post("/v1/generate",headers=auth("midas"),json={"model":"qwen3-0.6b-browser","question":"hello"}).status_code==409
    assert c.post("/v1/generate",headers=auth("midas"),json={"question":"hello","project":"other"}).status_code==422
    m=c.get("/v1/metrics",headers={"X-API-Key":OBS}).json()
    assert m["total"]["requests"]==4 and m["total"]["success"]==2 and m["total"]["input_tokens"]==32
    assert m["rag_quality"] is None and m["scope"]=="ci_test"
    assert "hello" not in c.get("/v1/metrics/export",headers={"X-API-Key":OBS}).text

def test_timeout_invalid_rate(test_client):
    c=test_client
    for q,status in [("timeout",504),("bad",502),("hello",429)]:
        assert c.post("/v1/generate",headers=auth("midas"),json={"question":q}).status_code==status

def test_governance(tmp_path):
    import shutil
    shutil.copytree("prompts",tmp_path/"prompts")
    r=Registry(tmp_path/"prompts")
    for p in PROJECTS:
        assert all(evaluate(r.get(p,"v2")).values())
        assert r.active(p).version=="v1"
        r.activate(p,"v2");assert r.active(p).version=="v2"
        r.activate(p,"v1");assert r.active(p).version=="v1"
    (tmp_path/"prompts"/"midas"/"v1.json").write_text("{}")
    with pytest.raises(ValueError):r.active("midas")

def test_empty_metrics(tmp_path):
    m=Metrics(str(tmp_path/"m.db"),"local_demo").summary()
    assert m["total"]["requests"]==0 and m["total"]["p95_ms"] is None and m["total"]["input_tokens"] is None
