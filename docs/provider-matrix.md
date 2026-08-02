# Provider Matrix

Research current as of 2026-08-02. All providers are free-tier only; no paid
dependency is introduced. "Enabled by default" means the adapter is active
without extra configuration (keyless providers) — key-requiring providers
show up as "not configured" cards until their free key is added.

| Provider | Asset classes | Auth | Free quota | Refresh interval | Historical data | Attribution | Commercial-use limits | Data delay | Fallback | Enabled by default |
|---|---|---|---|---|---|---|---|---|---|---|
| BrsApi (Gold & Currency) | Iranian currencies, gold, coins | Free API key (`BRSAPI_API_KEY`) | 1500 requests/day (documented) | 90 s (configurable) | None free → local snapshots | Link to brsapi.ir | Free plan for apps; verify current ToS at signup | Live (لحظهای) | Navasan | Yes (key needed) |
| Navasan | Iranian currencies, gold | Free API key (`NAVASAN_API_KEY`) | Limited free plan — verify at signup | 10 min (low frequency) | None | Link to navasan.tech | Free plan restricted | Live | — | Yes (key needed, low-frequency fallback only) |
| BrsApi TSETMC | Tehran Stock Exchange | Free API key (separate request) + `IRANIAN_STOCKS_ENABLED=true` | Part of TSETMC free service | 5 min during market hours | Provider-supplied via TSE | Link to brsapi.ir | Free; verify terms | Delayed | — | No (feature flag) |
| Frankfurter | Global FX reference rates | None (keyless) | Unmetered (fair use) | 12 h (daily reference) | Yes — daily since 1999 | ECB reference rates via frankfurter.dev (required) | Free for non-commercial and commercial use | Daily reference rate — **never called live** | — | Yes |
| Metals.dev | Precious metals (XAU/XAG/XPT/XPD) | Free API key (`METALSDEV_API_KEY`) | ~100/day free tier; check `GET /v1/usage` before scheduling | 6 h default (quota-guarded) | Free plan: limited; rely on local snapshots | Link to metals.dev | Free tier for non-commercial; verify | Live spot | Alpha Vantage (gold/silver) | Yes (key needed) |
| Alpha Vantage | US stocks, commodities, metals fallback, FX | Free API key (`ALPHAVANTAGE_API_KEY`) | ~25 requests/day (free) | 24 h (a few scheduled calls/day) | Daily time series (compact) | Link to alphavantage.co | Free tier non-commercial; watermark-free with attribution | **Delayed — not real-time** | — | No (experimental module flag) |
| CoinGecko | Cryptocurrencies (15 assets) | Keyless public endpoints; optional free demo key (`COINGECKO_API_KEY`) | ~5–15 req/min keyless; 30/min with demo key | 5 min (batch endpoint) | Yes — market_chart (daily/hourly) | Link to coingecko.com | Free tier for public apps; verify | Live (exchange aggregate) | — | Yes |
| FRED | US economic indicators | Free 32-char API key (`FRED_API_KEY`) | 120 req/min (documented) | 24 h | Yes — full series | Federal Reserve Bank of St. Louis (required) | Free for public use | Daily reference rate | — | Yes (key needed + `ECONOMIC_INDICATORS_ENABLED=true`) |
| Finnhub | US stocks (8 assets incl. SPY) | Free API key (`FINNHUB_API_KEY`) + `GLOBAL_MARKETS_ENABLED=true` | 60 calls/min (free plan) | 30 min (configurable) | No free batch history → local snapshots | Link to finnhub.io | Free tier for apps under limits | **Live** (US stocks are real-time on the free plan) | Alpha Vantage | Yes (key + flag) |
| EIA | Energy commodities (WTI, Brent, natural gas) | Free API key (`EIA_API_KEY`) | Generous (fair use) | 24 h | Yes — full daily series | US Energy Information Administration (EIA) | Free for public use | Daily reference rate | Alpha Vantage | Yes (key needed) |
| NewsAPI | Market news | Free API key (`NEWS_API_KEY`) | 100 requests/day (non-commercial only) | 45 min cache (configurable) | N/A | newsapi.org attribution | Free tier is **non-commercial** | Articles delayed ≥24 h | Brave Search | Yes (key needed; preferred when present) |
| Brave Search | Market news (fallback) | Free API key (`BRAVE_API_KEY`) | 2000 queries/month | 45 min cache | N/A | brave.com/search/api attribution | Free tier non-commercial | News search | NewsAPI | Yes (key needed) |
| Google Gemini | AI market summary | Free API key (`GEMINI_API_KEY`) | Free tier (flash models) | 30 min cache | N/A | ai.google.dev attribution | Free tier for apps | N/A | — | Yes (key + `GEMINI_SUMMARIES_ENABLED=true`) |

