# سرمایه‌نما / SarmayeNama

Persian financial market dashboard — live Iranian free-market currency, gold and
coin prices, global reference FX, precious metals and cryptocurrencies, with
**transparent source and freshness labeling** on every value.

- **Persian-first, RTL** interface (English UI included)
- Dark / light themes, Toman / Rial display modes, Jalali / Gregorian dates
- Interactive charts (TradingView Lightweight Charts), converter, fuzzy search,
  favorites (localStorage), PWA installable
- Quota-aware ingestion worker with circuit breakers, retries and stale detection
- 100 % free APIs + self-hosted infrastructure (PostgreSQL, Docker Compose)

## What data is actually live (read this first)

| Data | Provider | Truthful label |
|---|---|---|
| Iranian currencies, gold, coins (with BrsApi key) | BrsApi | **Live** |
| Iranian currencies fallback | Navasan | **Live** (low-frequency fallback) |
| Cryptocurrencies (BTC, ETH, …) | CoinGecko (+ BrsApi) | **Live** (exchange aggregate) |
| Global FX | Frankfurter | **Daily reference rate** — never called "live" |
| Precious metals (with Metals.dev key) | Metals.dev | **Live** (spot) |
| US stocks (with Finnhub key + flag) | Finnhub | **Live** (real-time on free plan) |
| US stocks / commodities (with Alpha Vantage key) | Alpha Vantage | **Delayed** — not real-time |
| Energy commodities (with EIA key) | EIA | **Daily reference rate** (official US data) |
| Iranian stocks (with key + flag) | BrsApi TSETMC | **Delayed** |
| US economic indicators (with FRED key + flag) | FRED | **Daily reference rate** |
| Market news (with NewsAPI/Brave key) | NewsAPI / Brave | News headlines, cached, with source + fetch time |
| AI market summary (with Gemini key) | Gemini | **AI-generated — not investment advice** |

Every quote in the UI shows: provider name, provider timestamp, server receive
time, data freshness, currency, unit, and whether it is live / delayed / daily
reference / derived / cached / stale. If a provider is unreachable, the last
successful value stays visible with a clear stale-data banner — prices are
**never invented**.

## Which history is provider-supplied vs locally collected

- **Provider-supplied:** global FX daily history (Frankfurter, backfilled from
  first run) and crypto daily/hourly history (CoinGecko market charts).
- **Locally collected:** Iranian currencies, gold, coins, metals and everything
  else without free history. The worker stores a snapshot on every tick from
  the day the service starts, then aggregates 5m / 15m / 1h / 1d / 1w / 1mo
  OHLC candles. The UI shows "Historical data for this asset has been collected
  by this service since {date}" and hides ranges that have no data.

## Getting free API keys

| Provider | Where | What you get |
|---|---|---|
| BrsApi (Iranian gold/currency + TSETMC) | https://brsapi.ir (request free key) | 1500 req/day free |
| Navasan (fallback) | https://navasan.tech | limited free plan |
| Metals.dev | https://metals.dev | ~100 req/day free tier |
| Finnhub (US stocks) | https://finnhub.io | real-time US quotes, 60/min free |
| Alpha Vantage | https://www.alphavantage.co/support/#api-key | ~25 req/day free |
| CoinGecko (optional) | https://www.coingecko.com/en/api | free demo key (higher rate limit) |
| FRED | https://fred.stlouisfed.org/docs/api/api_key.html | 120 req/min free |
| NewsAPI (market news) | https://newsapi.org/register | 100 req/day free (non-commercial) |
| Brave Search (news fallback) | https://brave.com/search/api/ | 2000 queries/month free |
| EIA (energy commodities) | https://www.eia.gov/opendata/ | free key, generous limits |
| Gemini (AI summary) | https://aistudio.google.com/apikey | free tier; enable the Generative Language API for the key |

No credit card is ever required. The app runs fine with **no keys at all**:
Frankfurter + CoinGecko work keyless, and every key-requiring provider shows a
card explaining exactly which environment variable is missing.

