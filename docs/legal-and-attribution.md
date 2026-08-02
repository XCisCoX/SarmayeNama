# Legal & Attribution

## Data sources

| Provider | Attribution (shown in the UI) | Notes |
|---|---|---|
| BrsApi | https://brsapi.ir | Free key; 1500 req/day; verify current terms at signup |
| Navasan | https://navasan.tech | Free plan is rate-limited; low-frequency fallback only |
| BrsApi TSETMC | https://brsapi.ir | Feature-flagged; verify TSETMC free terms |
| Frankfurter | "ECB reference rates via Frankfurter (frankfurter.dev)" | Daily reference rates — the UI always labels them as such |
| Metals.dev | https://metals.dev | Free tier; verify quota + terms |
| Alpha Vantage | https://alphavantage.co | Free tier ≈25 req/day; quotes are delayed, not real-time |
| CoinGecko | https://www.coingecko.com | Keyless public API; attribution appreciated |
| FRED | "Federal Reserve Bank of St. Louis, FRED" | Required attribution for FRED series |
| Finnhub | https://finnhub.io | US stock quotes are real-time on the free plan; attribution requested |
| EIA | "US Energy Information Administration (EIA)" | Required attribution for EIA series |
| NewsAPI | https://newsapi.org | Free tier is **non-commercial**; attribution required |
| Brave Search | https://brave.com/search/api/ | Free tier non-commercial; attribution required |
| Google Gemini | https://ai.google.dev | AI summaries are labeled as AI-generated, never financial advice |

## Principles

1. **No unauthorized scraping.** All data comes from official, documented HTTP
   APIs. No website is scraped, no access controls are circumvented, no
   unofficial endpoints (e.g. Yahoo Finance) are used.
2. **No fake data.** Prices are only ever stored values from providers or
   clearly-labeled derived calculations. The only fixtures are documentation
   samples used in tests.
3. **Truthful freshness.** Daily-reference data is never labeled "live"; delayed
   data is labeled "Delayed"; stale data shows the last successful value with a
   warning banner.
4. **Derived ≠ market price.** Theoretical gold conversions (ounce→gram,
   24k→18k) and cross-rate calculations are marked "Calculated" with their
   formula and inputs, and are never presented as actual Iranian market prices.
5. **Free tier discipline.** Daily quota budgets and low-frequency schedules
   keep every provider within its free plan. Rate-limited providers are never
   hammered; requests pause until the budget resets.

## Commercial use

This project itself is free/open for deployment on your own infrastructure.
**Your obligations** depend on the providers you enable and your use case:
- Frankfurter data (ECB reference rates) is free for commercial use; keep the
  attribution visible.
- CoinGecko's free API has usage limits; review their terms for commercial
  redistribution.
- BrsApi, Navasan, Metals.dev, Alpha Vantage and FRED free tiers each have
  their own commercial-use restrictions — check the current terms before
  selling access to their data.
- The site's footer carries a disclaimer that this is not financial advice and
  that data may be delayed or reference-only.

## Compliance checklist

- [ ] Provider attribution visible on `/status` for every enabled provider
- [ ] `robots.txt` excludes `/api/`, `/admin`
- [ ] No API keys in the repository, logs, or client bundles
- [ ] Stale/delayed/daily-reference labels shown for every quote
- [ ] Daily quotas configured in `.env` for key-based providers
