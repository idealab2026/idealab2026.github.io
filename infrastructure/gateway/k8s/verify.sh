#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
N=idealab-gateway
K=(kubectl -n "$N")
WORK=$(mktemp -d)
PIDS=()
cleanup(){ for p in "${PIDS[@]}"; do kill "$p" 2>/dev/null || true; done; rm -rf "$WORK"; }
trap cleanup EXIT
python make_secrets.py "$WORK/keys.env"
kubectl apply -f k8s/namespace.yaml
"${K[@]}" create secret generic gateway-keys --from-env-file="$WORK/keys.env" >/dev/null
kubectl apply -f k8s/gateway.yaml
"${K[@]}" patch configmap gateway-config --type merge -p '{"data":{"METRICS_SCOPE":"ci_test","REQUESTS_PER_MINUTE":"2"}}'
"${K[@]}" rollout restart deployment/gateway
kubectl apply -f k8s/smol.yaml
"${K[@]}" rollout status deployment/gateway --timeout=150s
"${K[@]}" rollout status deployment/smol --timeout=600s
test "$("${K[@]}" get deployment gateway -o jsonpath='{.status.readyReplicas}')" = 2
# Force controller reconciliation by deleting a specific pod.
OLD=$("${K[@]}" get pods -l app=gateway -o jsonpath='{.items[0].metadata.name}')
"${K[@]}" delete pod "$OLD" --wait=true
"${K[@]}" wait --for=condition=Ready pod -l app=gateway --timeout=150s
test "$("${K[@]}" get deployment gateway -o jsonpath='{.status.readyReplicas}')" = 2
if "${K[@]}" get pod "$OLD" >/dev/null 2>&1; then exit 1; fi
"${K[@]}" scale deployment/gateway --replicas=3
"${K[@]}" rollout status deployment/gateway --timeout=150s
test "$("${K[@]}" get deployment gateway -o jsonpath='{.status.readyReplicas}')" = 3
"${K[@]}" set image deployment/gateway gateway=idealab-gateway:0.1.1
"${K[@]}" rollout status deployment/gateway --timeout=150s
test "$("${K[@]}" get deployment gateway -o jsonpath='{.spec.template.spec.containers[0].image}')" = idealab-gateway:0.1.1
"${K[@]}" rollout undo deployment/gateway
"${K[@]}" rollout status deployment/gateway --timeout=150s
test "$("${K[@]}" get deployment gateway -o jsonpath='{.spec.template.spec.containers[0].image}')" = idealab-gateway:0.1.0
P1=$("${K[@]}" get pods -l app=gateway -o jsonpath='{.items[0].metadata.name}')
P2=$("${K[@]}" get pods -l app=gateway -o jsonpath='{.items[1].metadata.name}')
"${K[@]}" port-forward "pod/$P1" 18080:8080 >"$WORK/p1.log" 2>&1 & PIDS+=($!)
"${K[@]}" port-forward "pod/$P2" 18081:8080 >"$WORK/p2.log" 2>&1 & PIDS+=($!)
for i in $(seq 1 30); do if curl -fsS http://127.0.0.1:18080/health && curl -fsS http://127.0.0.1:18081/health; then break; fi; sleep 1; done
python - "$WORK/keys.env" <<'PY'
import json,sys,time,urllib.request,urllib.error
from pathlib import Path
keys=dict(l.split("=",1) for l in Path(sys.argv[1]).read_text().splitlines())
def call(port,path,key,data=None):
    req=urllib.request.Request(f"http://127.0.0.1:{port}"+path,headers={"X-API-Key":key,"Content-Type":"application/json"},data=json.dumps(data).encode() if data else None)
    try:
        with urllib.request.urlopen(req,timeout=60) as r:return r.status,json.load(r)
    except urllib.error.HTTPError as e:return e.code,json.load(e)
s,health=call(18080,"/v1/status",keys["OBSERVER_KEY"])
assert s==200 and any(b["model"]=="smollm2-135m" and b["state"]=="ready" for b in health["backends"])
if time.time()%60>45:time.sleep(61-time.time()%60)
data={"question":"Say hello in one sentence.","model":"smollm2-135m","max_new_tokens":8}
for port in (18080,18081):
    s,r=call(port,"/v1/generate",keys["KEY_OBSERVATORIO"],data)
    assert s==200 and r["model"]=="smollm2-135m" and r["usage"]["output_tokens"]>0,(s,r.get("detail"))
s,_=call(18081,"/v1/generate",keys["KEY_OBSERVATORIO"],data);assert s==429,s
s,m=call(18080,"/v1/metrics",keys["OBSERVER_KEY"])
assert s==200 and m["total"]["success"]==2 and m["total"]["requests"]==3
print(json.dumps({"scope":"ci_test","pod_recovery":True,"replicas":3,"rolling_update":True,"rollback":True,"shared_rate_limit":True,"shared_metrics":True,"actual_backend":"smollm2-135m","metrics":m["total"]}))
PY
