"""Explain the issued model, not an outcome or a newly trained forecast."""
import argparse
import html
import json
from pathlib import Path
import numpy as np
from public_sources import read,atomic_json,SOURCE_COMMIT

ALPHA=20
NAMES=["Country historical counts (grouped)","Origin activity"]

class NewconfModel:
    def __init__(self,priors):
        self.priors=np.asarray(priors,dtype=float)
    def predict(self,x):
        a=np.asarray(x,dtype=float)
        k,n,active=a.T
        if not (np.all(np.isin(active,[0,1])) and np.all(k>=0) and np.all(k<=n) and np.all(n<=25)):
            raise ValueError("Infeasible input")
        return (k+ALPHA*self.priors[active.astype(int)])/(n+ALPHA)

def reconstruct(doc,manifest,evidence):
    if (doc.get("schema")!="idealab.psico.prospective_newconf_2027.v1" or
        manifest.get("forecast_sha256")!=evidence["sha256"] or
        manifest.get("forecast_id")!=doc.get("forecast_id") or
        manifest.get("status")!="ISSUED_PROSPECTIVE_UNRESOLVED" or
        manifest.get("demonstrated_predictive_skill") is not False):
        raise ValueError("Unverified issue")
    rows=doc["countries"];summary=doc["training_summary"]
    if len(rows)!=196 or len({r["country_id"] for r in rows})!=196:raise ValueError("Wrong cohort")
    if doc["protocol"]["country_prior_alpha"]!=ALPHA:raise ValueError("Unexpected prior")
    pglobal=(summary["historical_newconf_positive_country_years"]+1)/(summary["training_country_years"]+2)
    priors=[]
    for group in ("inactive","active"):
        priors.append((summary[f"historical_paired_horizon2_{group}_newconf"]+ALPHA*pglobal)/
                      (summary[f"historical_paired_horizon2_{group}_exposures"]+ALPHA))
    model=NewconfModel(priors)
    features=[]
    for r in rows:
        a=r["active_intrastate_2025"]
        if a not in (0,1):raise ValueError("Invalid activity")
        # Invert the two published, rounded empirical-Bayes values.
        # Enumerate feasible integer historical counts rather than inventing a feature.
        candidates=[]
        for n in range(26):
            for k in range(n+1):
                if abs((k+ALPHA*pglobal)/(n+ALPHA)-r["p_country_eb"])<=1e-11 and abs((k+ALPHA*priors[a])/(n+ALPHA)-r["p_model"])<=1e-11:
                    candidates.append((k,n,a))
        if len(candidates)!=1:raise ValueError("Historical counts not uniquely reconstructible")
        features.append(candidates[0])
    x=np.asarray(features,dtype=float);published=np.array([r["p_model"] for r in rows])
    err=float(np.max(np.abs(model.predict(x)-published)))
    if err>1e-11 or int(x[:,2].sum())!=32:raise ValueError("Reconstruction failed")
    return model,x,rows,err

def explain(model,x,rows):
    from alibi.explainers import KernelShap
    explainer=KernelShap(model.predict,link="identity",task="regression",seed=42)
    explainer.fit(x,group_names=NAMES,groups=[[0,1],[2]])
    result=explainer.explain(x,nsamples=4,l1_reg=0)
    vals=np.asarray(result.shap_values[0],dtype=float)
    base=float(np.asarray(result.expected_value).reshape(-1)[0])
    if vals.shape!=(196,2):raise ValueError("Unexpected attribution shape")
    original=model.predict(x);add=float(np.max(np.abs(base+vals.sum(axis=1)-original)))
    if add>1e-7:raise ValueError("SHAP local accuracy failed")
    cf=x.copy();cf[:,2]=1-cf[:,2]
    alt=model.predict(cf)
    return {"base_probability":base,"max_additivity_error":add,
      "global_mean_abs_shap":dict(zip(NAMES,np.abs(vals).mean(axis=0).tolist())),
      "countries":[{"country_id":r["country_id"],"probability":float(p),
        "history_shap":float(v[0]),"activity_shap":float(v[1]),
        "origin_activity":int(xx[2]),"alternate_activity_probability":float(c),
        "alternate_minus_original":float(c-p)}
        for r,p,v,xx,c in zip(rows,original,vals,x,alt)]}