## News & AI summary

- **Market news** (`/api/news`) — headlines from NewsAPI (preferred) or Brave
  Search, fetched server-side and cached in PostgreSQL for `NEWS_INTERVAL_MS`
  (default 45 min) so browser visits can never hammer the news API. The card
  shows source, relative publish time, fetch time and attribution. NewsAPI has
  no Persian-language sources, so the Persian feed mixes English + Persian
  query terms.
- **AI market summary** (`/api/ai-summary`) — Google Gemini (flash model)
  summarizes the latest stored quotes, cached for `GEMINI_INTERVAL_MS`
  (default 30 min). Every card is labeled "AI-generated — not investment
  advice". If it shows an error, enable the Generative Language API for your
  key in Google AI Studio / Cloud console (or the network may be blocking it).

## Quick start (Docker Compose)

```bash
cp .env.example .env
# optionally fill in free API keys, then:
docker compose up --build
```

Open http://localhost:3000. The web container applies migrations + seed on
startup; the worker container starts ingesting immediately.

## Local development (pnpm)

Requires Node ≥ 20 and a PostgreSQL database (e.g. `docker run -d -p 5432:5432
-e POSTGRES_USER=sarmaye -e POSTGRES_PASSWORD=sarmaye -e POSTGRES_DB=sarmaye
postgres:16-alpine`).

```bash
pnpm install
cp .env.example .env          # set DATABASE_URL for your local Postgres
pnpm db:generate              # generate the Prisma client
pnpm db:migrate               # prisma migrate dev (creates + applies migrations)
pnpm db:seed                  # idempotent seed: providers, assets, aliases
pnpm dev:worker               # ingestion worker (terminal 1)
pnpm dev:web                  # Next.js dev server on :3000 (terminal 2)
```

## Commands

```bash
pnpm build          # build all workspace packages + web
pnpm typecheck      # tsc --noEmit across the monorepo
pnpm lint           # ESLint (web)
pnpm test           # unit + integration tests (Vitest)
pnpm test:e2e       # Playwright end-to-end (needs the app running, see below)
pnpm db:studio      # Prisma Studio
```

Playwright e2e: start the stack (`pnpm dev:worker`, `pnpm dev:web` or
`docker compose up`), then `pnpm exec playwright install chromium` once, then
`pnpm test:e2e`.

## Adding another asset

1. Add a `SeedAsset` entry in `packages/shared/src/constants.ts`
   (symbol, Persian/English names, asset class, unit, precision, aliases,
   provider external ids).
2. Re-seed: `pnpm db:seed`.
3. If the provider needs a new external symbol, add it to the asset's
   `providers` map — the worker picks it up on the next tick.

## Adding another provider

1. Create `packages/providers/src/<name>.ts` implementing `MarketDataProvider`
   (see `packages/providers/src/types.ts`): `getLatestQuotes`, `getHistoricalData`,
   `getHealth`, plus the optional `getUsageStatus`.
2. Register it in `src/registry.ts` (enablement rules + config checks).
3. Add its metadata to `PROVIDER_META` in `packages/shared/src/constants.ts`
   and the seed.
4. Add env vars to `packages/shared/src/env.ts`, `.env.example`, and
   `docker-compose.yml`.
5. Write a normalization test with a captured sample payload.
   Full guidance: `docs/adding-a-provider.md`.

## Docs

- [Architecture](docs/architecture.md)
- [Provider matrix](docs/provider-matrix.md)
- [API reference](docs/api.md)
- [Data freshness](docs/data-freshness.md)
- [Database](docs/database.md)
- [Deployment](docs/deployment.md)
- [Backup & restore](docs/backup-and-restore.md)
- [Adding a provider](docs/adding-a-provider.md)
- [Legal & attribution](docs/legal-and-attribution.md)

## Disclaimer

This project is not financial advice. Data may be delayed or reference-only,
and every value is labeled accordingly.
