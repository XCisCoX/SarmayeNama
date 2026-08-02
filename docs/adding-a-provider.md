# Adding a Provider

This guide walks through adding a new market-data provider end to end.

## 1. Research first

Before writing code, verify the provider's current docs: authentication, free
quota, refresh interval, historical support, attribution requirements,
commercial-use limitations, data delay. Record your findings in
`docs/provider-matrix.md` (add a row) — including the fallback provider and
whether it should be enabled by default.

## 2. Implement the adapter

Create `packages/providers/src/<name>.ts` implementing `MarketDataProvider`
from `packages/providers/src/types.ts`:

```ts
interface MarketDataProvider {
  id: string;                 // stable code, e.g. 'myprovider'
  displayName: string;
  assetClasses: AssetClass[];
  delayLabel: string;         // 'Live' | 'Delayed' | 'Daily reference rate'
  getLatestQuotes(request: LatestQuoteRequest): Promise<NormalizedQuote[]>;
  getHistoricalData(request: HistoricalRequest): Promise<NormalizedHistoricalPoint[]>;
  getHealth(): Promise<ProviderHealth>;
  getUsageStatus?(): Promise<ProviderUsageStatus>;
}
```

Rules:

- The adapter is **stateless** — it receives `request.mapping`
  (canonicalSymbol → externalSymbol) and returns normalized data. Never touch
  the database.
- Reuse `fetchJson` from `./http.js` — it handles timeouts, retries with
  jitter, and maps 429 → `ProviderRateLimitedError` (never retried).
- Reuse `quoteChecksum`, `toDecimalString`, `toIsoTimestamp` from
  `./normalize.js`.
- Use `fetchJson(url, this.id)` so errors carry the provider id.
- Missing keys throw `new ProviderError('X_API_KEY is not configured', id, false)`
  — the worker records `not_configured` and never trips the circuit.
- Use Zod to validate the raw payload (`z.object({...}).parse(raw)`) so garbage
  never reaches the database.
- Set `freshness` truthfully (`live` / `delayed` / `daily_reference`).

## 3. Register the adapter

In `packages/providers/src/registry.ts`:

- Import the class, instantiate it in `buildRegistry(env, log)` with your
  enablement rule (key presence, feature flag, or always for keyless).
- Add the id to `ALL_PROVIDER_IDS`.
- Implement `isProviderConfigured` / `missingConfigFor` so the UI can explain
  which env var is missing.

## 4. Add metadata + env

- `packages/shared/src/constants.ts` → `PROVIDER_META` (display names fa/en,
  asset classes, auth type, env key, base URL, delay label, default refresh,
  daily quota, attribution, fallback, notes).
- `packages/shared/src/env.ts` → env vars + optional base-URL override
  (used by tests against mock servers).
- `.env.example` and `docker-compose.yml` → pass the new env vars through.
- Add the provider row to `packages/database/prisma/seed.ts` if you need extra
  seed behavior beyond `PROVIDER_META`.

## 5. Map assets

Add `providers: { myprovider: 'EXTERNAL_SYMBOL' }` to the relevant
`SeedAsset` entries in `packages/shared/src/constants.ts`, then re-seed
(`pnpm db:seed`). The worker builds `request.mapping` from `ProviderAsset`
rows on every tick, so new mappings appear without code changes.

## 6. Tests

- Capture a **real sample payload** (documentation sample or a capture of your
  own key's response) into `packages/providers/src/fixtures/`.
- Write normalization tests mocking `globalThis.fetch` with the fixture
  (see `packages/providers/test/providers.test.ts`).
- If the provider has unusual edge cases (scientific notation, Jalali dates),
  add unit tests for the normalization helpers too.

## 7. Verify

- `pnpm --filter @sarmaye/providers test`
- Start the worker and watch `/tmp/sarmaye-worker.log` for
  `ingestion success` with your provider id.
- Check the provider card on `/status` and the freshness labels on the assets.

## Checklist

- [ ] provider-matrix.md updated
- [ ] Adapter implements the full interface with truthful `delayLabel`
- [ ] Zod validation of the raw payload
- [ ] Registered in registry.ts with enablement rules
- [ ] Env vars in env.ts, .env.example, docker-compose.yml
- [ ] Seed + asset mappings updated
- [ ] Fixture + normalization tests green
- [ ] Live run verified
