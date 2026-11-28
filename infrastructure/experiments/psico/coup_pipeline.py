"""Reproduce the existing global_recent COUP retrospective baseline from annual counts."""
import json
import math
from pathlib import Path
from public_sources import read,atomic_json

def extract(out):
    panel,ev=read("panel");backtest,bev=read("backtest")
    return atomic_json(Path(out)/"extracted.json",{"panel":panel,"backtest":backtest,"sources":[ev,bev]})

def validate(path):
    d=json.loads(Path(path).read_text());p=d["panel"];b=d["backtest"];rows=p["annual"]
    if (p["status"]!="RETROSPECTIVE_ORIGIN_PANEL_NO_MODEL_NO_FORECAST" or b["status"]!="RETROSPECTIVE_NOT_ASOF_NOT_PROSPECTIVE"
      or p["new_forecasts"] or p["modified_forecasts"] or b["new_forecasts"] or b["modified_forecasts"]
      or len(rows)!=75 or [r["year"] for r in rows]!=list(range(1950,2025))
      or any(not 0<=r["strict_positive"]<=r["n"] or r["strict_positive"]!=r["relaxed_positive"] for r in rows)
      or sum(r["n"] for r in rows)!=p["n"]):
        raise ValueError("Invalid frozen panel")
    return path

def preprocess(path):
    d=json.loads(Path(path).read_text())
    rows={r["year"]:{"n":r["n"],"k":r["strict_positive"]} for r in d["panel"]["annual"]}
    return atomic_json(Path(path).with_name("prepared.json"),{"rows":rows,"sources":d["sources"],"frozen":d["backtest"]["results"]})

def fit(path):
    d=json.loads(Path(path).read_text());r=d["rows"];folds=[]
    for y in range(1980,2025):
        history=[r[str(t)] for t in range(y-6,y-1)]
        p=(1+sum(x["k"] for x in history))/(2+sum(x["n"] for x in history))
        folds.append({"year":y,"n":r[str(y)]["n"],"k":r[str(y)]["k"],"p":p,"training_last_year":y-2})
    return atomic_json(Path(path).with_name("fitted.json"),{"folds":folds,"sources":d["sources"],"frozen":d["frozen"]})

def evaluate(path):
    d=json.loads(Path(path).read_text());folds=d["folds"];frozen=d["frozen"];n=0;k=0;bs=0;ll=0
    expected={f["year"]:f for f in frozen["folds"]}
    for row in folds:
        p=row["p"];a=row["n"];b=row["k"]
        if row["training_last_year"]>=row["year"] or not 0<p<1:raise ValueError("Invalid temporal fit")
        brier=(b*(1-p)**2+(a-b)*p**2)/a
        loss=(-b*math.log(p)-(a-b)*math.log1p(-p))/a
        score=expected[row["year"]]["scores"]["global_recent"]
        if abs(brier-score["brier"])>1e-8 or abs(loss-score["log_loss"])>1e-8:raise ValueError("Frozen fold mismatch")
        row.update(brier=brier,log_loss=loss);n+=a;k+=b;bs+=a*brier;ll+=a*loss
    ref=frozen["models"]["global_recent"]
    if n!=frozen["n"] or k!=frozen["positives"] or abs(bs/n-ref["brier"])>1e-8 or abs(ll/n-ref["log_loss"])>1e-8:
        raise ValueError("Frozen pooled metrics mismatch")
    return atomic_json(Path(path).with_name("evaluated.json"),{"status":"RETROSPECTIVE_REPRODUCTION_NOT_NEW_FORECAST",
        "model":"global_recent","n":n,"positives":k,"brier":bs/n,"log_loss":ll/n,"folds":folds,
        "sources":d["sources"],"quality_passed":True,"new_forecasts":0,"modified_forecasts":0})

def register(path):
    d=json.loads(Path(path).read_text())
    if d["quality_passed"] is not True:raise ValueError("Quality gate failed")
    return atomic_json(Path(path).with_name("registered.json"),d)

def publish(path):
    d=json.loads(Path(path).read_text())
    if d["quality_passed"] is not True or d["new_forecasts"] or d["modified_forecasts"]:raise ValueError("Publication gate failed")
    target=Path(path).parent/"local-publication"/"coup-baseline.json"
    atomic_json(target,d)
    print("AIRFLOW_LOCAL_PUBLICATION",json.dumps({k:v for k,v in d.items() if k not in ("folds","sources")}))
    return str(target)
