# API Reference

Internal HTTP API served by `apps/web`. All routes are server-only, rate-limited
per IP (60–180 req/min depending on route), and validate inputs with Zod.
Errors use a consistent envelope:

```json
{ "error": { "code": "not_found", "message": "Asset X not found", "requestId": "ab12cd34" } }
```

| Code | Meaning |
|---|---|
| `invalid_input` (400) | Zod validation failed |
| `not_found` (404) | Unknown asset/symbol |
| `rate_limited` (429) | Per-IP limit exceeded |
| `conversion_failed` (422) | No conversion path for the pair |
| `unauthorized` (401) | Bad admin secret |
| `internal` (500) | Sanitized server error (details never leaked) |

## GET /api/health

Public liveness. No sensitive data.

```json
{ "status": "ok", "database": "ok", "timestamp": "…", "staleAssets": 0, "providers": 8, "providersDown": 0 }
```

## GET /api/market/overview?lang=fa|en

Home page payload: market cards with sparklines, gainers, losers, categories,
provider statuses, market sessions, stale count.

## GET /api/market/sparklines?symbols=BTC,ETH&days=7

`{ "BTC": [{ "t": 1785…, "v": 63431 }, …] }` — daily closes for mini sparklines.

## GET /api/assets?category=&assetClass=&search=&limit=&offset=

Paged asset list: `{ items: Asset[], total, limit, offset }`.

## GET /api/assets/:symbol

Latest quote for an asset:

```json
{
  "assetId": "…", "assetSymbol": "BTC", "assetNameFa": "بیت‌کوین", "assetNameEn": "Bitcoin",
  "price": "63431", "changeAbsolute": "384.66", "changePercent": "0.7",
  "marketTimestamp": "…", "receivedAt": "…", "freshness": "live",
  "providerCode": "coingecko", "providerDisplayName": "CoinGecko", "delayLabel": "Live",
  "unit": "1 BTC", "quoteCurrency": "USD", "precision": 0, "icon": "bitcoin"
}
```

## GET /api/assets/:symbol/history?range=7D

`range` ∈ `1D|7D|1M|3M|6M|1Y|5Y|MAX` (default `7D`). Returns OHLC candles at the
interval implied by the range, plus:

- `historySource`: `provider` | `local_snapshots` | `mixed`
- `availableRanges`: ranges that actually have data (UI hides the rest)
- `historyNoteFa` / `historyNoteEn`: "collected since …" notice

## GET /api/categories

Category list with per-category asset counts.

## GET /api/converter?from=USD&to=TOMAN&amount=100&lang=fa

```json
{
  "from": "USD", "to": "TOMAN", "amount": "100", "result": "8165000", "rate": "81650",
  "formula": "(USD → تومان) ÷ (TOMAN → تومان)", "direct": true,
  "sourceAssets": [{ "symbol": "USD", "providerCode": "brsapi", "freshness": "live", … }],
  "timestamp": "…"
}
```

`direct: false` means the result is derived via intermediate assets (formula
lists the exact inputs). Special units: `TOMAN`, `RIAL`, `GRAM_24K`, `GRAM_18K`
(derived from XAU).

## GET /api/providers/status

Per-provider: enabled/configured state, status (`ok|degraded|down|circuit_open|
quota_exhausted|disabled|not_configured`), latency, last error, usage today,
daily quota, delay label, attribution, fallback provider.

## GET /api/search?q=دلار&limit=10

Fuzzy search over Persian name, English name, symbol and aliases. Returns
ranked results with optional matched alias and the latest price/change.

## GET /api/admin?secret=…

Internal diagnostics — requires `ADMIN_SECRET`. Returns DB health, row counts,
per-provider health/usage, stale assets and recent ingestion runs. Never
exposes keys or connection strings.
