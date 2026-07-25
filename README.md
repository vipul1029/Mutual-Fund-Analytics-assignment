# Mutual Fund Analytics Backend

This repository implements a Node.js backend for ingesting mutual fund NAV history from the MFAPI service, storing it in PostgreSQL, computing analytics windows, and exposing a small API layer for querying funds, analytics, sync status, and rate-limit metrics.

The project is structured as a multi-process service:

* an API process serves HTTP requests
* a worker process consumes BullMQ jobs and performs background sync
* Redis is used for queueing, response caching, and rate-limit counters
* Prisma manages the relational schema in PostgreSQL

---

## What the project does

At a high level, the system performs four responsibilities:

1. Ingest NAV history for mutual funds from an external source
2. Persist raw NAV data and sync state in PostgreSQL
3. Precompute analytics such as rolling CAGR, return summaries, and max drawdown
4. Expose fast read APIs backed by Redis caching

This design keeps the read path simple and avoids recomputing analytics on every request.

---

## Core capabilities

* Seed a small set of funds into the database
* Sync fund NAV history from the MFAPI endpoint
* Track sync progress per fund with durable state
* Recompute analytics for each fund after sync
* Serve fund listings and fund detail queries
* Rank funds by analytics window and sort metric
* Expose rate-limiter metrics and queue status
* Handle retries and dead-lettering for failed sync jobs

---

## Architecture overview

The codebase is organized into clear layers:

* `src/server.js` – starts the Fastify HTTP server
* `src/worker.js` – starts the BullMQ worker process
* `src/api/` – route registration and HTTP handlers
* `src/services/` – business logic for funds, rate limiting, and MFAPI access
* `src/pipeline/` – sync planning and sync orchestration
* `src/analytics/` – analytics calculations
* `src/queue/` – BullMQ queues and worker behavior
* `src/db/` – Prisma and Redis clients
* `prisma/` – schema, migrations, and seed script
* `tests/` – Vitest test coverage

The runtime flow is:

1. A request hits the API (for example `POST /sync/trigger`)
2. The API enqueues a BullMQ job
3. The worker processes the job and fetches fund history
4. New NAV rows are inserted into PostgreSQL
5. Analytics are recomputed and persisted
6. Redis cache entries are invalidated so subsequent reads reflect new data

---

## Technology stack

The implementation uses:

* Node.js with ESM modules
* Fastify for the HTTP server
* Prisma ORM with PostgreSQL
* Redis for queue state, caching, and rate-limit metrics
* BullMQ for background job processing
* Bottleneck + Redis-based quota logic for external API protection
* Day.js for date handling
* Vitest for automated tests

---

## Data model

The Prisma schema defines four main entities:

* `Fund` – fund metadata such as code, name, AMC, and category
* `NavData` – historical NAV rows per fund and date
* `Analytics` – precomputed analytics for each fund and window
* `SyncState` – sync progress and last success/error state per fund

The database tables created by Prisma are:

* `funds`
* `nav_data`
* `analytics`
* `sync_state`

---

## Analytics behavior

Analytics are calculated per fund and per window:

* `1Y`
* `3Y`
* `5Y`
* `10Y`

The current implementation computes:

* rolling CAGR values
* minimum/maximum/median returns
* p25/p75 summary values
* max drawdown
* CAGR min/max/median across the rolling series

If a fund does not have enough historical data for a window, that window is skipped rather than producing invalid output.

---

## Sync pipeline details

The sync pipeline is queue-based and resumable:

* `full-sync` triggers a sync for all seeded funds
* `sync-fund` processes one fund at a time
* each fund job is scheduled with configurable spacing and batching to avoid overwhelming the upstream API
* the sync planner only inserts rows newer than the last synced date, so re-runs are safe
* failed jobs are retried with backoff and eventually moved to the dead-letter queue

The relevant settings are exposed through environment variables:

* `SYNC_BATCH_SIZE`
* `SYNC_BATCH_DELAY_MS`
* `SYNC_REQUEST_SPACING_MS`

---

## Rate limiting

External calls to the MFAPI service are protected by a multi-window limiter built with Bottleneck and Redis.

The current limits are:

* 2 requests per second
* 50 requests per minute
* 300 requests per hour

These limits are enforced together, not independently: a request is only allowed if it fits all three windows. The limiter also exposes live metrics through `GET /metrics`.

---

## Caching

The read path uses Redis caching for several response types:

* fund lists
* fund detail lookups
* fund analytics
* analytics coverage checks
* fund ranking results

The cache TTL is controlled by `CACHE_TTL_SECONDS`.

---

## Prerequisites

You will need:

* Node.js and npm
* Docker Desktop (recommended for local Postgres/Redis)
* PostgreSQL and Redis if you prefer not to use Docker

---

## Environment configuration

Copy `.env.example` to `.env` before running the app locally:

