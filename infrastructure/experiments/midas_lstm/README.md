# MIDAS isolated LSTM comparison

Source contract: institutional MIDAS weekly_ml/models.py and weekly_ml/data.py. Existing Keras uses 26 weekly log-return lags (newest first), one LSTM with 24 units, one linear scalar output, MAE, Adam 0.002, seed 42, 4 epochs, batch size 512, no shuffle. Its target is following week's adjusted open-to-close return. Same features, order, target, train-only normalization, and purged validation for both frameworks. Initializers and kernel implementations differ; timings are diagnostic on one CPU and no equivalence of weights is claimed.

The actual labelled feature matrix is constructed at runtime from vendor OHLC and not committed in the public repository. To make a genuine like-for-like comparison, export the authorized, locally captured labelled matrix from the original build_dataset result as CSV including ticker, signal_date, target_end_date, target_return and wret_lag_1 through 26, with immutable provenance. Do not fetch a changing market history or use synthetic observations to claim real-market skill. Keep dataset out of Git and do not touch any trading ledger. The synthetic smoke is only proof that the training and tracking pipelines execute.

Install in a separate Python 3.11 or 3.12 environment:
```sh
python -m pip install torch==2.7.1 --index-url https://download.pytorch.org/whl/cpu
python -m pip install -r requirements.txt pytest
python -m pytest -q
python benchmark.py --synthetic --out /tmp/idealab-lstm-smoke --tracking
python benchmark.py --dataset /path/to/authorized-labelled.csv --source-commit <institutional-sha> --out /tmp/idealab-lstm-real --tracking
```
Artifacts: report.json, framework weights, normalization, dataset/code hashes and local SQLite MLflow runs/registry. Training and validation are chronological, not randomized. Source cutoff and actual export provenance must be verified before interpretation. No promotion or paper competition integration. MLflow backend/registry stays on disk, no remote server.

ES: PyTorch usa nn.LSTM y DataLoader; calcula pérdida L1, propaga gradientes y actualiza pesos mediante Adam. Keras replica la arquitectura original. MLflow registra parámetros, métricas, artefactos y versiones en SQLite.
EN: Both frameworks receive the identical 26-lag tensor and target, with a purged chronological holdout and train-only scaling. PyTorch uses an explicit gradient loop, while Keras uses fit. MLflow tracks metrics and model artifacts locally.

Q: Why purge? A: Labels extending into validation would reveal future target information.
Q: Is synthetic MAE proof of trading skill? A: No; it proves execution of the software path only.
Q: Is this in production? A: No; separate experimental run.
