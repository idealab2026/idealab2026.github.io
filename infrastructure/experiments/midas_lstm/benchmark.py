"""Isolated comparison. Never imports or writes a production ledger."""
import argparse
import hashlib
import json
import os
import platform
import time
from pathlib import Path
import numpy as np
import pandas as pd

LAGS=[f"wret_lag_{i}" for i in range(1,27)]
REQUIRED=["ticker","signal_date","target_end_date","target_return",*LAGS]

def load_rows(path):
    frame=pd.read_csv(path)
    if not set(REQUIRED)<=set(frame.columns) or frame.empty:
        raise ValueError("Invalid dataset contract")
    frame=frame[REQUIRED].copy()
    for col in ["signal_date","target_end_date"]:
        frame[col]=pd.to_datetime(frame[col],format="%Y-%m-%d",errors="raise").dt.strftime("%Y-%m-%d")
    if frame.duplicated(["ticker","signal_date"]).any() or (frame.target_end_date<=frame.signal_date).any():
        raise ValueError("Duplicate or invalid target timing")
    if not np.isfinite(frame[LAGS+["target_return"]].to_numpy(dtype=float)).all():
        raise ValueError("Non-finite features or target")
    return frame

def split(frame,validation_weeks):
    dates=sorted(frame.signal_date.unique())
    if len(dates)<validation_weeks+60:
        raise ValueError("Insufficient chronological history")
    first=dates[-validation_weeks]
    train=frame[frame.target_end_date<first]
    val=frame[frame.signal_date.isin(dates[-validation_weeks:])]
    if train.empty or val.empty or train.target_end_date.max()>=val.signal_date.min():
        raise ValueError("Temporal purge failed")
    return train,val

def arrays(train,val):
    x=train[LAGS].to_numpy(np.float32); y=train.target_return.to_numpy(np.float32)
    mean=float(x.mean());std=max(float(x.std()),1e-6)
    ymean=float(y.mean());ystd=max(float(y.std()),1e-6)
    return ((x-mean)/std)[:,:,None],(y-ymean)/ystd,((val[LAGS].to_numpy(np.float32)-mean)/std)[:,:,None],val.target_return.to_numpy(np.float32),{"x_mean":mean,"x_std":std,"y_mean":ymean,"y_std":ystd}

def fixture(path,seed=42):
    """Synthetic smoke data only; never presented as market observations."""
    rng=np.random.default_rng(seed)
    dates=pd.date_range("2023-01-06",periods=115,freq="W-FRI")
    rows=[]
    for ticker in ("SYN-A","SYN-B","SYN-C"):
        returns=rng.normal(0,.02,len(dates))
        for i in range(25,len(dates)-1):
            rows.append(dict(ticker=ticker,signal_date=dates[i].date().isoformat(),
                         target_end_date=dates[i+1].date().isoformat(),target_return=float(returns[i+1]),
                         **{name:float(returns[i-j]) for j,name in enumerate(LAGS)}))
    pd.DataFrame(rows).to_csv(path,index=False)

def torch_fit(x,y,xv,cfg):
    import torch
    from torch import nn
    from torch.utils.data import DataLoader,TensorDataset
    torch.manual_seed(cfg["seed"]);torch.set_num_threads(1)
    torch.use_deterministic_algorithms(True)
    class LSTM(nn.Module):
        def __init__(self):
            super().__init__()
            self.lstm=nn.LSTM(1,cfg["units"],batch_first=True)
            self.head=nn.Linear(cfg["units"],1)
        def forward(self,x):
            seq,_=self.lstm(x)
            return self.head(seq[:,-1,:]).squeeze(-1)
    model=LSTM()
    optimizer=torch.optim.Adam(model.parameters(),lr=cfg["learning_rate"],eps=1e-7)
    loss=nn.L1Loss()
    loader=DataLoader(TensorDataset(torch.from_numpy(x),torch.from_numpy(y)),batch_size=cfg["batch_size"],shuffle=False)
    start=time.perf_counter()
    for _ in range(cfg["epochs"]):
        model.train()
        for xb,yb in loader:
            optimizer.zero_grad(set_to_none=True)
            value=loss(model(xb),yb)
            value.backward()
            optimizer.step()
    elapsed=time.perf_counter()-start
    model.eval()
    with torch.inference_mode():
        model(torch.from_numpy(xv[:1]))
        start=time.perf_counter();pred=model(torch.from_numpy(xv)).numpy();infer=time.perf_counter()-start
    return model,pred,elapsed,infer,torch.__version__

