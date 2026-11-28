"""Prove the two matrices match MIDAS's frozen input digest, without touching its ledger.

The digest is defined by weekly_ml/run.py; it sorts by signal_date/ticker,
so it does NOT prove original training row order. Retain the original
unsorted CSV and original library versions for exact numerical replication.
"""
import hashlib,json
from pathlib import Path
import pandas as pd

def verify(labelled_path,live_path,forecast_path):
    forecast=json.loads(Path(forecast_path).read_text())
    frames=[pd.read_csv(p,float_precision="round_trip") for p in (labelled_path,live_path)]
    h=hashlib.sha256()
    for frame in frames:
        if not {"signal_date","ticker"}<=set(frame) or frame.duplicated(["signal_date","ticker"]).any():
            raise ValueError("Invalid source matrix")
        ordered=frame.sort_values(["signal_date","ticker"]).reset_index(drop=True)
        h.update(ordered.to_csv(index=False,float_format="%.12g").encode("utf-8"))
    digest=h.hexdigest()
    if digest!=forecast["input_digest"]:raise ValueError("Production input digest mismatch: not the frozen training data")
    training=forecast["training"];labelled,live=frames
    if len(labelled)!=training["all_labelled_rows"] or len(live)!=training["live_tickers"]:
        raise ValueError("Frozen row count mismatch")
    if labelled.target_end_date.max()>forecast["asof"] or live.signal_date.nunique()!=1 or live.signal_date.iloc[0]!=forecast["asof"]:
        raise ValueError("Frozen cutoff mismatch")
    return {"forecast_asof":forecast["asof"],"input_digest":digest,
      "labelled_sha256":hashlib.sha256(Path(labelled_path).read_bytes()).hexdigest(),
      "live_sha256":hashlib.sha256(Path(live_path).read_bytes()).hexdigest(),
      "forecast_sha256":hashlib.sha256(Path(forecast_path).read_bytes()).hexdigest(),
      "original_row_order_proven":False,"original_library_versions":forecast.get("library_versions")}
