# Architecture

## Overview

```
┌─────────────┐   ┌──────────────────────────────────────────────┐
│  Browsers   │──▶│ apps/web  (Next.js 15 App Router, RTL, PWA)  │
│ (fa/en RTL) │   │  SSR pages · /api/* routes · TanStack Query  │
└─────────────┘   └──────────────┬───────────────────────────────┘
                                 │ PostgreSQL (Prisma ORM)
┌─────────────┐   ┌──────────────▼───────────────────────────────┐
│ Providers   │   │ apps/worker (Node.js TypeScript, pino logs)  │
│ (8 adapters)│──▶│  scheduler · quota · circuit breaker · retry │
│ keyless+key │   │  OHLC aggregation · history seed · stale     │
└─────────────┘   └──────────────────────────────────────────────┘
```

- `packages/shared` — domain types, Zod schemas for every API surface, the
  asset catalog, provider metadata, i18n dictionaries (fa/en), env validation.
- `packages/database` — Prisma schema/client, idempotent seed, advisory locks.
- `packages/market-core` — high-precision financial math (decimal.js), gold
  unit conversions, OHLC aggregation, Persian/Jalali formatting.
- `packages/providers` — the `MarketDataProvider` interface and adapters.
  Providers are stateless: they receive a symbol mapping and return normalized
  quotes; they never touch the database.
- `apps/worker` — the quota-aware ingestion scheduler.
- `apps/web` — the Persian-first RTL frontend + internal API.

## Key design decisions

1. **No browser → provider calls.** All third-party requests happen in the
   worker. API keys exist only in server env vars.
2. **Normalized quotes.** Every adapter returns
   `{ symbol, price, bid, ask, …, marketTimestamp, receivedAt, freshness,
   rawChecksum, rawMetadata }` validated by Zod before storage.
3. **Truthful freshness.** Each provider carries a `delayLabel`
   (Live / Delayed / Daily reference rate). Quotes are dynamically re-labeled
   stale when `receivedAt` exceeds 3× the provider interval (min 15 min).
4. **Last-known-good.** `latest_quotes` are only ever replaced, never deleted
   on failure; the UI shows the stale banner instead of nothing.
5. **Two history sources.** Provider-supplied history (Frankfurter daily,
   CoinGecko market charts) and locally collected snapshots aggregated into
   OHLC candles. Ranges without data are hidden, never faked.
6. **Quota-first scheduling.** Per-provider daily budgets in
   `provider_usage`; the scheduler skips exhausted providers and records
   `quota_exhausted` health. Rate-limited APIs are never retried in a loop
   (429 → `ProviderRateLimitedError`, no retries).
7. **Circuit breaker per provider.** After N consecutive failures the circuit
   opens for a cooldown, then half-opens for a probe. Missing API keys record
   `not_configured` and never trip the circuit.
8. **Single-worker guarantee.** The worker acquires a Postgres advisory lock
   (`pg_try_advisory_lock(42)`); a second instance exits with a clear message.
9. **Derived prices are labeled.** Converter outputs and theoretical gold
   conversions carry `derived: true`, the formula, and their input sources —
   they are never presented as actual Iranian market prices.

## Data flow (one ingestion tick)

```
scheduler tick
  └─ runIngestion(provider)
       ├─ circuit open?        → skip (record circuit_open)
       ├─ quota exhausted?     → skip (record quota_exhausted)
       ├─ record run 'started'
       ├─ fetch → normalize → validate (Zod)
       ├─ upsert latest_quote + insert snapshot (P2002 dedup guard)
       ├─ record usage + health + run 'success'
       └─ on error → record failure; backoff on next tick (no tight loop)
aggregation tick (5 min)
  └─ snapshots → 5m/15m/1h/1d/1w/1mo candles (calendar-aware bucketing)
history seed tick (daily + on start)
  └─ frankfurter: incremental daily FX history (100-day windows)
     coingecko:   daily/hourly market charts, 8s pacing, defer on 429
stale tick
  └─ latest_quotes older than threshold → freshness='stale'
prune tick (daily)
  └─ raw snapshots older than SNAPSHOT_RETENTION_DAYS are deleted (candles kept)
```

## API surface (internal routes, rate-limited)

| Route | Purpose |
|---|---|
| `GET /api/market/overview` | Home page payload: quotes, sparklines, gainers/losers, provider status |
| `GET /api/market/sparklines?symbols=&days=` | Mini sparkline closes |
| `GET /api/assets?category=&search=&limit=&offset=` | Paged asset list |
| `GET /api/assets/:symbol` | Latest quote for an asset |
| `GET /api/assets/:symbol/history?range=` | OHLC candles + available ranges |
| `GET /api/categories` | Category list with asset counts |
| `GET /api/converter?from=&to=&amount=` | Conversion with formula + direct/derived flag |
| `GET /api/providers/status` | Provider health, usage, delay labels |
| `GET /api/search?q=&limit=` | Fuzzy search (fa/en/symbol/alias) |
| `GET /api/health` | Public health: db ok, stale count, providers down |
| `GET /api/admin?secret=` | Internal diagnostics (protected by `ADMIN_SECRET`) |

All inputs are validated with Zod; errors use a consistent envelope
`{ error: { code, message, requestId } }`; public routes are rate-limited per IP.

## Security

- Keys never reach the browser (server-only env; no arbitrary proxy endpoint).
- CSP + security headers in `next.config.mjs`; `frame-ancestors 'none'`.
- No user-controlled provider URLs (no SSRF surface: providers are fixed
  constants, base-URL overrides are env-only).
- Admin diagnostics require `ADMIN_SECRET` and expose no keys or connection
  strings. Admin and API routes are excluded from indexing (`robots.ts`).
- `.env.example` ships without secrets; the repo never commits a real key.
