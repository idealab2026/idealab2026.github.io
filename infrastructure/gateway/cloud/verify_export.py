"""Offline contract check for actual gateway NDJSON and batch analytics; not BigQuery execution."""
import argparse,datetime,json,math,re,sqlite3
from pathlib import Path
from collections import Counter

def validate(row,scope,fields):
    if set(row)!=fields:raise ValueError("Unexpected export fields")
    if row["scope"]!=scope:raise ValueError("Mixed measurement scopes")
    dt=datetime.datetime.fromisoformat(row["ts"])
    if dt.tzinfo is None:raise ValueError("Timestamp must have timezone")
    if row["project"] not in ("midas","psicohistoria","observatorio","la-telarana"):raise ValueError("Unknown application")
    if row["model"] not in ("smollm2-135m","qwen3-0.6b","qwen3-0.6b-browser"):raise ValueError("Unknown model")
    if row["mode"] not in ("server","browser"):raise ValueError("Unknown mode")
    if not isinstance(row["status"],int) or not 100<=row["status"]<=599:raise ValueError("Invalid status")
    if not isinstance(row["latency_ms"],(float,int)) or not math.isfinite(row["latency_ms"]) or row["latency_ms"]<0:raise ValueError("Invalid latency")
    for key in ("input_tokens","output_tokens"):
        v=row[key]
        if v is not None and (type(v) is not int or v<1):raise ValueError("Invalid tokens")
    if row["status"]==200:
        if row["mode"]!="server" or row["input_tokens"] is None or row["output_tokens"] is None:raise ValueError("Unexpected successful inference record")
        if not re.fullmatch(r"v[1-9][0-9]*",row["prompt_version"] or "") or not re.fullmatch(r"[a-f0-9]{64}",row["prompt_sha256"] or ""):raise ValueError("Invalid prompt custody")

def analyse(path,summary_path,scope):
    fields=[r["name"] for r in json.loads(Path(__file__).with_name("bigquery_schema.json").read_text())]
    rows=[json.loads(line) for line in Path(path).read_text().splitlines() if line.strip()]
    summary=json.loads(Path(summary_path).read_text())
    if not rows or summary["scope"]!=scope:raise ValueError("No matching metrics")
    with sqlite3.connect(":memory:") as c:
        c.execute("CREATE TABLE events ("+",".join(fields)+")")
        for r in rows:
            validate(r,scope,set(fields))
            c.execute("INSERT INTO events VALUES ("+",".join("?" for _ in fields)+")",[r[k] for k in fields])
        n,errors,it,ot,avg=c.execute("SELECT COUNT(*),SUM(status!=200),SUM(CASE WHEN status=200 THEN input_tokens END),SUM(CASE WHEN status=200 THEN output_tokens END),AVG(CASE WHEN status=200 THEN latency_ms END) FROM events").fetchone()
        total=summary["total"]
        for key,v in [("requests",n),("errors",errors),("input_tokens",it),("output_tokens",ot)]:
            if total[key]!=v:raise ValueError("Summary mismatch: "+key)
        if avg is not None and abs(avg-total["latency_mean_ms"])>1e-8:raise ValueError("Latency mismatch")
        groups=c.execute("SELECT project,model,mode,substr(ts,1,10),COUNT(*),SUM(status!=200) FROM events GROUP BY 1,2,3,4 ORDER BY 1,2,3,4").fetchall()
        expected=Counter(r["model"] for r in rows)
        if {k:v["requests"] for k,v in summary["by_model"].items()}!=dict(expected):raise ValueError("Model grouping mismatch")
    return {"scope":scope,"rows":n,"errors":errors,"input_tokens":it,"output_tokens":ot,
            "groups":groups,"contract_verified":True,"offline_sql_reconciliation":True,"bigquery_executed":False}
def main():
    p=argparse.ArgumentParser();p.add_argument("ndjson");p.add_argument("summary");p.add_argument("--scope",choices=["ci_test","local_demo"],required=True)
    a=p.parse_args();print(json.dumps(analyse(a.ndjson,a.summary,a.scope),indent=2))
if __name__=="__main__":main()