def write_html(report,path):
    bars="".join("<p>"+html.escape(k)+": <meter min='0' max='"+str(max(report["global_mean_abs_shap"].values()) or 1)+"' value='"+str(v)+"'></meter> "+f"{100*v:.4f} pp</p>" for k,v in report["global_mean_abs_shap"].items())
    table="".join("<tr><td>"+html.escape(str(r["country_id"]))+"</td>"+"".join(f"<td>{100*r[k]:+.4f}</td>" for k in ("probability","history_shap","activity_shap","alternate_activity_probability","alternate_minus_original"))+"</tr>" for r in report["countries"])
    path.write_text("<!doctype html><meta charset=utf-8><title>IDEA LAB | NEWCONF2027 explainability</title><style>body{font:16px system-ui;max-width:1100px;margin:32px auto;padding:0 12px;color:#21374d}td,th{padding:7px;border-bottom:1px solid #ddd;text-align:right}th{background:#e8eef5}table{border-collapse:collapse;width:100%}meter{width:160px}</style><h1>NEWCONF2027 · model explanation</h1><p>Unresolved prospective probabilities. No causal inference or demonstrated predictive skill. Attributions in percentage points.</p><h2>Global mean absolute SHAP</h2>"+bars+"<h2>Local explanations and model sensitivity</h2><table><thead><tr><th>GW country ID</th><th>Probability (%)</th><th>History (pp)</th><th>Activity (pp)</th><th>Alternate activity (%)</th><th>Difference (pp)</th></tr></thead><tbody>"+table+"</tbody></table>",encoding="utf-8")

def track(report,model,out):
    import mlflow
    import pandas as pd
    class Wrapped(mlflow.pyfunc.PythonModel):
        def predict(self,context,model_input,params=None):
            return model.predict(np.asarray(model_input))
    uri="sqlite:///"+str(out/"tracking.db")
    mlflow.set_tracking_uri(uri);mlflow.set_registry_uri(uri)
    client=mlflow.MlflowClient()
    if client.get_experiment_by_name("psico-newconf-explain") is None:
        client.create_experiment("psico-newconf-explain",artifact_location=(out/"artifacts").as_uri())
    mlflow.set_experiment("psico-newconf-explain")
    with mlflow.start_run() as run:
        mlflow.log_params({"model":"frozen_empirical_bayes_reconstruction","alpha":ALPHA,
          "source_commit":SOURCE_COMMIT,"forecast_sha256":report["source"]["sha256"],"scope":"no_refit_no_outcomes"})
        mlflow.log_metrics({"max_reconstruction_error":report["max_reconstruction_error"],
          "max_additivity_error":report["max_additivity_error"],
          "history_mean_abs_shap":report["global_mean_abs_shap"][NAMES[0]],
          "activity_mean_abs_shap":report["global_mean_abs_shap"][NAMES[1]]})
        mlflow.log_artifact(str(out/"report.json"));mlflow.log_artifact(str(out/"report.html"))
        mlflow.pyfunc.log_model("model",python_model=Wrapped(),registered_model_name="psico-newconf-frozen-explanation",
                               pip_requirements=["numpy==1.26.4","mlflow==2.22.0"])
        report["mlflow_run_id"]=run.info.run_id
        versions=client.search_model_versions("name = 'psico-newconf-frozen-explanation'")
        report["registered_versions"]=[v.version for v in versions if v.run_id==run.info.run_id]
        if not report["registered_versions"]:raise RuntimeError("Registry failed")

def main():
    parser=argparse.ArgumentParser();parser.add_argument("--out",type=Path,required=True);parser.add_argument("--tracking",action="store_true");args=parser.parse_args()
    out=args.out.resolve();out.mkdir(parents=True,exist_ok=True)
    doc,ev=read("forecast");manifest,mev=read("manifest")
    model,x,rows,err=reconstruct(doc,manifest,ev)
    report={"scope":"frozen_model_explanation_not_causal","forecast_id":doc["forecast_id"],
      "source":ev,"manifest":mev,"max_reconstruction_error":err,
      "method":"Alibi KernelShap, grouped historical counts, actual 196-row background",
      "limitations":"Interventional SHAP uses marginal group substitutions; correlations and causal effects are not established. Binary origin activity flip is model sensitivity, not a feasible intervention or new forecast.",
      **explain(model,x,rows)}
    atomic_json(out/"report.json",report);write_html(report,out/"report.html")
    if args.tracking:track(report,model,out);atomic_json(out/"report.json",report)
    print(json.dumps({k:v for k,v in report.items() if k!="countries"},indent=2))
if __name__=="__main__":main()
