import sqlite3,time,math,json
from contextlib import contextmanager
from datetime import datetime,timezone

class Metrics:
    def __init__(self,path,scope):
        self.path=path;self.scope=scope
        with self.connect() as c:
            c.executescript("""CREATE TABLE IF NOT EXISTS limits(project TEXT,minute INTEGER,n INTEGER,PRIMARY KEY(project,minute));
            CREATE TABLE IF NOT EXISTS events(ts TEXT,project TEXT,model TEXT,mode TEXT,scope TEXT,status INTEGER,
              latency_ms REAL,input_tokens INTEGER,output_tokens INTEGER,prompt_version TEXT,prompt_sha256 TEXT);
            CREATE INDEX IF NOT EXISTS event_scope_time ON events(scope,ts);""")
    @contextmanager
    def connect(self):
        c=sqlite3.connect(self.path,timeout=5)
        try:
            yield c;c.commit()
        except BaseException:
            c.rollback();raise
        finally:c.close()
    def admit(self,project,limit):
        minute=int(time.time()//60)
        with self.connect() as c:
            c.execute("BEGIN IMMEDIATE")
            c.execute("DELETE FROM limits WHERE minute<?",(minute-2,))
            n=c.execute("SELECT n FROM limits WHERE project=? AND minute=?",(project,minute)).fetchone()
            if n and n[0]>=limit:return False
            c.execute("INSERT INTO limits VALUES(?,?,1) ON CONFLICT(project,minute) DO UPDATE SET n=n+1",(project,minute))
            return True
    def event(self,project,model,mode,status,ms,usage=None,prompt=None):
        with self.connect() as c:
            c.execute("INSERT INTO events VALUES(?,?,?,?,?,?,?,?,?,?,?)",(
                datetime.now(timezone.utc).isoformat(),project,model,mode,self.scope,status,ms,
                usage.input_tokens if usage else None,usage.output_tokens if usage else None,
                prompt.version if prompt else None,prompt.digest() if prompt else None))
    def rows(self):
        with self.connect() as c:
            c.row_factory=sqlite3.Row
            return [dict(r) for r in c.execute("SELECT * FROM events WHERE scope=? ORDER BY ts",(self.scope,))]
    def summary(self):
        rows=self.rows()
        def agg(xs):
            ok=[r for r in xs if r["status"]==200]
            lat=sorted(r["latency_ms"] for r in ok)
            def percentile(p):return lat[max(0,math.ceil(p*len(lat))-1)] if lat else None
            return {"requests":len(xs),"success":len(ok),"errors":len(xs)-len(ok),
              "error_rate":(len(xs)-len(ok))/len(xs) if xs else None,
              "latency_mean_ms":sum(lat)/len(lat) if lat else None,"p50_ms":percentile(.5),"p95_ms":percentile(.95),
              "input_tokens":sum(r["input_tokens"] for r in ok if r["input_tokens"] is not None) if ok else None,
              "output_tokens":sum(r["output_tokens"] for r in ok if r["output_tokens"] is not None) if ok else None}
        def group(key):
            return {k:agg([r for r in rows if r[key]==k]) for k in sorted({r[key] for r in rows})}
        days={}
        for r in rows:days.setdefault(r["ts"][:10],[]).append(r)
        return {"scope":self.scope,"total":agg(rows),"by_project":group("project"),"by_model":group("model"),"by_mode":group("mode"),
            "by_day":{k:agg(v) for k,v in days.items()},"browser_telemetry":"not integrated",
            "availability":None,"resource_usage":None,"rag_quality":None,"benchmark":None,"estimated_total_cost":None,
            "paid_provider_cost":0,"cost_note":"No paid inference provider. Electricity/hardware not measured; no uptime probes across time."}
    def export(self):
        return "".join(json.dumps(r,separators=(",",":"))+"\n" for r in self.rows())
