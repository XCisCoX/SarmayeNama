import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { parseEnv, type AppEnv } from '@sarmaye/shared';
import { BrsApiProvider } from '../src/brsapi.js';
import { FrankfurterProvider } from '../src/frankfurter.js';
import { CoinGeckoProvider } from '../src/coingecko.js';
import { MetalsDevProvider } from '../src/metalsdev.js';
import { quoteChecksum, toDecimalString, toIsoTimestamp, jalaliToIso } from '../src/normalize.js';
import { fetchJson, ProviderRateLimitedError, ProviderError } from '../src/http.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadFixture(name: string): unknown {
  return JSON.parse(readFileSync(join(__dirname, '..', 'src', 'fixtures', name), 'utf8'));
}

function envWith(overrides: Record<string, string>): AppEnv {
  return parseEnv({ ...process.env, DATABASE_URL: 'postgresql://x:x@localhost/x', ...overrides });
}

describe('BrsApi normalization (real fixture)', () => {
  it('normalizes the sample payload into canonical quotes', async () => {
    const provider = new BrsApiProvider({ env: envWith({ BRSAPI_API_KEY: 'test-key' }) });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(loadFixture('brsapi-gold-currency.json')), { status: 200 })
    );
    const quotes = await provider.getLatestQuotes({
      mapping: { USD: 'USD', EUR: 'EUR', IR_GOLD_18K: 'IR_GOLD_18K', XAU: 'XAUUSD', BTC: 'BTC' },
    });
    expect(quotes.length).toBe(5);
    const usd = quotes.find((q) => q.symbol === 'USD')!;
    expect(usd.price).toBe('81650');
    expect(usd.changePercent).toBeTruthy();
    expect(usd.freshness).toBe('live');
    expect(usd.marketTimestamp).toBeTruthy();
    const xau = quotes.find((q) => q.symbol === 'XAU')!;
    expect(xau.price).toBe('3201');
    const btc = quotes.find((q) => q.symbol === 'BTC')!;
    expect(btc.price).toBe('103959');
  });
});

describe('Frankfurter normalization (real fixture)', () => {
  it('prices currencies in USD and labels daily reference', async () => {
    const provider = new FrankfurterProvider({ env: envWith({}) });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(loadFixture('frankfurter-latest.json')), { status: 200 })
    );
    const quotes = await provider.getLatestQuotes({
      mapping: { FX_USD: 'USD', FX_EUR: 'EUR', FX_GBP: 'GBP', FX_JPY: 'JPY' },
    });
    expect(quotes.length).toBe(4);
    const eur = quotes.find((q) => q.symbol === 'FX_EUR')!;
    // 1 EUR = 1 / 0.8707 USD
    expect(Number(eur.price)).toBeCloseTo(1.1485, 3);
    expect(eur.freshness).toBe('daily_reference');
    const usd = quotes.find((q) => q.symbol === 'FX_USD')!;
    expect(usd.price).toBe('1');
  });
});

describe('CoinGecko normalization (real fixture)', () => {
  it('maps batch market data and keeps metadata', async () => {
    const provider = new CoinGeckoProvider({ env: envWith({}) });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(loadFixture('coingecko-markets.json')), { status: 200 })
    );
    const quotes = await provider.getLatestQuotes({
      mapping: { BTC: 'bitcoin', ETH: 'ethereum', USDT: 'tether', BNB: 'binancecoin' },
    });
    expect(quotes.length).toBe(4);
    const btc = quotes.find((q) => q.symbol === 'BTC')!;
    expect(btc.price).toBe('63431');
    expect(btc.marketCap).toBe('1272738205796');
    expect(btc.circulatingSupply).toBeTruthy();
    expect(btc.rawMetadata).toMatchObject({ change1h: '0.12', change7d: '-2.1' });
  });
});

describe('Metals.dev normalization', () => {
  it('maps metals and marks live', async () => {
    const provider = new MetalsDevProvider({ env: envWith({ METALSDEV_API_KEY: 'k' }) });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          status: 'success',
          currency: 'USD',
          unit: 'per troy ounce',
          timestamp: 1782900000,
          metals: { gold: 3200.5, silver: 30.12 },
        }),
        { status: 200 }
      )
    );
    const quotes = await provider.getLatestQuotes({ mapping: { XAU: 'XAU', XAG: 'XAG' } });
    expect(quotes.length).toBe(2);
    expect(quotes.find((q) => q.symbol === 'XAU')!.price).toBe('3200.5');
    expect(quotes.find((q) => q.symbol === 'XAU')!.freshness).toBe('live');
  });
});

describe('Normalization helpers', () => {
  it('computes deterministic checksums', () => {
    const a = quoteChecksum('USD', '81650', '2026-07-31T12:00:00Z', 'brsapi');
    const b = quoteChecksum('USD', '81650', '2026-07-31T12:00:00Z', 'brsapi');
    const c = quoteChecksum('USD', '81651', '2026-07-31T12:00:00Z', 'brsapi');
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });
  it('normalizes numeric strings and rejects garbage', () => {
    expect(toDecimalString('1,234.5')).toBe('1234.5');
    expect(toDecimalString('81650')).toBe('81650');
    expect(toDecimalString(null)).toBeNull();
    expect(toDecimalString('abc')).toBeNull();
    expect(toDecimalString('.')).toBeNull();
  });
  it('converts unix seconds and ISO strings', () => {
    // 1747573140 = 2025-05-18T12:59:00Z (UTC); the BrsApi sample shows 16:29 Tehran time
    expect(toIsoTimestamp(1747573140)).toBe('2025-05-18T12:59:00.000Z');
    expect(toIsoTimestamp('2026-07-31T12:00:00Z')).toBe('2026-07-31T12:00:00.000Z');
  });
  it('converts Jalali dates to Gregorian ISO', () => {
    // 1404/02/28 = 2025-05-18 (from the BrsApi sample: time_unix 1747573140)
    expect(jalaliToIso(1404, 2, 28)).toBe('2025-05-18T00:00:00.000Z');
    // Nowruz 1405 = 2026-03-21
    expect(jalaliToIso(1405, 1, 1)).toBe('2026-03-21T00:00:00.000Z');
    expect(jalaliToIso(1404, 12, 29)).toBe('2026-03-20T00:00:00.000Z');
  });
});

