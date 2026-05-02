# Design Decisions

## Rate Limiting Strategy

- Implemented with Bottleneck using **three chained limiters** (hour -> minute -> second).
- Added a Redis-backed **atomic quota guard** before scheduling each call.
- Guard logic checks all windows in one Lua script and only increments counters if all limits have capacity.
- This guarantees no partial increments and no race-condition based violations across concurrent workers.
- Uses Redis-backed Bottleneck datastore so scheduling state survives process restarts and coordinates across multiple workers.
- This approach gives strict global compliance for:
  - 2 req/sec
  - 50 req/min
  - 300 req/hour
- Metrics are exposed through `/metrics` using current fixed-window Redis keys.
- Every MFAPI call logs:
  - timestamp
  - scheme code
  - per-second, per-minute, per-hour usage snapshot

## Rate Limiter Correctness Proof (Practical)

- **Safety**: A request is admitted only if `sec < 2 AND min < 50 AND hour < 300`.
- **Atomicity**: The Redis Lua script performs check+increment in one transaction-like operation.
- **Concurrency**: With shared Redis keys, all processes observe and update the same counters.
- **Persistence**: Counter keys are Redis-backed and survive API/worker restarts (until TTL expiry), so restart cannot reset quota unexpectedly.
- **Liveness**: On rejection, caller sleeps until the next exceeded window boundary and retries.
- **Edge cases handled**:
  - Process restart: Redis counters and limiter state continue; restart does not reset quota.
  - Multi-worker race: Lua atomic check+increment prevents over-admission.
  - Burst retries: retries are still routed through the same guard and limiter chain.
  - Partial window overlap (e.g., minute near rollover): wait uses exact remaining window time.

## Backfill + Incremental Sync Design

- BullMQ queue has two job types:
  - `full-sync`: enqueues all tracked funds.
  - `sync-fund`: fetches history for one fund, upserts NAV rows, recomputes analytics.
- Backfill enqueue is **chunked and time-spaced**:
  - configurable batch size
  - delay between batches
  - per-fund request spacing
- Spacing defaults to 12 seconds per fund job which caps throughput at <=300/hour and prevents burst pressure.
- Sync reads `sync_state.last_synced_date` and only inserts rows beyond that date.
- NAV ingestion is idempotent using `createMany(..., skipDuplicates: true)` and unique `(fund_code, date)` constraint.
- Daily incremental sync can be done by scheduling `POST /sync/trigger` via cron/K8s CronJob.

## Crash Recovery / Resumability

- `sync_state` persists per-fund watermark (`last_synced_date`).
- `sync_state` also stores fund-level `status`, `last_run_at`, and `last_error` for observability.
- If worker crashes mid-pipeline, rerun continues from the last committed watermark.
- BullMQ retry with exponential backoff handles transient failures.
- Permanent failures are moved to a dead-letter queue for manual replay.
- API-level retries with jittered exponential backoff handle `mfapi.in` failures and rate-limit responses.

## Analytics Tradeoffs

- Analytics are precomputed and stored in DB to keep read APIs fast (<200ms target).
- Rolling CAGR uses nearest available NAV on/after target date, accommodating weekends/holidays.
- Max drawdown computed across full historical series for each fund.
- Funds with insufficient history do not generate invalid windows; only valid windows are stored.
- Chosen tradeoff: more compute during ingestion, much faster read path.

## Analytics Method Details

- **CAGR formula**:
  - `CAGR = (NAV_end / NAV_start)^(365 / actual_days) - 1`
- **Rolling returns**:
  - For each start date, find the first available NAV on/after `start + windowDays`.
  - Compute CAGR for all valid pairs.
  - Aggregate min/max/median/p25/p75.
- **Max drawdown**:
  - Track running peak NAV.
  - Drawdown at each point: `(NAV_t - peak) / peak`.
  - Result is the most negative drawdown over the series.

## Scaling Strategy

- Horizontal worker scaling:
  - Add worker replicas; Bottleneck Redis datastore keeps global rate compliance.
- DB scaling:
  - Read replicas for heavy read traffic.
  - Partition `nav_data` by fund or date if row count grows significantly.
- Cache scaling:
  - Redis cluster/sentinel.
- Queue scaling:
  - BullMQ supports multiple consumers with at-least-once semantics.

## Operational Practices

- Structured logging via Pino.
- Lifecycle logs for sync start/end, per-fund processing, retries, and dead-letter transitions.
- Graceful shutdown for API + worker.
- Strict schema constraints + indexes for reliability/performance.
- Clear separation of concerns: API, pipeline, analytics, data access, queue.
