# IDEA LAB LLM Gateway — isolated engineering lab
Not connected to public assistants. No credentials in Git, no cloud services, no provider API charges. Two actual server backends use pinned public Hugging Face model revisions, Transformers and CPU PyTorch; separate HTTP services. Browser ONNX model is catalog-only, never routed to server. No browser auth key in a public static page. Model quality is not certified; SmolLM2 is a small English-oriented model and Qwen is not the quantized browser build. The CI smoke tests verify transport, token counts and model selection, not assistant answer quality. Codex owns MIDAS AI and its benchmark.

## Architecture / run
FastAPI Pydantic → application API-key identity → allowlist → SQLite atomic fixed-minute limiter → project active prompt (hash verified) → bounded HTTP call to one of two local backends → token/latency/status metrics. No prompt text stored. One host/SQLite volume only; not a distributed system; backend generation can finish after client timeout. Model cache persists in volumes; first run downloads public weights (substantial RAM/disk). Compose exposes only gateway on loopback; model ports are internal. Use a separate local secrets file.
```sh
cd infrastructure/gateway
export GATEWAY_ENV_FILE="$(mktemp -d)/gateway.env"
python make_secrets.py "$GATEWAY_ENV_FILE"
docker compose up -d --build
docker compose ps
# Read local credentials from the file without committing or sharing it.
# Open http://localhost:8080/docs and http://localhost:8080/dashboard
# X-API-Key header: project credential for generation, observer for metrics.
docker compose down
```
For a limited-memory Mac, start only gateway and smol (`docker compose up -d --build gateway smol`), select smollm2-135m explicitly. The CPU torch wheel index in Docker is for Linux x86_64; on ARM use an amd64 emulated build or adapt to verified ARM wheels. No physical Mac verification yet. Stop volumes only when you intend to delete local metrics/cache.

## Prompt governance
Per-project v1/v2 JSON, active pointer with SHA-256. Local CLI compares, evaluates template contracts, and switches versions (rollback by reactivating previous version). Version definitions in Git; production approval and semantic evaluations separate. No write/admin HTTP endpoints. Run inside a local Python venv from this directory; after changing active.json rebuild gateway. Browser prompts not integrated.
```sh
pip install -r requirements.txt pytest
python -m app.governance evaluate midas v2
python -m app.governance compare midas v1 v2
python -m app.governance activate midas v2
python -m app.governance activate midas v1
python -m pytest -q
```

## Metrics
Authenticated dashboard and NDJSON export. Project/model/mode/scope/date, success/error status, latency mean/p50/p95 on successful calls, actual tokenizer counts. Null for unavailable metrics, no fabricated public traffic, CI scope separate. No browser telemetry, uptime series, resource monitoring, RAG quality or benchmark ingestion yet. API errors before identity/validation not in inference metrics. No paid inference provider; electricity and hardware costs unmeasured. Export schema and BigQuery SQL in cloud/. Local metrics are intended for non-sensitive experiments only; no public dashboard deployment.

ES: El gateway autentica la aplicación, autoriza modelos por política, recupera el prompt activo y enruta una llamada HTTP real a un servidor de inferencia. Mide latencia y tokens reales y devuelve errores controlados.
EN: The gateway authenticates the calling application, authorizes model access, resolves a versioned prompt, routes an actual HTTP request to a local inference backend, and records token counts, latency and errors.
Q: Gateway vs model server? A: Gateway applies cross-cutting policies; model server loads weights and generates.
Q: Can you enforce model access in WebGPU? A: Not when execution is entirely under visitor control.
Q: How do you enforce rate limits across replicas? A: Current SQLite transactions cover one shared file on one host. Distributed deployment needs a shared atomic store such as Redis.
Q: How do you roll back prompts? A: Re-activate the previous immutable version and rebuild/reload after review; hashes detect drift.
Q: What does the test demonstrate? A: Actual transport and local model execution plus policy checks; not RAG correctness, production uptime, or answer quality.
