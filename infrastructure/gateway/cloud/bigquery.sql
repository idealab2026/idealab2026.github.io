-- Run only manually in a confirmed billing-disabled BigQuery sandbox.
-- Load events.ndjson with the schema in the README into a sandbox table first.
-- Replace PROJECT.DATASET.EVENTS with your institutional sandbox destination.
SELECT scope, project, model, mode, DATE(ts) AS day,
 COUNT(*) AS requests, COUNTIF(status != 200) AS errors,
 SUM(IF(status=200,input_tokens,NULL)) AS input_tokens,
 SUM(IF(status=200,output_tokens,NULL)) AS output_tokens,
 AVG(IF(status=200,latency_ms,NULL)) AS mean_latency_ms,
 APPROX_QUANTILES(IF(status=200,latency_ms,NULL),100)[SAFE_OFFSET(95)] AS p95_ms
FROM `PROJECT.DATASET.EVENTS`
GROUP BY scope,project,model,mode,day
ORDER BY day,project,model;
