# IDEA LAB — engineering implementation and evidence
Snapshot: 2026-11-28. All changes isolated in institutional branches, not merged to production. No private repository, real credential, paid cloud or modified research ledger. Verification uses standard public-repository GitHub-hosted CI; execution on the local macOS host is not asserted. A repository-wide coordinator lock could not be directly inspected; branch/PR checks and lease-protected commits were used. Do not merge until the broader coordination check is satisfied.

## Inventory

| Technology | Scope | Verified status | Evidence |
| --- | --- | --- | --- |
| FastAPI, Pydantic, modular Python, structured logging, Swagger/OpenAPI | Public research API | Implemented and tested; 7/7 unit/ASGI tests and real HTTP container smoke, 64 algorithms and 196 frozen probabilities | [PR 514](https://github.com/idealab2026/idealab2026.github.io/pull/514), [CI](https://github.com/idealab2026/idealab2026.github.io/actions/runs/46133977142) |
| Docker | API | Built, UID 10001, read-only container and health endpoint verified; base patch tag and version pins, not byte-identical digest lock | Same API CI |
| Cloud Run | API | Manifest prepared, NOT deployed; billing account/overage risk | API README and cloud-run.service.yaml |
| PyTorch + TensorFlow/Keras | MIDAS isolated LSTM | Both trained and inferred on identical synthetic smoke input; purged holdout tests 2/2; real-market like-for-like comparison pending | [CI](https://github.com/idealab2026/idealab2026.github.io/actions/runs/46133977178) |
| MLflow | MIDAS | Local SQLite tracking, metrics, artifact logging and both registered model versions 1 verified | Same LSTM CI |
| MLflow | PSICOHISTORIA | Registered reconstruction of frozen model version 1; diagnostics and artifacts logged, no refit | [PR 516](https://github.com/idealab2026/idealab2026.github.io/pull/516), [CI](https://github.com/idealab2026/idealab2026.github.io/actions/runs/46134211493) |
| Kubernetes | API | kind cluster in Linux CI; two to three replicas, rollout, rollback, Service, ConfigMap, probes and ephemeral secret mount verified; no GKE or physical Mac run | [PR 515](https://github.com/idealab2026/idealab2026.github.io/pull/515), [CI](https://github.com/idealab2026/idealab2026.github.io/actions/runs/46133902096) |
| Apache Airflow | PSICOHISTORIA | 7-stage local dag.test run successful; exact COUP baseline reproduction and local quality-gated publication | PR 516, same CI |
| Alibi | PSICOHISTORIA | Grouped KernelSHAP local/global explanations on 196 frozen probabilities; model-only binary activity sensitivity; local HTML artifact, not site deployment | PR 516, same CI |
| Python wheel / OCI Distribution | IDEA LAB | Built, published to loopback repositories, retrieved, hashed and executed; provenance JSON | [PR 517](https://github.com/idealab2026/idealab2026.github.io/pull/517), [CI](https://github.com/idealab2026/idealab2026.github.io/actions/runs/46134222435) |
| JFrog Artifactory | IDEA LAB | NOT implemented; free JCR lacks native PyPI support; alternative above is explicitly not Artifactory | [JFrog documentation](https://docs.jfrog.com/artifactory/docs/jfrog-container-registry) |
| MIDAS AI | MIDAS separate workstream | Existing Qwen3/Transformers.js/ONNX/WebGPU, lexical retrieval, entity context and verified leaderboard. Hybrid embeddings, LangChain, daily operations tools, model quality benchmark and other project assistants pending; no parallel modification in this batch | [MIDAS repository](https://github.com/idealab2026/laboratorio-cuantitativo), prior PR 148 |

## Reproduce / explain / interview questions

The branch-specific READMEs contain commands, bilingual explanations, limitations and interview questions:
- API: [README](https://github.com/idealab2026/idealab2026.github.io/blob/672294314876b31c841882a61d233cbbef22c2cd/infrastructure/api/README.md), app/main.py, schemas.py, service.py, sources.py, tests/, Dockerfile, cloud-run.service.yaml.
- LSTM/MLflow: [README](https://github.com/idealab2026/idealab2026.github.io/blob/672294314876b31c841882a61d233cbbef22c2cd/infrastructure/experiments/midas_lstm/README.md), benchmark.py, config.json, test_benchmark.py.
- Kubernetes: [README](https://github.com/idealab2026/idealab2026.github.io/blob/d24912e5512e36e61cc4b07d2b51c5644025f4f7/infrastructure/k8s/README.md), namespace.yaml, api.yaml, secret-check.yaml, verify.sh.
- Alibi/Airflow/MLflow: [README](https://github.com/idealab2026/idealab2026.github.io/blob/7dba16026cc1f3b896be602af90416ff6bed7874/infrastructure/experiments/psico/README.md), explain_newconf.py, coup_pipeline.py, coup_dag.py, public_sources.py.
- Artifacts: [README](https://github.com/idealab2026/idealab2026.github.io/blob/fa2fc34ed6146faec36e48e5e6ad4bf7ec58fd3b/infrastructure/artifacts/README.md), verify.sh, api/pyproject.toml.

## Measured results (CI logs)

### MIDAS LSTM, synthetic only
Training rows 186; validation rows 78. Architecture: 26 lag inputs, 24 recurrent units, scalar output, MAE, Adam lr 0.002, seed 42, 4 epochs, batch size 512. DataLoader, explicit gradient calculation and optimizer updates for PyTorch. Keras fit with equivalent shape. Validation chronological with purged labels and train-only normalization. Timings are one small CPU experiment, not evidence of market skill or general framework performance.

| Metric | PyTorch 2.7.1+cpu | TensorFlow 2.19.1 / Keras |
| --- | ---: | ---: |
| MAE | 0.0162412580 | 0.0159253217 |
| RMSE | 0.0200737473 | 0.0197069813 |
| Train seconds | 0.0627752810 | 0.9508552650 |
| Inference seconds | 0.0010214440 | 0.0300827500 |
| MLflow registered version | 1 | 1 |

Real labelled feature matrix from original MIDAS training is not committed; obtain an authorized frozen CSV export, verify provenance and run benchmark.py --dataset on that exact data. No changes to prospective competitions.

### COUP Airflow retrospective
45 origin folds, 8,241 country-years, 186 positives. Reproduced global_recent Brier 0.021962678882991436 and log loss 0.10574116024274825 against all frozen fold metrics and pooled metrics. 0 new and 0 modified forecasts. Local SQLite task execution and atomic quality-gated report.

### NEWCONF2027 Alibi
196 frozen model rows. Maximum reconstruction error 4.724137747658119e-13; maximum SHAP additivity error 8.673617379884035e-19. Mean absolute SHAP historical counts 0.010806003370828435 (1.0806 percentage points); origin activity 0.004303877162419847 (0.4304 pp). Marginal grouped attribution, not causal inference. Alternate activity is a model sensitivity, not a feasible intervention or new forecast. MLflow version 1. HTML/JSON artifact generated; no public-site deployment.

### Artifact roundtrip
Wheel idea_lab_research_api-0.1.0-py3-none-any.whl. SHA-256 d485b6ded057a39254d9ad57ff983de958fe4aac729075eed87b9d9c28b7100a. OCI manifest digest sha256:b333b84f841171c7dbe8d4e575c81f6e9f744d73714405e8b17abd954e0394c7. Both verified against commit fa2fc34ed6146faec36e48e5e6ad4bf7ec58fd3b. Local repositories deleted after test; no public registry.

## Constraints / open items
- No Cloud Run deployment or billing activation. No managed Kubernetes.
- API exposes catalog results, not full verified live paper leaderboard or all project datasets.
- Actual market LSTM dataset comparison remains pending; synthetic metrics are not investable results.
- MLflow stores and registries are local/ephemeral in CI; run IDs are documented in the report artifacts, not a persistent server.
- Local reports are CI artifacts with short retention. Keep evidence by rerunning locally or preserving only reviewed, non-sensitive reports.
- No live Mac execution verified; no access to the global coordinator's private lock state. No merges or production publication in this batch.
- MIDAS AI semantic retrieval, LangChain and structured date/operation tools remain independent work.


## Extension: LLM gateway, GCP and observability — 2026-11-28

All branches remain isolated and unmerged. The actual MIDAS AI assistant development is assigned separately to Codex; no edits to its files. The private local coordinator/credit state is not accessible; no production merge until coordination is verified.

| Component | State at this checkpoint | Evidence |
| --- | --- | --- |
| LLM Gateway, FastAPI/Pydantic, HTTP routing, per-app authentication, model ACLs, atomic rate limiting and errors | Implemented and tested with two actual local CPU inference services | [PR 519](https://github.com/idealab2026/idealab2026.github.io/pull/519), [CI](https://github.com/idealab2026/idealab2026.github.io/actions/runs/46137957980) |
| Docker Compose, networks, volumes and non-root runtime | Built and run with real model weights and HTTP generation | Same CI |
| Transformers / PyTorch CPU inference | Real Qwen3 0.6B and SmolLM2 135M; pinned Hub revisions | Same CI |
| Prompt Governance | 4 applications, 2 versions each; render/contract tests, hash, activation and rollback verified; semantic evaluation pending | Same CI |
| Observability / architecture | Local authenticated metrics dashboard, model inventory, probe and process-resource snapshot, interactive test page; no public traffic, RAG quality, browser telemetry or uptime history | [PR 520](https://github.com/idealab2026/idealab2026.github.io/pull/520), [gateway CI](https://github.com/idealab2026/idealab2026.github.io/actions/runs/46138107679) |
| Kubernetes gateway | Initial run verified pod recovery, scaling, rollout and rollback; failed host port-forward test. Corrected test selects ready pods and uses direct in-cluster HTTP; full shared-rate/metrics verification pending | [initial run](https://github.com/idealab2026/idealab2026.github.io/actions/runs/46138102498), [corrected run](https://github.com/idealab2026/idealab2026.github.io/actions/runs/46138552564) |
| LSTM resources and custody | 3 controls and independent-process comparison verified; frozen input digest gate implemented; original full input matrices unavailable | [PR 521](https://github.com/idealab2026/idealab2026.github.io/pull/521), [CI](https://github.com/idealab2026/idealab2026.github.io/actions/runs/46138264751) |
| BigQuery batch contract | Real CI NDJSON artifact reconciled with SQL offline; schema/runbook prepared, actual BigQuery query NOT executed | [PR 522](https://github.com/idealab2026/idealab2026.github.io/pull/522), [CI](https://github.com/idealab2026/idealab2026.github.io/actions/runs/46138329664) |
| Cloud Run / GKE / Cloud Storage / Artifact Registry / Cloud Logging / IAM / Vertex AI | Design/cost review only; no resources or billing activated | Gateway cloud README |
| Public integration and deployment | Pending. Local-only architecture/observability; no public frontend API keys | Handoff and security boundary in learning guide |

### Real gateway CI measurements (2 calls, not production traffic)
Qwen3: 75 input tokens, 5 output, 1342.405991 ms. SmolLM2: 78 input, 12 output, 783.789883 ms. Two successful requests, 153 input and 17 output tokens. No paid inference API. Provider cost zero, local energy/hardware cost not measured. No quality inference from this smoke test.

### Separate-process LSTM measurements (synthetic only)
| Metric | PyTorch | TensorFlow/Keras |
| --- | ---: | ---: |
| Parameters | 2617 | 2521 |
| MAE | 0.0162412580 | 0.0159253217 |
| RMSE | 0.0200737473 | 0.0197069813 |
| Train seconds | 0.0559846840 | 0.9898796950 |
| Inference seconds | 0.0015108790 | 0.0368720450 |
| Process CPU seconds | 1.976312718 | 5.095009528 |
| Peak process RSS bytes | 515596288 | 852934656 |

Do not compare the synthetic losses to the actual historical Keras validation MAE 0.0355757088 in the frozen 2026-11-27 forecast. The original source reports 126188 labelled rows and 488 live tickers; the matrices are not committed. Hash 3f0a70f8f3203046b75cc61b9bcdbf2a0f11c1c8f5c95903a81fd374393b0536 cannot be inverted. Both frameworks must use an identical authorized export. The digest does not prove original row order.

See the companion [technical learning guide](LLM_GATEWAY_TECHNICAL_GUIDE.md) for 16 cards, bilingual descriptions, code, reproduction and five interview questions per card.
