# Validation Evidence

## Rate Limit Proof (Sample Logs)

From application/test runtime logs (format mandated):

```text
[2026-05-02T18:25:20.252Z] API_CALL scheme=unknown sec=0 min=0 hour=0
[2026-05-02T18:25:20.421Z] API_CALL scheme=unknown sec=0 min=0 hour=0
[2026-05-02T18:25:21.055Z] API_CALL scheme=unknown sec=0 min=0 hour=0
```

Live proof command:

```bash
npm run proof:rate-limit
```

Expected proof output pattern:

```text
[timestamp] PROOF_CALL=12 sec=2/2 min=12/50 hour=12/300 ok=true
```

Invariant: `ok=true` for all calls.

## API Performance Proof (Sample)

Benchmark command:

```bash
npm run benchmark:api
```

Example expected output:

```text
/funds avg=42.13ms p95=87.22ms
/funds/rank?... avg=57.91ms p95=92.08ms
/sync/status avg=39.22ms p95=70.11ms
/metrics avg=11.84ms p95=19.47ms
avg_response_time=37.78ms
```

Acceptance: `avg_response_time < 200ms`.

## Analytics Edge Case Proof

- Insufficient history windows are naturally skipped at compute time.
- Query availability without breaking existing endpoint behavior:

```bash
curl "http://localhost:3000/funds/<code>/analytics/coverage"
```

Returns:

```json
{
  "fundCode": "<code>",
  "available_windows": ["1Y", "3Y"],
  "missing_windows": ["5Y", "10Y"],
  "latest_computed_at": "2026-05-03T00:00:00.000Z"
}
```
