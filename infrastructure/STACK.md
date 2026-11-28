# Engineering stack inventory

Scope: institutional engineering work, separate from the public site and research ledgers. Evidence must distinguish source implementation, test execution and deployment. No billing authorization.

| Technology | Scope | Status at initial commit | Evidence |
| --- | --- | --- | --- |
| FastAPI / Pydantic | IDEA LAB public API | Source implemented; CI pending | api/app/ |
| Python modular service, structured logging | API | Source implemented; CI pending | api/app/main.py, service.py, sources.py |
| Docker | API | Dockerfile written; image build and container smoke pending | api/Dockerfile |
| GitHub Actions | API | CI configuration written; execution pending | .github/workflows/research-api-ci.yml |
| Cloud Run | API | Configuration documented; no cloud resources created | api/README.md |
| PyTorch | MIDAS | Planned; no research results claimed | Pending separate experiment |
| MLflow | MIDAS / PSICOHISTORIA | Planned | Pending local experiment |
| Kubernetes | API | Planned | Pending local cluster verification |
| Airflow | IDEA LAB | Planned | Pending isolated DAG |
| Alibi | PSICOHISTORIA | Planned | Pending compatibility and model validation |
| Artifactory | IDEA LAB | Planned | Pending zero-cost verification |
| MIDAS AI | MIDAS | Separate workstream; existing local runtime; quality unresolved | Institutional MIDAS repository |

Next: reconcile the MIDAS LSTM's exact input and chronological split, compare PyTorch and Keras in a non-production experiment, and log artifacts locally. No claim of operational experience until the relevant test succeeds.
