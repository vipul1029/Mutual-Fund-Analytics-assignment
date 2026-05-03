# Validation Evidence

This document shows how different parts of the system can be verified in practice, including rate limiting, API performance, and handling of edge cases.

---

## Rate Limit Proof

Sample logs from the application:

```text
[2026-05-02T18:25:20.252Z] API_CALL scheme=unknown sec=0 min=0 hour=0
[2026-05-02T18:25:20.421Z] API_CALL scheme=unknown sec=0 min=0 hour=0
[2026-05-02T18:25:21.055Z] API_CALL scheme=unknown sec=0 min=0 hour=0
```

You can verify rate limiting by running:

```bash
npm run proof:rate-limit
```

Example output:

```text
[timestamp] PROOF_CALL=12 sec=2/2 min=12/50 hour=12/300 ok=true
```

If everything is working correctly, all calls should show `ok=true`, which means the rate limits are being respected.

---

## API Performance

You can check API performance using:

```bash
npm run benchmark:api
```

Example output:

```text
/funds avg=42.13ms p95=87.22ms
/funds/rank?... avg=57.91ms p95=92.08ms
/sync/status avg=39.22ms p95=70.11ms
/metrics avg=11.84ms p95=19.47ms
avg_response_time=37.78ms
```

In general, average response time should stay well below 200ms.

---

## Analytics Edge Cases

Some funds may not have enough historical data for all time windows (like 5Y or 10Y).
Instead of failing, the system simply skips those windows.

You can check available data using:

```bash
curl "http://localhost:3000/funds/<code>/analytics/coverage"
```

Example response:

```json
{
  "fundCode": "<code>",
  "available_windows": ["1Y", "3Y"],
  "missing_windows": ["5Y", "10Y"],
  "latest_computed_at": "2026-05-03T00:00:00.000Z"
}
```

This helps confirm which analytics are available for a given fund without breaking any API behavior.

---

## Sync Pipeline Verification

You can verify that the background sync is working by triggering a sync:

```bash
curl -X POST http://localhost:3000/sync/trigger
```

Then check worker logs:

```bash
docker logs mf-worker
```

Expected behavior:

* Sync job starts
* Funds are processed one by one
* NAV data gets inserted
* Analytics are recomputed

---

## End-to-End Check

To quickly verify everything is working:

1. Start the project
2. Trigger sync
3. Check `/funds` → data should appear
4. Check `/funds/:code/analytics` → values should be present
5. Run tests → all should pass

This confirms that ingestion, processing, and APIs are all working together correctly.
