#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
N=idealab-gateway
K=(kubectl -n "$N")
WORK=$(mktemp -d)
cleanup(){ rm -rf "$WORK"; }
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
# Select only Ready, non-terminating pods from the rolled-back Deployment.
# Kubernetes may still list terminating old Pods after rollout status succeeds.
SELECTED=$("${K[@]}" get pods -l app=gateway -o json | python -c 'import json,sys; p=[x for x in json.load(sys.stdin)["items"] if not x["metadata"].get("deletionTimestamp") and x["status"].get("phase")=="Running" and any(c["type"]=="Ready" and c["status"]=="True" for c in x["status"].get("conditions",[]))]; assert len(p)==3; print(p[0]["status"]["podIP"],p[1]["status"]["podIP"],p[2]["metadata"]["name"])')
read -r IP1 IP2 P3 <<< "$SELECTED"
# Direct requests from a third pod avoid stale host port-forwards, while
# proving the two distinct gateway replicas actually share their SQLite PVC.
# Credentials are read from the injected Secret, never printed.
"${K[@]}" exec -i "$P3" -- python - "$IP1" "$IP2" <<'PY'
import json,sys,time,urllib.request,urllib.error,os
def call(host,path,key=None,data=None):
    headers={"Content-Type":"application/json"}
    if key:headers["X-API-Key"]=os.environ[key]
    req=urllib.request.Request(f"http://{host}:8080"+path,headers=headers,data=json.dumps(data).encode() if data else None)
    try:
        with urllib.request.urlopen(req,timeout=60) as r:return r.status,json.load(r)
    except urllib.error.HTTPError as e:return e.code,json.load(e)
ip1,ip2=sys.argv[1:]
assert ip1!=ip2
s,health=call("gateway","/health")
assert s==200 and health["status"]=="ok"
s,health=call(ip1,"/v1/status","OBSERVER_KEY")
assert s==200 and any(b["model"]=="smollm2-135m" and b["state"]=="ready" for b in health["backends"])
if time.time()%60>45:time.sleep(61-time.time()%60)
data={"question":"Say hello in one sentence.","model":"smollm2-135m","max_new_tokens":8}
for ip in (ip1,ip2):
    s,r=call(ip,"/v1/generate","KEY_OBSERVATORIO",data)
    assert s==200 and r["model"]=="smollm2-135m" and r["usage"]["output_tokens"]>0,(s,r.get("detail"))
s,_=call(ip2,"/v1/generate","KEY_OBSERVATORIO",data);assert s==429,s
s,m=call(ip1,"/v1/metrics","OBSERVER_KEY")
assert s==200 and m["total"]["success"]==2 and m["total"]["requests"]==3
print(json.dumps({"scope":"ci_test","pod_recovery":True,"replicas":3,"rolling_update":True,"rollback":True,"shared_rate_limit":True,"shared_metrics":True,"actual_backend":"smollm2-135m","metrics":m["total"]}))
PY
