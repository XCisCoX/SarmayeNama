# Deployment

Requirements: a normal Linux VPS with Docker Engine ≥ 24 and Docker Compose v2.
No paid hosted service is required.

## Quick start

```bash
cp .env.example .env
nano .env            # add free API keys (optional) and set ADMIN_SECRET
docker compose up --build -d
docker compose ps    # db, web, worker all healthy
```

- Web: http://your-vps:3000 (bound to 127.0.0.1 by default — put nginx/Caddy in
  front for TLS, or change the ports mapping).
- The web container runs `prisma migrate deploy` + seed on startup, then starts
  Next.js. The worker container starts ingesting immediately.
- A second worker instance refuses to start (advisory lock) — you can run
  exactly one worker replica.

## Reverse proxy (nginx example)

```nginx
server {
  listen 80;
  server_name markets.example.com;
  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

Set `WEB_ORIGIN=https://markets.example.com` in `.env` so canonical URLs, OG
tags and the sitemap use the public origin. Consider `certbot` for TLS.

## Local development without Docker

```bash
pnpm install
cp .env.example .env            # DATABASE_URL -> your local Postgres
pnpm db:generate && pnpm db:migrate && pnpm db:seed
pnpm dev:worker                 # terminal 1
pnpm dev:web                    # terminal 2 (http://localhost:3000)
```

## Production build (no Docker)

```bash
pnpm install --frozen-lockfile
pnpm --filter @sarmaye/database db:generate
pnpm --filter @sarmaye/shared --filter @sarmaye/market-core --filter @sarmaye/database --filter @sarmaye/providers --filter @sarmaye/worker build
pnpm --filter @sarmaye/web build
# run:
DATABASE_URL=… node apps/worker/dist/index.js          # worker
DATABASE_URL=… WEB_ORIGIN=… node apps/web/node_modules/next/dist/bin/next start -p 3000
```

## Configuration reference

See `.env.example` for every variable. Key groups:

- `DATABASE_URL` — required.
- `BRSAPI_API_KEY`, `NAVASAN_API_KEY`, `METALSDEV_API_KEY`,
  `ALPHAVANTAGE_API_KEY`, `COINGECKO_API_KEY` (optional), `FRED_API_KEY`.
- Feature flags: `IRANIAN_STOCKS_ENABLED`, `GLOBAL_MARKETS_ENABLED`,
  `ECONOMIC_INDICATORS_ENABLED`.
- Refresh intervals and daily quota budgets per provider (see
  `docs/provider-matrix.md`).
- `ADMIN_SECRET` — protect the /admin diagnostics page.
- `WEB_ORIGIN` — public origin for SEO links.

## Health checks

- `GET /api/health` — `{ status, database, staleAssets, providers, providersDown }`
  (public, no sensitive details).
- Docker Compose uses it for the web healthcheck.

## Observability

- Worker logs structured JSON to stdout (`LOG_JSON=true`), including ingestion
  results, retries, circuit events, aggregation counts and prune runs.
- Provider response times, success/failure counters, last success timestamps
  and stale-asset counts are visible on `/status` (public) and `/admin`
  (protected by `ADMIN_SECRET`).

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| Web shows provider cards "تنظیم نشده" | Set the listed env var and restart the container |
| `quota_exhausted` on status page | Daily free quota reached; the worker skips until the next UTC day |
| BTC/ETH show but Iranian prices don't | BrsApi key not configured — expected, no fake data is shown |
| Chart range missing | No data for that range yet; ranges without data are hidden |
| Worker exits on start | Another worker holds the advisory lock — run one replica |
