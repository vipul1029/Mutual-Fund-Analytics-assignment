# Mutual Fund Analytics Backend

Production-grade Node.js backend for fetching and analyzing Indian mutual fund NAV history from [mfapi.in](https://api.mfapi.in), with strict multi-window rate limiting, resumable sync pipeline, precomputed analytics, and low-latency APIs.

## Stack

- Node.js 20+ (LTS)
- Fastify
- PostgreSQL + Prisma
- Redis + BullMQ
- Bottleneck (rate limiting)
- Day.js (date handling)
- Vitest (tests)

## Folder Structure

```text
src/
  api/
    routes/
  services/
  pipeline/
  analytics/
  db/
  queue/
  utils/
prisma/
tests/
```

## Quick Start (Local)

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy env template:
   ```bash
   cp .env.example .env
   ```
3. Start PostgreSQL + Redis (Docker recommended):
   ```bash
   docker compose up -d postgres redis
   ```
4. Generate Prisma client and apply migrations:
   ```bash
   npm run prisma:generate
   npm run prisma:migrate -- --name init
   ```
5. Seed the exact 10 funds (real discovery through `mfapi.in`):
   ```bash
   npm run prisma:seed
   ```
6. Start API and worker:
   ```bash
   npm run start
   npm run worker
   ```
7. Trigger initial backfill:
   ```bash
   curl -X POST http://localhost:3000/sync/trigger
   ```

## Docker Full Run

```bash
docker compose up --build
```

Then seed once:

```bash
docker compose exec api node prisma/seed.js
```

## Endpoints

- `GET /funds?category=&amc=`
- `GET /funds/:code`
- `GET /funds/:code/analytics?window=3Y`
- `GET /funds/:code/analytics/coverage` (edge-case helper for insufficient history)
- `GET /funds/rank?category=<required>&sort_by=median_return|max_drawdown&window=<required>&limit=5`
- `GET /metrics`
- `POST /sync/trigger`
- `GET /sync/status`

## Performance Notes

- Analytics are precomputed and persisted in `analytics` table.
- Redis caching is enabled for funds list/detail/ranking/analytics.
- DB indexes exist on filter/sort paths.
- APIs are read-optimized and do not perform heavy analytics computations on request path.

## Rate-Limit Guarantees

All outbound MFAPI requests pass through a chained Bottleneck strategy:

- 2 req/sec
- 50 req/min
- 300 req/hour

All three limits are enforced simultaneously.

## Testing

```bash
npm test
```

Includes:
- Rate limiter correctness
- Analytics correctness
- Pipeline resumability logic

## Final Validation Checklist (Proof-Oriented)

1. Start services and run sync:
   ```bash
   docker compose up -d postgres redis
   npm run prisma:generate
   npm run prisma:migrate -- --name init
   npm run prisma:seed
   npm run start
   npm run worker
   curl -X POST http://localhost:3000/sync/trigger
   ```
2. Verify sync status and fund-level states:
   ```bash
   curl http://localhost:3000/sync/status
   ```
3. Verify live rate metrics:
   ```bash
   curl http://localhost:3000/metrics
   ```
4. Run automated rate-limit proof:
   ```bash
   npm run proof:rate-limit
   ```
5. Run API benchmark proof:
   ```bash
   npm run benchmark:api
   ```
6. Validate insufficient-history handling:
   ```bash
   curl "http://localhost:3000/funds/<code>/analytics/coverage"
   ```

See `docs/VALIDATION_EVIDENCE.md` for sample proof logs/output and acceptance criteria.