describe('HTTP retry logic', () => {
  it('retries transient errors with backoff and succeeds', async () => {
    const fetches = vi
      .fn()
      .mockResolvedValueOnce(new Response('boom', { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal('fetch', fetches);
    const out = await fetchJson<{ ok: boolean }>('https://example.test', 'test', { retries: 3, backoffBaseMs: 1, jitterMs: 0 });
    expect(out.ok).toBe(true);
    expect(fetches).toHaveBeenCalledTimes(2);
    vi.unstubAllGlobals();
  });
  it('never retries rate limits (429)', async () => {
    const fetches = vi.fn().mockResolvedValue(new Response('nope', { status: 429 }));
    vi.stubGlobal('fetch', fetches);
    await expect(fetchJson('https://example.test', 'test', { retries: 5, backoffBaseMs: 1 })).rejects.toBeInstanceOf(
      ProviderRateLimitedError
    );
    expect(fetches).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  });
  it('does not retry auth failures (401)', async () => {
    const fetches = vi.fn().mockResolvedValue(new Response('nope', { status: 401 }));
    vi.stubGlobal('fetch', fetches);
    await expect(fetchJson('https://example.test', 'test', { retries: 5 })).rejects.toBeInstanceOf(ProviderError);
    expect(fetches).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  });
  it('gives up after max retries', async () => {
    const fetches = vi.fn().mockResolvedValue(new Response('boom', { status: 500 }));
    vi.stubGlobal('fetch', fetches);
    await expect(fetchJson('https://example.test', 'test', { retries: 2, backoffBaseMs: 1, jitterMs: 0 })).rejects.toThrow();
    expect(fetches).toHaveBeenCalledTimes(3);
    vi.unstubAllGlobals();
  });
});

describe('Finnhub normalization (fixture)', () => {
  it('normalizes a quote into a canonical quote', async () => {
    const { FinnhubProvider } = await import('../src/finnhub.js');
    const provider = new FinnhubProvider({ env: envWith({ FINNHUB_API_KEY: 'test-key' }) });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(loadFixture('finnhub-quote.json')), { status: 200 })
    );
    const quotes = await provider.getLatestQuotes({ mapping: { AV_AAPL: 'AAPL' } });
    expect(quotes).toHaveLength(1);
    const q = quotes[0]!;
    expect(q.symbol).toBe('AV_AAPL');
    expect(q.price).toBe('232.86');
    expect(q.changePercent).toBe('0.62');
    expect(q.freshness).toBe('live');
    expect(q.marketTimestamp).toBe('2026-08-02T09:46:40.000Z');
  });
});

describe('EIA normalization (fixture)', () => {
  it('normalizes daily series rows and computes daily change', async () => {
    const { EiaProvider } = await import('../src/eia.js');
    const provider = new EiaProvider({ env: envWith({ EIA_API_KEY: 'test-key' }) });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(loadFixture('eia-series.json')), { status: 200 })
    );
    const quotes = await provider.getLatestQuotes({ mapping: { OIL_WTI: 'PET.RWTC.D' } });
    expect(quotes).toHaveLength(1);
    const q = quotes[0]!;
    expect(q.symbol).toBe('OIL_WTI');
    expect(q.price).toBe('78.41');
    expect(q.previousClose).toBe('78.02');
    expect(q.freshness).toBe('daily_reference');
    expect(q.marketTimestamp).toBe('2026-07-31T00:00:00.000Z');
  });

  it('returns candle-shaped history points', async () => {
    const { EiaProvider } = await import('../src/eia.js');
    const provider = new EiaProvider({ env: envWith({ EIA_API_KEY: 'test-key' }) });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(loadFixture('eia-series.json')), { status: 200 })
    );
    const points = await provider.getHistoricalData({
      symbol: 'OIL_WTI',
      externalSymbol: 'PET.RWTC.D',
      start: new Date('2026-07-29T00:00:00Z'),
      end: new Date('2026-08-01T00:00:00Z'),
    });
    expect(points).toHaveLength(3);
    expect(points[0]!.interval).toBe('1d');
    expect(points[0]!.open).toBe('77.85');
    expect(points[0]!.close).toBe('77.85');
  });
});

describe('NewsAPI normalization (fixture)', () => {
  it('normalizes articles into news items', async () => {
    const { NewsApiNewsProvider } = await import('../src/newsapi.js');
    const provider = new NewsApiNewsProvider({ env: envWith({ NEWS_API_KEY: 'test-key' }) });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(loadFixture('newsapi-everything.json')), { status: 200 })
    );
    const items = await provider.getNews({ query: 'bitcoin OR gold', count: 10 });
    expect(items).toHaveLength(2);
    expect(items[0]!.title).toContain('بیت کوین');
    expect(items[0]!.source).toBe('Zoomit.ir');
    expect(items[1]!.publishedAt).toBe('2026-08-02T07:30:00Z');
  });

  it('is not configured without a key', async () => {
    const { NewsApiNewsProvider } = await import('../src/newsapi.js');
    const provider = new NewsApiNewsProvider({ env: envWith({}) });
    expect(provider.isConfigured()).toBe(false);
  });
});
