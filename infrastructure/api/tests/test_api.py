import hashlib
import json
from contextlib import asynccontextmanager
import httpx
from fastapi.testclient import TestClient
import pytest
from app.main import create_app
from app.sources import PublicSourceClient,SOURCES
from app.service import ResearchService

ROSTER={"schema":"idea_lab_strategy_coverage_v1","expected":1,"entries":[
 {"slot":"IL-001","name":"Fixture","group":"Fixture","activity":"unavailable","record_status":"not_migrated","return_pct":None}]}
FORECAST={"schema":"idealab.psico.prospective_newconf_2027.v1","forecast_id":"FIXTURE","countries":[
 {"country_id":"100","p_model":0.1,"p_baseline_global_5y":0.05}]}
RAW=json.dumps(FORECAST).encode()
MANIFEST={"schema":"idealab.psico.prospective_newconf_2027_manifest.v1","forecast_id":"FIXTURE",
 "forecast_sha256":hashlib.sha256(RAW).hexdigest(),"status":"ISSUED_PROSPECTIVE_UNRESOLVED",
 "issued_country_count":1,"target_year":2027,"demonstrated_predictive_skill":False}

@pytest.fixture
def client():
    app=create_app()
    def handler(req):
        if str(req.url)==SOURCES["roster"]:return httpx.Response(200,json=ROSTER)
        if str(req.url)==SOURCES["forecast"]:return httpx.Response(200,content=RAW)
        if str(req.url)==SOURCES["manifest"]:return httpx.Response(200,json=MANIFEST)
        return httpx.Response(404)
    @asynccontextmanager
    async def lifespan(a):
        async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as http:
            a.state.service=ResearchService(PublicSourceClient(http))
            yield
    app.router.lifespan_context=lifespan
    with TestClient(app) as c:
        yield c

def test_health_and_openapi(client):
    assert client.get("/health").json()["status"]=="ok"
    assert "/v1/midas/results/{slot}" in client.get("/openapi.json").json()["paths"]
    assert client.get("/docs").status_code==200

def test_projects(client):
    assert len(client.get("/v1/projects").json())==6
    assert client.get("/v1/projects/unknown").status_code==404

def test_algorithms(client):
    response=client.get("/v1/midas/algorithms").json()
    assert response["total"]==1 and response["items"][0]["slot"]=="IL-001"
    assert len(response["evidence"]["sha256"])==64
    assert client.get("/v1/midas/algorithms?offset=1").json()["items"]==[]
    assert client.get("/v1/midas/algorithms?limit=101").status_code==422

def test_results_missing_is_not_zero(client):
    assert client.get("/v1/midas/results/IL-001").json()["item"]["return_pct"] is None
    assert client.get("/v1/midas/results/IL-002").status_code==404
    assert client.get("/v1/midas/results/invalid").status_code==422

def test_forecast(client):
    r=client.get("/v1/psicohistoria/predictions?country_id=100")
    assert r.status_code==200 and r.json()["items"][0]["probability"]==0.1
    assert r.json()["items"][0]["demonstrated_predictive_skill"] is False
    assert client.get("/v1/psicohistoria/predictions?country_id=999").status_code==404

def test_bad_manifest_fails_closed(client,monkeypatch):
    monkeypatch.setitem(MANIFEST,"forecast_sha256","0"*64)
    assert client.get("/v1/psicohistoria/predictions").status_code==503

def test_bad_roster_fails_closed(client,monkeypatch):
    monkeypatch.setitem(ROSTER,"schema","invalid")
    assert client.get("/v1/midas/algorithms").status_code==503
