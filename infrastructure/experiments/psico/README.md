# PSICOHISTORIA explainability and orchestration — isolated research

Source commit: 6aed200e79395c09c3b30fc4b030a0629ac44df2. Public inputs only. No replacement of emitted forecasts or existing workflows.

## Alibi and MLflow
The existing NEWCONF2027 empirical-Bayes model is reconstructed from its frozen public prediction document and SHA-256 manifest. The model uses historical country counts and binary origin-year activity. Unique integer counts must reproduce all 196 probabilities within 1e-11 before explanations are computed. Grouped Alibi KernelShap uses the observed 196-country feature background, so the two historical counts are not independently perturbed into impossible combinations. Mean absolute SHAP summarizes global magnitude; local values must add up to the predicted probability. Flipping origin activity while holding historical counts fixed is a model sensitivity, not a causal intervention. No outcome labels, new forecasts or demonstrated predictive skill. Local HTML visualization and JSON are CI artifacts, not deployed to the public site.

```sh
python3.11 -m venv .venv-alibi
source .venv-alibi/bin/activate
pip install -r requirements.txt
python explain_newconf.py --out /tmp/idealab-explain --tracking
```
MLflow logs source identity, model configuration, reconstruction and explanation diagnostics, artifacts and a registered prediction wrapper locally. It is a reconstruction of an already-fitted model, not a new training run.

## Airflow
Reproduces the existing COUP global_recent Laplace baseline for origins 1980–2024 using annual country-year counts. It fits each origin from years t-6 to t-2 only, scores Brier and log loss, checks all 45 folds and the pooled scores against the frozen public benchmark. Publication is local and only after validation; no changes to scientific registers. TaskFlow DAG: extract → quality → preprocess → fit → evaluate → register → publish. SQLite, no scheduler or paid infrastructure.

Use a separate environment because Airflow 2 and MLflow have different SQLAlchemy constraints:
```sh
python3.11 -m venv .venv-airflow
source .venv-airflow/bin/activate
pip install "apache-airflow==2.10.5" --constraint "https://raw.githubusercontent.com/apache/airflow/constraints-2.10.5/constraints-3.11.txt"
export AIRFLOW_HOME="$(mktemp -d)"
export AIRFLOW__CORE__LOAD_EXAMPLES=False
export IDEALAB_RUN_DIR="$(mktemp -d)"
airflow db migrate
python coup_dag.py
```
The report is written to IDEALAB_RUN_DIR/local-publication only.

ES: El DAG reproduce un benchmark retrospectivo, con tareas dependientes, reintentos y controles de publicación. Alibi explica un modelo probabilístico congelado mediante contribuciones SHAP locales y magnitudes globales; no infiere causalidad.
EN: Airflow orchestrates a reproducible retrospective baseline with explicit data validation and a quality-gated local report. Alibi explains the frozen probability function with grouped KernelSHAP and model-only sensitivity, not causal claims.

Q: Why use a grouped explanation? A: Historical events and exposures must remain mutually feasible.
Q: Why not train on 2027 outcomes? A: Outcomes are unavailable and the issue is frozen.
Q: Does Airflow replace the current production scheduler? A: No; this is a manually executed standalone DAG.
