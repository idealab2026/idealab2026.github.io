# BigQuery sandbox — institutional, billing-disabled only

No Google Cloud project was accessed or created. The gateway emits real NDJSON telemetry (no prompts, outputs or API keys). The checked-in schema, offline validation and aggregation query are preparatory evidence, not proof of BigQuery execution.

## Safe manual procedure
1. Sign in with an **institutional** Google identity in a separate browser profile. Open https://console.cloud.google.com/bigquery . Select or create a Sandbox project with **billing disabled**. Confirm that there is no linked billing account; do not activate the trial or upgrade.
2. Run the gateway locally with the instructions in the parent README. Make non-sensitive calls. Retrieve the metrics JSON and NDJSON from authenticated endpoints using the local observer credential. Keep credentials outside Git. CI artifacts may also be used: https://github.com/idealab2026/idealab2026.github.io/actions/runs/46137957980 . These are explicitly scope ci_test.
3. Validate locally: `python verify_export.py events.ndjson metrics.json --scope ci_test`. Change the scope to local_demo only for genuine local demo events.
4. In BigQuery, create an institutional dataset (e.g. gateway_lab) and table (e.g. events_ci_test), source Upload from local file, newline-delimited JSON, use the schema from bigquery_schema.json. Do not mix test and production telemetry. Sandbox tables expire automatically. No streaming, no DML or paid connectors.
5. Paste bigquery.sql into the query editor; substitute the actual dataset and table. Inspect estimated bytes before running and use maximum bytes billed where available. Confirm scope and counts match the locally validated summary. Delete resources when no longer needed, subject to institutional retention.
6. Preserve query/job identifier, schema and redacted results as evidence; never record account identities, credentials, or raw user content. If the console requests billing at any stage, stop.

Official docs: https://docs.cloud.google.com/bigquery/docs/sandbox and https://docs.cloud.google.com/free/docs/free-cloud-features .
Cloud Run / IAM / Storage / Artifact Registry / Logging / Vertex AI / GKE are documented in README.md; no billing authorization. This lab's SQLite and local model servers are not a production Cloud Run topology: shared durable storage, workload identity, endpoint reachability, authenticated transport, provider quotas and budget approval would all need separate validation.
