# Data Freshness

## The freshness model

Every stored quote carries a `freshness` status. It is set by the adapter at
normalization time and re-evaluated by the worker and the web layer:

| Status | Meaning | Set by |
|---|---|---|
| `live` | Provider delivers real-time/near-real-time data on its free plan | adapter (BrsApi, CoinGecko, Metals.dev) |
| `delayed` | Provider data is delayed (exchange-licensed delay) | adapter (Alpha Vantage, BrsApi TSETMC) |
| `daily_reference` | Daily reference fix, not trading data | adapter (Frankfurter, FRED) |
| `derived` | Computed from input sources, not a market price | converter / worker |
| `cached` | Served from an internal cache | (reserved) |
| `stale` | Provider unreachable; last successful value shown with a warning | worker stale job + dynamic check |

**Staleness rule:** a quote becomes stale when
`now - receivedAt > max(3 × provider refresh interval, 15 minutes)`.
The worker marks `latest_quotes.freshness = 'stale'` on every ingestion tick;
the web layer also re-computes staleness dynamically at read time so the
display is always correct even between worker ticks.

## What every displayed quote shows

- Provider name (e.g. "BrsApi", "CoinGecko", "Frankfurter")
- Provider timestamp (`marketTimestamp`)
- Server receive time (`receivedAt`)
- Data freshness badge (زنده / تأخیری / نرخ مرجع روزانه / قدیمی …)
- Currency and unit (تومان / ریال / USD / per troy ounce / per coin …)
- Live vs delayed vs daily-reference vs derived vs cached vs stale label

## Data delay by provider (as labeled in the UI)

| Provider | Label | Why |
|---|---|---|
| BrsApi | Live | Claims لحظهای on free plan (1500 req/day) |
| Navasan | Live | Free plan is rate-limited; used as low-frequency fallback |
| CoinGecko | Live | Exchange aggregate, refreshed each 5-min batch |
| Metals.dev | Live | Spot prices (free tier, quota-guarded) |
| Frankfurter | **Daily reference rate** | ECB daily fix — explicitly not live trading data |
| FRED | Daily reference rate | Daily/monthly macro observations |
| Alpha Vantage | Delayed | Free tier quotes are not exchange-licensed real-time |
| BrsApi TSETMC | Delayed | TSE data is post-close/delayed |

## Provider failure behavior

1. The worker records the failure, increments the circuit-breaker counter and
   retries on the next scheduled tick with jitter — never in a tight loop.
2. The last successful value remains in `latest_quotes` untouched.
3. The web layer marks it stale and renders the amber "stale" banner plus a
   `قدیمی — آخرین مقدار موفق` freshness badge.
4. The provider card on the status page shows the last error and the failure
   count; after N failures the circuit opens and requests are skipped until
   the cooldown expires.

## Derived (calculated) values

Prices computed from other prices (e.g. ounce→gram gold, 24k→18k theoretical
conversion, BTC→Toman via USD) are labeled **محاسبهشده (Calculated)** in the
converter and never presented as actual Iranian market prices. The converter
response includes the formula and the exact input quotes used.
