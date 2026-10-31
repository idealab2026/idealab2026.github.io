#!/usr/bin/env python3
"""Prepare a public-only daily summary of Cloudflare Web Analytics for IDEA LAB.

Secrets stay in GitHub Actions runtime. The public artifact contains only
per-product UTC daily counts and no identifiers, raw paths or API tokens.
"""
import datetime as dt
import json
import os
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "data" / "traffic.json"
ORIGIN = "idealab2026.github.io"
PREFIXES = {
    "observatorio": "/dashboard-gobierno/",
    "midas": "/laboratorio-cuantitativo/",
    "psicohistoria": "/sistemas-complejos/",
}
FIRST_DAY = dt.date(2026, 10, 31)
QUERY = """
query SiteTraffic($accountTag: string!, $start: Time!, $end: Time!) {
  viewer {
    accounts(filter: {accountTag: $accountTag}) {
      rumPageloadEventsAdaptiveGroups(
        limit: 5000, orderBy: [date_ASC],
        filter: {datetime_geq: $start, datetime_lt: $end}
      ) {
        count
        sum { visits }
        avg { sampleInterval }
        dimensions { date requestHost requestPath }
      }
    }
  }
}
"""

def site_for_path(raw):
    if not isinstance(raw, str) or len(raw)>1024: return None
    path = raw.split("?")[0].split("#")[0]
    for key, prefix in PREFIXES.items():
        if path == prefix.rstrip("/") or path.startswith(prefix):
            return key
    return None

def make_placeholder():
    return {
        "schema": 1, "status": "unconfigured", "generatedAt": None,
        "source": "Cloudflare Web Analytics · pendiente de configurar lectura",
        "days": []
    }

def build_public_summary(rows, today=None):
    today=today or dt.datetime.now(dt.timezone.utc).date()
    first=max(FIRST_DAY, today-dt.timedelta(days=29))
    if not isinstance(rows, list): raise ValueError("INVALID_GROUPS")
    if len(rows)>=5000: raise ValueError("TRUNCATED_GROUPS")
    # Explicitly initialize monitored dates only AFTER instrumentation.
    dates=[first+dt.timedelta(days=i) for i in range((today-first).days+1)]
    days={str(day): {key:{"visits":0,"pageViews":0} for key in PREFIXES} for day in dates}
    for row in rows:
        if not isinstance(row, dict): raise ValueError("INVALID_ROW")
        dimension=row.get("dimensions") or {}
        if not isinstance(dimension,dict): raise ValueError("INVALID_DIMENSIONS")
        raw_day=dimension.get("date")
        try: day=str(dt.date.fromisoformat(raw_day))
        except (TypeError,ValueError): raise ValueError("INVALID_DAY") from None
        if day not in days: continue
        host=dimension.get("requestHost")
        if host!=ORIGIN: continue
        key=site_for_path(dimension.get("requestPath"))
        if key is None: continue
        views=row.get("count")
        visits=(row.get("sum") or {}).get("visits")
        sample=(row.get("avg") or {}).get("sampleInterval",1)
        if not isinstance(views,int) or isinstance(views,bool) or views<0:
            raise ValueError("INVALID_PAGEVIEWS")
        if not isinstance(visits,int) or isinstance(visits,bool) or visits<0:
            raise ValueError("INVALID_VISITS")
        if sample not in (None,1,1.0):
            # We do not publish sampled counts as if they were exact totals.
            raise ValueError("SAMPLED_DATA_REQUIRES_SEPARATE_ESTIMATE_POLICY")
        days[day][key]["pageViews"]+=views
        days[day][key]["visits"]+=visits
    return {"schema":1,"status":"verified",
        "generatedAt":dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat().replace("+00:00","Z"),
        "source":"Cloudflare Web Analytics · datos agregados",
        "days":[{"day":date,"values":vals} for date,vals in sorted(days.items())]
    }

def query_cloudflare(token,account_tag):
    if not re.fullmatch(r"[0-9a-fA-F]{32}",account_tag):
        raise ValueError("INVALID_ACCOUNT_TAG")
    if len(token)<30:raise ValueError("INVALID_TOKEN_LENGTH")
    today=dt.datetime.now(dt.timezone.utc).date()
    from_day=max(FIRST_DAY,today-dt.timedelta(days=29))
    data=json.dumps({"query":QUERY,"variables":{
        "accountTag":account_tag,
        "start":from_day.isoformat()+"T00:00:00Z",
        "end":(today+dt.timedelta(days=1)).isoformat()+"T00:00:00Z"
    }}).encode("utf-8")
    request=urllib.request.Request("https://api.cloudflare.com/client/v4/graphql",data=data,
      headers={"Authorization":"Bearer "+token,"Content-Type":"application/json","Accept":"application/json"},
      method="POST")
    with urllib.request.urlopen(request,timeout=25) as res:
        if res.status!=200:raise ValueError("CF_HTTP_ERROR")
        response=json.load(res)
    if response.get("errors"):raise ValueError("CF_GRAPHQL_ERROR")
    accounts=((response.get("data") or {}).get("viewer") or {}).get("accounts") or []
    if len(accounts)!=1 or "rumPageloadEventsAdaptiveGroups" not in accounts[0]:
        raise ValueError("CF_DATASET_UNAVAILABLE")
    return accounts[0]["rumPageloadEventsAdaptiveGroups"]

def main():
    token=os.environ.get("IDEALAB_CF_ANALYTICS_TOKEN","")
    account=os.environ.get("IDEALAB_CF_ACCOUNT_ID","")
    if bool(token)!=bool(account):
        raise SystemExit("CONFIG_INCOMPLETE: set both IDEA LAB GitHub Actions secrets")
    if not token:
        out=make_placeholder()
        print("Web Analytics read not configured; publishing empty, truthful dashboard.")
    else:
        try:
            out=build_public_summary(query_cloudflare(token,account))
        except (ValueError,urllib.error.URLError,TimeoutError) as err:
            # Fail closed, so no inaccurate data is published.
            raise SystemExit("VERIFIED_ANALYTICS_UNAVAILABLE: "+type(err).__name__) from None
        print("Public aggregate prepared from verified GraphQL response.")
    OUTPUT.parent.mkdir(parents=True,exist_ok=True)
    OUTPUT.write_text(json.dumps(out,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")

if __name__=="__main__":
    main()
