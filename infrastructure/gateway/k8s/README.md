# Gateway on single-node kind
This is separate from the previously verified research API cluster. Deploys the gateway, SmolLM2 and optionally Qwen3 on a local Kubernetes cluster, not GKE. One SQLite PVC is shared by gateway replicas on one node only; do not extend to multiple nodes/cloud without distributed transactional storage. ClusterIP only, no Ingress. Secrets generated outside Git; no public credentials. Container security policy is restricted, but this demo does not enforce east-west NetworkPolicy or production secret encryption.

```sh
cd infrastructure/gateway
docker build --target gateway -t idealab-gateway:0.1.0 .
docker build --target gateway --label demo.revision=0.1.1 -t idealab-gateway:0.1.1 .
docker build --target inference -t idealab-inference:0.1.0 .
kind create cluster --name idea-lab-gateway --image kindest/node:v1.32.2
kind load docker-image --name idea-lab-gateway idealab-gateway:0.1.0 idealab-gateway:0.1.1 idealab-inference:0.1.0
bash k8s/verify.sh
kind delete cluster --name idea-lab-gateway
```
The verification script uses ephemeral CI/test scope, actual SmolLM2 inference, 2→3 replicas, delete/recreate pod, rolling image update and rollback, and verifies that two replicas share rate limits and metrics. The second image changes an OCI label only. Qwen deployment is optional (higher memory); Compose tests both backends. On Mac use compatible Docker engine and architecture; physical Mac run not verified. Local PVC is not a production database. To deploy for personal interactive use instead of the verification script, create namespace and secret using make_secrets.py, apply gateway.yaml and smol.yaml, optionally qwen.yaml, then port-forward svc/gateway 8080:8080. Delete cluster to remove experimental state.
