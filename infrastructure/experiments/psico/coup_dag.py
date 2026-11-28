from datetime import datetime,timedelta,timezone
import os
from pathlib import Path
from airflow.decorators import dag,task
from airflow.utils.state import DagRunState
import coup_pipeline as pipeline

@dag(dag_id="idealab_coup_retrospective_reproduction",schedule=None,catchup=False,
     start_date=datetime(2026,1,1,tzinfo=timezone.utc),max_active_runs=1,
     default_args={"retries":1,"retry_delay":timedelta(seconds=5)},tags=["institutional","read-only","research"])
def research():
    @task
    def extract():
        out=Path(os.environ["IDEALAB_RUN_DIR"]).resolve()
        out.mkdir(parents=True,exist_ok=True)
        return pipeline.extract(out)
    @task
    def quality(p):return pipeline.validate(p)
    @task
    def preprocess(p):return pipeline.preprocess(p)
    @task
    def fit(p):return pipeline.fit(p)
    @task
    def evaluate(p):return pipeline.evaluate(p)
    @task
    def register(p):return pipeline.register(p)
    @task
    def publish(p):return pipeline.publish(p)
    publish(register(evaluate(fit(preprocess(quality(extract()))))))
dag=research()
if __name__=="__main__":
    run=dag.test()
    if run.state!=DagRunState.SUCCESS:raise SystemExit("DAG failed")
