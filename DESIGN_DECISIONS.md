# Design Decisions

## Overview

This project is designed to simulate how a real backend system would work when dealing with external APIs, large data ingestion, and analytics computation.

The focus was on building something reliable and easy to reason about, while still handling real-world concerns like rate limiting, background processing, and failure recovery.

---

## Architecture

* Fastify is used to serve APIs and keep request handling simple.
* PostgreSQL (via Prisma) is used to store:

  * funds
  * NAV data
  * analytics
  * sync state
* BullMQ handles background jobs for syncing data.
* Redis is used for:

  * queue backend
  * caching frequently used API responses
  * storing rate limit counters
* Analytics are precomputed during sync and stored in the database so APIs can respond quickly.

---

## Rate Limiting

External API calls are strictly controlled using a combination of Bottleneck and Redis.

* Limits applied:

  * 2 requests per second
  * 50 requests per minute
  * 300 requests per hour

* A Redis-based check ensures:

  * All limits are verified before a request is made
  * Counters are updated atomically (no race conditions)
  * Multiple workers share the same global limits

Each API call logs:

* timestamp
* fund code
* usage in second, minute, and hour windows

This helps in verifying that limits are always respected.

---

## Sync Pipeline Design

The system uses a queue-based approach:

* `full-sync` → triggers syncing for all funds
* `sync-fund` → processes one fund at a time

Flow:

1. API triggers `full-sync`
2. Worker creates jobs for each fund
3. Each job:

   * fetches NAV data
   * inserts new records
   * recomputes analytics

To avoid overloading the API:

* Jobs are spaced out with delays
* Batch size and timing are configurable
* Default spacing ensures limits are never exceeded

---

## Data Sync Strategy

* Each fund has a `sync_state`
* Only new data (after last synced date) is fetched
* Duplicate entries are avoided using database constraints

This makes the process:

* efficient
* idempotent (safe to retry)

---

## Failure Handling

The system is designed to handle failures gracefully:

* API errors → retried with backoff
* Job failures → retried automatically
* Permanent failures → moved to a dead-letter queue
* Crashes → sync resumes from last saved state

---

## Analytics Design

Analytics are computed during sync instead of at request time.

This improves API performance significantly.

For each fund and window (1Y, 3Y, 5Y, 10Y), we compute:

* rolling returns
* median return
* p25 / p75
* CAGR (min, max, median)
* max drawdown

---

## Analytics Logic

* CAGR is calculated using actual day differences
* Rolling returns use the nearest available NAV after the target date
* Max drawdown is calculated by tracking peak NAV and measuring drops

If a fund does not have enough data for a window:

* that window is skipped
* no invalid values are returned

---

## Scaling Approach

The system can scale in the following ways:

* Add more workers → parallel processing
* Use Redis to coordinate rate limiting across workers
* Add DB read replicas for heavy read traffic
* Partition NAV data if dataset grows large

---

## Operational Practices

* Structured logging is used for debugging and monitoring
* Key events are logged (sync start, completion, failures)
* Graceful shutdown ensures no data loss
* Database constraints and indexes improve reliability
* Code is organized into clear layers (API, services, pipeline, analytics)

---

