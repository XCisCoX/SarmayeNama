# Database

PostgreSQL via Prisma ORM. All monetary values are `NUMERIC` (never float).

## Tables

| Table | Purpose | Key constraints / indexes |
|---|---|---|
| `Provider` | Provider registry + free-plan metadata | `code` unique; `enabled` index |
| `Asset` | Canonical asset catalog (fa/en names, class, market, quote currency, unit, precision, icon, sort order) | `symbol` unique; `(assetClass, enabled)` index |
| `AssetAlias` | Search aliases (دلار, dollar, BTC…) | `(assetId, alias)` unique; `alias` index |
| `ProviderAsset` | Which provider serves which asset + external symbol | `(assetId, providerId)` unique; `(providerId, externalSymbol)` index |
| `LatestQuote` | One current quote per (asset, provider) | `(assetId, providerId)` unique; `freshness`, `receivedAt` indexes |
| `QuoteSnapshot` | Raw history ticks (never mutated) | `(assetId, providerId, marketTimestamp)` unique — **duplicate prevention**; `(assetId, receivedAt)` index |
| `OhlcCandle` | Aggregated 5m/15m/1h/1d/1w/1mo candles | `(assetId, interval, startTime)` unique; `(assetId, interval, isFinal)` index |
| `ProviderHealthCheck` | Health history (ok/down/quota_exhausted/…) | `(providerId, checkedAt)` index |
| `ProviderUsage` | Daily request/success/failure counters (quota enforcement) | `(providerId, date)` unique |
| `IngestionRun` | Job-level observability log | `(providerId, startedAt)`, `(jobType, startedAt)` indexes |
| `MarketSession` | Market open/closed state (iran_fx, tsetmc, forex, crypto, metals, commodities) | `market` unique |
| `SystemSetting` | Key/value settings | `key` PK |

## Duplicate prevention

`QuoteSnapshot` has a unique constraint on `(assetId, providerId, marketTimestamp)`.
The worker inserts snapshots with `skipDuplicates` semantics (P2002 is caught
and ignored), so repeated ticks with the same market timestamp — which BrsApi
emits at minute resolution — never create duplicates. This is covered by an
integration test.

## Decimal precision

- Prices/OHLC: `NUMERIC(24, 8)`
- Change percent: `NUMERIC(12, 6)`
- Volume/market cap/supply: `NUMERIC(30, 8)`

## Migrations

- `packages/database/prisma/migrations/` — versioned SQL migrations.
- Apply in production: `pnpm db:deploy` (runs automatically in the Docker web
  entrypoint before `next start`).
- Develop: `pnpm db:migrate` (dev mode creates a new migration) and
  `pnpm db:seed` (idempotent).

## Seed

`packages/database/prisma/seed.ts` upserts: 8 providers, 87 assets (Iranian
currencies + gold/coins, global FX, metals, 15 cryptos, TSETMC symbols,
experimental global stocks/commodities, FRED indicators), 212 aliases, 104
provider-asset mappings, market sessions and system settings. Safe to run any
number of times.

## Least-privilege guidance

Create a dedicated role for the app:

```sql
CREATE ROLE sarmaye_app LOGIN PASSWORD '…';
GRANT CONNECT, TEMPORARY ON DATABASE sarmaye TO sarmaye_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO sarmaye_app;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO sarmaye_app;
```

For the worker you may additionally grant `TRUNCATE` if you plan to prune
snapshots from the app role; otherwise run pruning with the migration user.
Do not use the superuser for the web service.
