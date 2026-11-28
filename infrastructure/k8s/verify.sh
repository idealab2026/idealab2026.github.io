#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
N=idealab-research
K="kubectl -n $N"
kubectl apply -f namespace.yaml
kubectl apply -f api.yaml
$K rollout status deployment/research-api --timeout=150s
test "$($K get deployment research-api -o jsonpath='{.status.readyReplicas}')" = 2
$K port-forward svc/research-api 18080:8080 >/tmp/idealab-portforward.log 2>&1 &
PF=$!
trap 'kill "$PF" 2>/dev/null || true' EXIT
for i in $(seq 1 30); do curl -fsS http://127.0.0.1:18080/health && break; sleep 1; done
curl -fsS http://127.0.0.1:18080/health
curl -fsS http://127.0.0.1:18080/v1/projects | python -c 'import json,sys; assert len(json.load(sys.stdin))==6'
kill "$PF" 2>/dev/null || true
$K scale deployment/research-api --replicas=3
$K rollout status deployment/research-api --timeout=150s
test "$($K get deployment research-api -o jsonpath='{.status.readyReplicas}')" = 3
$K set image deployment/research-api api=idea-lab-api:0.1.1
$K rollout status deployment/research-api --timeout=150s
test "$($K get deployment research-api -o jsonpath='{.spec.template.spec.containers[0].image}')" = idea-lab-api:0.1.1
$K rollout undo deployment/research-api
$K rollout status deployment/research-api --timeout=150s
test "$($K get deployment research-api -o jsonpath='{.spec.template.spec.containers[0].image}')" = idea-lab-api:0.1.0
# Generate a throwaway secret only in memory/on disk outside the repo.
# No shell tracing, values never printed or committed. It is not a real credential.
TOKEN_FILE=$(mktemp)
chmod 600 "$TOKEN_FILE"
trap 'rm -f "$TOKEN_FILE"; $K delete secret ephemeral-demo --ignore-not-found >/dev/null 2>&1 || true' EXIT
python -c 'import secrets,sys; sys.stdout.write(secrets.token_hex(32))' > "$TOKEN_FILE"
$K create secret generic ephemeral-demo --from-file=token="$TOKEN_FILE" >/dev/null
rm -f "$TOKEN_FILE"
kubectl apply -f secret-check.yaml
$K wait --for=jsonpath='{.status.phase}'=Succeeded pod/secret-mount-check --timeout=90s
$K logs secret-mount-check
$K delete pod secret-mount-check
$K delete secret ephemeral-demo
$K get pods -l app=research-api
echo "KUBERNETES_LOCAL_VERIFIED replicas=3 rolling_update=ok rollback=ok secret_mount=ok service=ok"
