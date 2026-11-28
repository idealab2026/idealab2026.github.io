# Local Kubernetes demonstration

A real Deployment of the same API image, not a cloud cluster. This example uses kind (Kubernetes in Docker), available for macOS Intel/Apple Silicon with a compatible Docker engine. Requires local Docker/kubectl/kind; no managed Kubernetes or billing.

From the repository root, with Docker running:
```sh
docker build -t idea-lab-api:0.1.0 infrastructure/api
docker build --label demo.revision=0.1.1 -t idea-lab-api:0.1.1 infrastructure/api
kind create cluster --name idea-lab-research --image kindest/node:v1.32.2
kind load docker-image --name idea-lab-research idea-lab-api:0.1.0 idea-lab-api:0.1.1
bash infrastructure/k8s/verify.sh
kind delete cluster --name idea-lab-research
```
The second image changes only an OCI label to demonstrate a rolling revision and rollback, not a new application feature. The secret check uses a random ephemeral token in a read-only mount, not a genuine API secret. In production, Kubernetes Secrets are base64-encoded and require RBAC, encryption at rest and external secret management; none of those cluster-wide guarantees are implied by this demo. No real credentials are needed or committed. Readiness is process readiness; upstream failures return HTTP 503 rather than taking all Pods down.

ES: El Deployment controla réplicas y actualizaciones; el Service expone un DNS y un punto estable; el ConfigMap inyecta configuración y un Secret temporal se monta sin registrar el valor. Las probes y límites controlan disponibilidad y consumo.
EN: A namespaced Deployment manages replicated Pods, a ClusterIP Service provides stable access, and a ConfigMap supplies non-sensitive settings. The isolated test checks startup, readiness, scaling, rolling updates, rollback and an ephemeral secret mount.

Q: What is the difference between Deployment and Pod? A: A Pod runs containers; a Deployment reconciles a ReplicaSet and manages revisions.
Q: Is this GKE experience? A: No. This is a local Kubernetes cluster using kind. No managed cluster or cloud billing.
Q: Is a Secret inherently encrypted? A: No. Encryption at rest and access controls must be configured separately.
