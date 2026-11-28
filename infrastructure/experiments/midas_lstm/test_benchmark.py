import numpy as np
import pytest
from benchmark import fixture,load_rows,split,arrays,torch_fit,metrics

def test_purged_split_and_training(tmp_path):
    p=tmp_path/"fixture.csv";fixture(p)
    frame=load_rows(p);train,val=split(frame,26)
    assert train.target_end_date.max()<val.signal_date.min()
    x,y,xv,yv,scale=arrays(train,val)
    assert x.shape[1:]==(26,1)
    assert abs(float(x.mean()))<1e-5
    cfg={"seed":42,"units":24,"epochs":1,"batch_size":64,"learning_rate":0.002}
    _,pred,t,i,_=torch_fit(x,y,xv,cfg)
    assert pred.shape==yv.shape and np.isfinite(pred).all()
    assert metrics(yv,pred*scale["y_std"]+scale["y_mean"],t,i)["rmse"]>=0

def test_insufficient_data(tmp_path):
    p=tmp_path/"fixture.csv";fixture(p)
    with pytest.raises(ValueError):split(load_rows(p).head(3),26)

def test_production_custody(tmp_path):
    import hashlib,json,pandas as pd
    from verify_production_export import verify
    labelled=pd.DataFrame([{"signal_date":"2026-01-02","ticker":"ABC","target_end_date":"2026-01-09","target_return":.01}])
    live=pd.DataFrame([{"signal_date":"2026-01-09","ticker":"ABC"}])
    paths=[tmp_path/"labelled.csv",tmp_path/"live.csv"]
    for frame,p in zip([labelled,live],paths):frame.to_csv(p,index=False,float_format="%.12g")
    h=hashlib.sha256()
    for frame in [labelled,live]:h.update(frame.to_csv(index=False,float_format="%.12g").encode())
    forecast=tmp_path/"forecast.json"
    d={"asof":"2026-01-09","input_digest":h.hexdigest(),"training":{"all_labelled_rows":1,"live_tickers":1}}
    forecast.write_text(json.dumps(d))
    assert verify(*paths,forecast)["input_digest"]==h.hexdigest()
    d["input_digest"]="0"*64;forecast.write_text(json.dumps(d))
    with pytest.raises(ValueError):verify(*paths,forecast)
