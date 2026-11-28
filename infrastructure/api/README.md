# IDEA LAB public research API — 0.1.0

Read-only experimental service. No deployment to paid infrastructure; no credentials; no mutation of the original research. The static corporate website does not package this directory.

## Run locally
From this directory, Python 3.12:
```sh
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements-dev.txt
python -m pytest -q
uvicorn app.main:app --host 127.0.0.1 --port 8080 --no-access-log
```
Open /docs for Swagger, /openapi.json for the contract and /health for liveness. Run tests/smoke_public.py against a running server to check actual public sources. The Docker smoke test uses the same service.
```sh
docker build -t idea-lab-api:0.1.0 .
docker run --rm --read-only --tmpfs /tmp -p 127.0.0.1:8080:8080 idea-lab-api:0.1.0
```

## Endpoint contract
- GET /v1/projects and /v1/projects/{project_id}: public project catalog.
- GET /v1/midas/algorithms: paginated validated catalog; not a leaderboard.
- GET /v1/midas/results/{slot}: catalog result, retaining null values. The actual live paper ranking uses other sources and is deliberately not yet exposed.
- GET /v1/psicohistoria/predictions: frozen NEWCONF2027 probabilities, validated against the public manifest SHA-256; optional country_id, offset, limit. Not realized outcomes or proof of predictive skill.
- GET /health: process-only health, not dependency readiness.

The repository uses dependency version pins and a Python patch-version base tag. For byte-identical image builds pin an approved digest, OS packages and hashed wheel lockfile. Tests use synthetic fixtures explicitly; the separate smoke test reads live public files. No API accepts arbitrary URLs or private input.

## Cloud Run — prepared, not deployed
Cloud Run Free Tier requires an active billing account; excess CPU, memory, requests, network and Artifact Registry may be billable. Alerts do not guarantee zero cost. See https://cloud.google.com/run/pricing and https://docs.cloud.google.com/free/docs/free-cloud-features. Do not execute cloud deployment commands without separate billing authorization. Container listens on the injected PORT. Example configuration (documentation only): request-based billing, minimum instances 0, maximum 1, 1 CPU, 512 MiB memory, authenticated invocation, no public exposure by default. Local execution is the zero-infrastructure-cost demonstration.

## Interview / entrevista
ES: FastAPI valida parámetros y respuestas mediante Pydantic; la capa de servicio aplica contratos de dominio y la capa de fuentes limita las lecturas a HTTPS públicas. SHA-256 vincula predicciones al manifiesto congelado. El contenedor corre con UID 10001. CI verifica pruebas y un smoke test real.
EN: FastAPI validates requests and responses with Pydantic. The service layer enforces research contracts and the source adapter only fetches allowlisted public HTTPS datasets. Forecast custody is checked against its SHA-256 manifest. The non-root container is exercised by CI.

Q: Why not send every result through an LLM? A: Structured queries require deterministic, source-verified numbers; generation is optional.
Q: Why return 503? A: A missing, corrupt or unverifiable source is not equivalent to zero or a successful prediction.
Q: What is the distinction between local Docker and Cloud Run? A: The same portable image can run locally or on a managed platform; cloud deployment introduces billing and IAM.