```bash
cp .env.example .env
```

The main variables are:

* `PORT` – HTTP port for the API server
* `LOG_LEVEL` – logging verbosity
* `DATABASE_URL` – PostgreSQL connection string
* `REDIS_HOST` / `REDIS_PORT` / `REDIS_PASSWORD` – Redis connection details
* `MFAPI_BASE_URL` – base URL for the upstream fund API
* `CACHE_TTL_SECONDS` – Redis cache TTL in seconds
* `SYNC_QUEUE_NAME` – BullMQ queue name
* `DEAD_LETTER_QUEUE_NAME` – dead-letter queue name
* `SYNC_BATCH_SIZE` – number of funds per batch
* `SYNC_BATCH_DELAY_MS` – delay between batches
* `SYNC_REQUEST_SPACING_MS` – delay between individual fund sync jobs

---

## Local development setup

### 1) Install dependencies

```bash
npm install
```

### 2) Start PostgreSQL and Redis

Using Docker Compose:

```bash
docker compose up -d postgres redis
```

### 3) Generate Prisma client and apply migrations

```bash
npm run prisma:generate
npm run prisma:deploy
```

### 4) Seed the initial fund catalog

```bash
npm run prisma:seed
```

### 5) Start the API and worker processes

In separate terminals:

```bash
npm run start
```

```bash
npm run worker
```

### 6) Trigger a sync

```bash
curl -X POST http://localhost:3000/sync/trigger
```

You can inspect the sync status with:

```bash
curl http://localhost:3000/sync/status
```

---

## Docker Compose workflow

The repository includes a Docker Compose configuration that starts:

* PostgreSQL
* Redis
* the API service
* the worker service

Run:

```bash
docker compose up --build
```

The API and worker containers both run Prisma migrations on startup through the compose command, so the database is prepared automatically.

To seed funds once the containers are running:

```bash
docker compose exec api node prisma/seed.js
```

---

## API reference

Default base URL:

```text
http://localhost:3000
```

### Fund endpoints

* `GET /funds`
  * Lists funds
  * Optional query params: `category`, `amc`

* `GET /funds/:code`
  * Returns a single fund plus its latest NAV snapshot

* `GET /funds/:code/analytics`
  * Returns precomputed analytics for a given fund and window
  * Required query param: `window`
  * Valid values: `1Y`, `3Y`, `5Y`, `10Y`

* `GET /funds/:code/analytics/coverage`
  * Returns which analytics windows are available for the fund

* `GET /funds/rank`
  * Ranks funds by a selected analytics window
  * Required query params: `category`, `window`
  * Optional query params: `sort_by`, `limit`
  * `sort_by` accepts `median_return` or `max_drawdown`

### Sync endpoints

* `POST /sync/trigger`
  * Enqueues a full sync job
  * Returns a queued job id

* `GET /sync/status`
  * Returns queue counts and per-fund sync state

### Metrics endpoint

* `GET /metrics`
  * Returns current rate-limit usage counters and configured limits

### Sample requests

List funds:

```bash
curl http://localhost:3000/funds
```

Get a fund detail:

```bash
curl http://localhost:3000/funds/120503
```

Get analytics for a window:

```bash
curl "http://localhost:3000/funds/120503/analytics?window=3Y"
```

Rank funds in a category:

```bash
curl "http://localhost:3000/funds/rank?category=Equity%3A%20Mid%20Cap%20Direct%20Growth&window=1Y&limit=5"
```

---

## Testing

The project uses Vitest.

Run the full suite:

```bash
npm test
```

The current test suite covers:

* analytics calculations
* sync planner resumability
* API route behavior
* rate limiter behavior

The test suite is currently passing.

---

## Additional utility scripts

The package.json includes a few useful commands:

* `npm run benchmark:api` – runs a simple API benchmark script
* `npm run proof:rate-limit` – exercises the limiter and prints proof-like counters
* `npm run sync:trigger` – triggers a manual sync from the command line

---

## Postman collection

A sample Postman collection is included at:

```text
postman/Mutual-Fund-Analytics.postman_collection.json
```

Import it to quickly exercise the API endpoints.

---

## Validation and operational notes

Additional operational guidance and example verification steps are documented in:

```text
docs/VALIDATION_EVIDENCE.md
```

That document includes examples for:

* rate-limit verification
* API benchmark checks
* analytics coverage inspection
* sync pipeline verification

---

## Suggested verification flow

To verify the system end-to-end:

1. Start PostgreSQL and Redis
2. Generate/apply Prisma migrations
3. Seed funds
4. Start the API and worker
5. Trigger a sync job
6. Check `/funds`
7. Check `/funds/:code/analytics`
8. Check `/sync/status`
9. Check `/metrics`
10. Run `npm test`

If the app is wired correctly, these steps should provide a working ingestion pipeline from external data to persisted analytics and queryable APIs.

