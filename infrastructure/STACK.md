# Engineering stack inventory

Scope: institutional engineering work, separate from the public site and research ledgers. Evidence must distinguish source implementation, test execution and deployment. No billing authorization.

| Technology | Scope | Status at initial commit | Evidence |
| --- | --- | --- | --- |
| FastAPI / Pydantic | IDEA LAB public API | Source implemented; 7/7 tests and public HTTP smoke passed | api/app/ |
| Python modular service, structured logging | API | Source implemented; API CI passed | api/app/main.py, service.py, sources.py |
| Docker | API | Built and executed non-root; HTTP smoke passed | api/Dockerfile |
| GitHub Actions | API | API CI passed; LSTM CI independent | .github/workflows/research-api-ci.yml |
| Cloud Run | API | Manifest prepared; no cloud resources created | api/README.md |
| PyTorch | MIDAS | Implemented; PyTorch synthetic training tests passed; Keras comparison pending | experiments/midas_lstm/ |
| MLflow | MIDAS / PSICOHISTORIA | Integrated for MIDAS; SQLite compatibility failure fixed; registry test pending |
| Kubernetes | API | Planned | Pending local cluster verification |
| Airflow | IDEA LAB | Planned | Pending isolated DAG |
| Alibi | PSICOHISTORIA | Planned | Pending compatibility and model validation |
| Artifactory | IDEA LAB | Planned | Pending zero-cost verification |
| MIDAS AI | MIDAS | Separate workstream; existing local runtime; quality unresolved | Institutional MIDAS repository |

Next: reconcile the MIDAS LSTM's exact input and chronological split, compare PyTorch and Keras in a non-production experiment, and log artifacts locally. No claim of operational experience until the relevant test succeeds.

Verified API CI: https://github.com/idealab2026/idealab2026.github.io/actions/runs/46133732069 (7 tests, 64 algorithms and 196 frozen probabilities). MIDAS LSTM initial CI: 2 tests passed; SQLAlchemy 2.1 incompatibility blocked tracking before benchmark. No performance report claimed.
