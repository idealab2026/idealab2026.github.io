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

## Separate-process resource comparison and exact input custody
PyTorch's LSTM has two bias vectors per gate, unlike Keras's single vector. For 24 units and one input feature the trainable counts including the Dense/Linear head are 2,617 versus 2,521. Separate subprocess reports measure cumulative process peak RSS and CPU time; they include runtime/library overhead, not just model tensor memory.
```sh
python benchmark.py --synthetic --torch-only --out /tmp/torch-isolated
python benchmark.py --synthetic --keras-only --out /tmp/keras-isolated
python compare_reports.py /tmp/torch-isolated/report.json /tmp/keras-isolated/report.json
```
For the actual frozen MIDAS input, preserve full labelled and live CSV matrices exported from the original build_dataset output, including every column in original order. Do not fetch a new provider history and call it identical. Supply both plus the immutable forecast JSON:
```sh
python benchmark.py --dataset /path/to/labelled.csv --production-live /path/to/live.csv --production-forecast /path/to/frozen-forecast.json --torch-only --out /tmp/torch-real
python benchmark.py --dataset /path/to/labelled.csv --production-live /path/to/live.csv --production-forecast /path/to/frozen-forecast.json --keras-only --out /tmp/keras-real
python compare_reports.py /tmp/torch-real/report.json /tmp/keras-real/report.json
```
The original 2026-11-27 forecast records 126,188 labelled rows, 488 live tickers, 113,012 train rows, 12,688 validation rows, input_digest 3f0a70f8f3203046b75cc61b9bcdbf2a0f11c1c8f5c95903a81fd374393b0536. It is not possible to invert a SHA-256 digest into the feature matrix. Custody verification uses the exact sorted-frame hash contract. It does not prove original row order or bit-identical environment; preserve both separately. The existing actual Keras MAE 0.03557570881203736 is not comparable to synthetic PyTorch MAE.
Source: https://github.com/idealab2026/laboratorio-cuantitativo/blob/602f18b5a83b6a6f97987f1143604db4acb8d694/weekly_ml_state/forecasts/2026-11-27.json