## Verification notes (measured on 2026-08-02)

- **Frankfurter** moved to `api.frankfurter.dev` (the old `.app` host 301-redirects).
  `GET /v1/latest?from=USD` returns `{ amount, base, date, rates }` — keyless, works.
  Historical ranges work with `GET /v1/{start}..{end}?from=USD` (max 100 days per call;
  the worker splits into windows).
- **CoinGecko** keyless endpoints verified live: `GET /api/v3/coins/markets?...`
  and `GET /api/v3/coins/{id}/market_chart?...`. Public rate limit is tight;
  the worker batches all 15 assets into ONE markets call and paces history
  seeding (8 s between assets, deferring on 429).
- **BrsApi** now requires a free API key for `Gold_Currency.php`
  (`{"status":"missing_param"}` without it). The real sample payload
  (`gold`/`currency`/`cryptocurrency` groups with `price` in Toman and
  `time_unix`) is captured as a test fixture in
  `packages/providers/src/fixtures/brsapi-gold-currency.json`.
- **Metals.dev** — the website is reachable; `api.metals.dev` was NOT reachable
  from the test network (likely geo-blocking). The adapter fails gracefully and
  the site keeps working with a visible provider status. The payload key
  mapping (XAU → `gold`, XAG → `silver`, XPT → `platinum`, XPD → `palladium`)
  is implemented and unit-tested against a captured response shape.
- **Alpha Vantage** — the public `demo` key works for `GLOBAL_QUOTE` (stocks).
  `CURRENCY_EXCHANGE_RATE` needs a real key. Free tier ≈ 25 requests/day, so
  the scheduler caps it hard and it is disabled by default.
- **Navasan** returns `api_key is missing` without a key (401). Free plan quota
  must be re-verified at registration; the adapter is a low-frequency fallback.
- **FRED** requires the standard 32-char key; `observations` JSON shape verified.
- **Finnhub** verified live: `GET /quote?symbol=AAPL` returns `{c,d,dp,h,l,o,pc,t}` with the
  free key; 8 US assets (AAPL/MSFT/NVDA/GOOGL/AMZN/TSLA/META/SPY) ingest successfully.
- **NewsAPI** verified live: `GET /v2/everything?q=bitcoin+OR+gold…` works with the free
  key. **NewsAPI has no Persian-language sources** — the Persian feed queries English +
  Persian terms and is labeled accordingly.
- **EIA** (`api.eia.gov`) and **Gemini** (`generativelanguage.googleapis.com`) were
  unreachable from the test network (403 at the edge — same geo-blocking class as
  Metals.dev). Both adapters are written against the official documented contracts,
  unit-tested with fixtures, and fail gracefully here; they work from a normal VPS.

## No-unauthorized-scraping statement

All adapters use official, documented HTTP APIs. No website is scraped. The
BrsApi sample payload used in tests is a public documentation sample, not a
scrape of live data. No unofficial Yahoo Finance endpoints are used.

## Quota & scheduling defaults (env-configurable)

| Provider | Interval env | Daily limit env |
|---|---|---|
| brsapi | `BRSAPI_INTERVAL_MS` (90 000) | `BRSAPI_DAILY_LIMIT` (1500) |
| navasan | `NAVASAN_INTERVAL_MS` (600 000) | `NAVASAN_DAILY_LIMIT` (240) |
| brsapi-tsetmc | `TSETMC_INTERVAL_MS` (300 000) | — |
| frankfurter | `FRANKFURTER_INTERVAL_MS` (43 200 000) | — |
| metalsdev | `METALS_INTERVAL_MS` (21 600 000) | `METALSDEV_DAILY_LIMIT` (20) |
| alphavantage | `ALPHAVANTAGE_INTERVAL_MS` (86 400 000) | `ALPHAVANTAGE_DAILY_LIMIT` (25) |
| coingecko | `COINGECKO_INTERVAL_MS` (300 000) | `COINGECKO_DAILY_LIMIT` (1000) |
| fred | `FRED_INTERVAL_MS` (86 400 000) | — |

The worker never lets a browser visit trigger a provider request: all third-party
calls happen server-side in the worker, behind the quota counters and circuit breaker.
