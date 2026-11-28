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
