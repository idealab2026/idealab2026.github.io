"""Live read-only integration test against public Pages, through a running container."""
import json
import urllib.request
def get(path):
    with urllib.request.urlopen("http://127.0.0.1:8080"+path,timeout=45) as r:
        return json.load(r)
assert get("/health")["status"]=="ok"
assert len(get("/v1/projects"))==6
a=get("/v1/midas/algorithms?limit=1")
assert a["total"]>=1 and len(a["items"])==1
r=get("/v1/midas/results/"+a["items"][0]["slot"])
assert r["item"]["slot"]==a["items"][0]["slot"]
f=get("/v1/psicohistoria/predictions?limit=1")
assert f["total"]==196 and len(f["items"])==1
assert f["items"][0]["status"]=="ISSUED_PROSPECTIVE_UNRESOLVED"
print(json.dumps({"algorithm_count":a["total"],"forecast_count":f["total"],"roster_sha256":a["evidence"]["sha256"],"forecast_sha256":f["evidence"]["sha256"]}))