def keras_fit(x,y,xv,cfg):
    os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL","2")
    os.environ.setdefault("CUDA_VISIBLE_DEVICES","-1")
    import tensorflow as tf
    tf.config.threading.set_inter_op_parallelism_threads(1)
    tf.config.threading.set_intra_op_parallelism_threads(1)
    tf.keras.utils.set_random_seed(cfg["seed"])
    tf.config.experimental.enable_op_determinism()
    model=tf.keras.Sequential([tf.keras.Input(shape=(26,1)),tf.keras.layers.LSTM(cfg["units"]),tf.keras.layers.Dense(1)])
    model.compile(optimizer=tf.keras.optimizers.Adam(learning_rate=cfg["learning_rate"],epsilon=1e-7),loss="mae")
    start=time.perf_counter()
    model.fit(x,y,epochs=cfg["epochs"],batch_size=cfg["batch_size"],shuffle=False,verbose=0)
    elapsed=time.perf_counter()-start
    model(xv[:1],training=False)
    start=time.perf_counter();pred=model(xv,training=False).numpy().ravel();infer=time.perf_counter()-start
    return model,pred,elapsed,infer,tf.__version__

def metrics(y,p,train_seconds,inference_seconds):
    e=y-p
    return {"mae":float(np.abs(e).mean()),"rmse":float(np.sqrt(np.square(e).mean())),
            "train_seconds":train_seconds,"inference_seconds":inference_seconds,
            "inference_rows_per_second":float(len(y)/max(inference_seconds,1e-12))}

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--dataset",type=Path)
    parser.add_argument("--synthetic",action="store_true")
    parser.add_argument("--out",type=Path,required=True)
    parser.add_argument("--tracking",action="store_true")
    parser.add_argument("--torch-only",action="store_true")
    parser.add_argument("--source-commit",default="unknown")
    args=parser.parse_args()
    if args.synthetic==bool(args.dataset):
        parser.error("Choose exactly one of --dataset or --synthetic")
    out=args.out.resolve()
    out.mkdir(parents=True,exist_ok=True)
    cfg=json.loads(Path(__file__).with_name("config.json").read_text())
    path=args.dataset
    if args.synthetic:
        path=out/"synthetic_fixture.csv";fixture(path)
    frame=load_rows(path)
    train,val=split(frame,cfg["validation_weeks"])
    x,y,xv,yv,scale=arrays(train,val)
    report={"scope":"synthetic_smoke" if args.synthetic else "offline_dataset_comparison",
            "source_commit":args.source_commit,"dataset_sha256":hashlib.sha256(path.read_bytes()).hexdigest(),
            "code_sha256":hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
            "config":cfg,"train_rows":len(train),"validation_rows":len(val),
            "train_last_target":train.target_end_date.max(),"validation_first_signal":val.signal_date.min(),
            "normalization":scale,"python":platform.python_version(),"models":{}}
    if args.tracking:
        import mlflow
        mlflow.set_tracking_uri("sqlite:///"+str(out/"tracking.db"))
        mlflow.set_registry_uri("sqlite:///"+str(out/"tracking.db"))
        client=mlflow.MlflowClient()
        experiment=client.get_experiment_by_name("midas-lstm-isolated")
        if experiment is None:
            client.create_experiment("midas-lstm-isolated",artifact_location=(out/"artifacts").as_uri())
        mlflow.set_experiment("midas-lstm-isolated")
    for name,fit in ([("pytorch",torch_fit)] if args.torch_only else [("pytorch",torch_fit),("keras",keras_fit)]):
        model,p,elapsed,infer,version=fit(x,y,xv,cfg)
        raw=p*scale["y_std"]+scale["y_mean"]
        if not np.isfinite(raw).all():raise ValueError("Non-finite inference")
        m=metrics(yv,raw,elapsed,infer)
        report["models"][name]={"version":version,**m}
        if name=="pytorch":
            import torch
            torch.save(model.state_dict(),out/"pytorch-state.pt")
        else:model.save(out/"keras-model.keras")
        if args.tracking:
            with mlflow.start_run(run_name=name) as run:
                mlflow.log_params({**cfg,"framework":name,"framework_version":version,
                  "dataset_sha256":report["dataset_sha256"],"code_sha256":report["code_sha256"],"source_commit":args.source_commit,
                  "scope":report["scope"],"train_rows":len(train),"validation_rows":len(val)})
                mlflow.log_metrics(m)
                mlflow.log_dict(scale,"normalization.json")
                mlflow.log_artifact(str(out/("pytorch-state.pt" if name=="pytorch" else "keras-model.keras")))
                if name=="pytorch":
                    mlflow.pytorch.log_model(model,"model",registered_model_name="midas-lstm-pytorch-experimental",pip_requirements=["torch=="+version])
                else:
                    mlflow.tensorflow.log_model(model,"model",registered_model_name="midas-lstm-keras-experimental",pip_requirements=["tensorflow-cpu=="+version,"keras==3.9.2"])
                report["models"][name]["run_id"]=run.info.run_id
    if args.tracking:
        for name in report["models"]:
            versions=client.search_model_versions("name = 'midas-lstm-"+name+"-experimental'")
            if not any(v.run_id==report["models"][name]["run_id"] for v in versions):
                raise RuntimeError("Model registration missing")
            report["models"][name]["registered_versions"]=[v.version for v in versions if v.run_id==report["models"][name]["run_id"]]
    (out/"report.json").write_text(json.dumps(report,indent=2,allow_nan=False)+"\n")
    print(json.dumps(report,indent=2,allow_nan=False))

if __name__=="__main__":main()
