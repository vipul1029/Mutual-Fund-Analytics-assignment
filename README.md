# Mutual Fund Analytics Backend

## Overview

A Node.js backend for fetching and analyzing Indian mutual fund NAV data from mfapi.in. It uses rate-limited data ingestion, background sync processing, and precomputed analytics to provide fast API responses.

---

## Tech Stack

* Node.js (v20+)
* Fastify
* PostgreSQL with Prisma
* Redis with BullMQ
* Bottleneck (rate limiting)
* Day.js (date handling)
* Vitest (testing)

This stack was chosen to keep the system simple, scalable, and easy to reason about.

---

## How the System Works

* A background worker fetches NAV data from the external API
* Requests are rate-limited (per second, minute, and hour)
* Data is stored in PostgreSQL
* Analytics are precomputed and stored
* APIs return fast responses without heavy computation at request time

---

## Project Structure

```text
src/
  api/
  services/
  pipeline/
  analytics/
  db/
  queue/
  utils/
prisma/
tests/
```

---

## Running the Project (Local)

1. Install dependencies

   ```bash
   npm install
   ```

2. Setup environment

   ```bash
   cp .env.example .env
   ```

3. Start PostgreSQL and Redis

   ```bash
   docker compose up -d postgres redis
   ```

4. Setup database

   ```bash
   npm run prisma:generate
   npm run prisma:migrate -- --name init
   ```

5. Seed initial funds

   ```bash
   npm run prisma:seed
   ```

6. Start the server and worker

   ```bash
   npm run start
   npm run worker
   ```

7. Trigger data sync

   ```bash
   curl -X POST http://localhost:3000/sync/trigger
   ```

---

## Running with Docker

```bash
docker compose up --build
```

Then seed once:

```bash
docker compose exec api node prisma/seed.js
```

---

## API Endpoints

Base URL: `http://localhost:3000`

Below are the main APIs exposed by the system:

| Method | Endpoint                          | Description                                    |
| ------ | --------------------------------- | ---------------------------------------------- |
| GET    | `/funds`                          | List funds (optional filters: category, amc)   |
| GET    | `/funds/:code`                    | Get fund details                               |
| GET    | `/funds/:code/analytics`          | Get analytics (requires `window=1Y/3Y/5Y/10Y`) |
| GET    | `/funds/:code/analytics/coverage` | Check available data windows                   |
| GET    | `/funds/rank`                     | Rank funds (requires category + window)        |
| POST   | `/sync/trigger`                   | Trigger background sync                        |
| GET    | `/sync/status`                    | Check sync status                              |
| GET    | `/metrics`                        | View rate limiter metrics                      |

Example:

```bash
curl http://localhost:3000/funds
```

---

## Rate Limiting

All external API calls follow these limits:

* 2 requests per second
* 50 requests per minute
* 300 requests per hour

These limits are enforced together to ensure stable and safe API usage.
You can verify this using the `/metrics` endpoint and worker logs.

---

## Testing

Run all tests:

```bash
npm test
```

Tests cover:

* Rate limiting logic
* Analytics calculations
* Pipeline behavior
* API responses

---

## Postman Collection

A Postman collection is included to make API testing easier.

Import from:

```
postman/Mutual-Fund-Analytics.postman_collection.json
```

---

## What to Verify

After running the project:

* Trigger sync → data should start loading
* `/funds` → should return list of funds
* `/analytics` → should return computed metrics
* `/metrics` → should show rate limiter usage
* All tests should pass

These steps help confirm that the system is working end-to-end.

---

