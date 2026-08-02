import { z } from 'zod';
import type { ProviderContext, MarketDataProvider, LatestQuoteRequest, HistoricalRequest, ProviderHealth, AssetClass } from './types.js';
import { fetchJson } from './http.js';
import { quoteChecksum, toDecimalString, toIsoTimestamp } from './normalize.js';
import type { NormalizedQuote, NormalizedHistoricalPoint } from '@sarmaye/shared';

/**
 * CoinGecko — cryptocurrency market data.
 * Keyless public endpoints (rate-limited) or free demo key (higher limits).
 *
 * Latest (batch): GET /api/v3/coins/markets?vs_currency=usd&ids=a,b,c
 *   &price_change_percentage=1h,24h,7d
 * History:       GET /api/v3/coins/{id}/market_chart?vs_currency=usd&days=N&interval=daily
 */

const marketItemSchema = z.object({
  id: z.string(),
  symbol: z.string(),
  name: z.string(),
  current_price: z.number().nullable(),
  market_cap: z.number().nullable(),
  total_volume: z.number().nullable(),
  high_24h: z.number().nullable(),
  low_24h: z.number().nullable(),
  price_change_24h: z.number().nullable(),
  price_change_percentage_24h: z.number().nullable(),
  price_change_percentage_1h_in_currency: z.number().nullable().optional(),
  price_change_percentage_7d_in_currency: z.number().nullable().optional(),
  circulating_supply: z.number().nullable(),
  last_updated: z.string().nullable(),
});

const chartSchema = z.object({
  prices: z.array(z.tuple([z.number(), z.number()])),
});

export class CoinGeckoProvider implements MarketDataProvider {
  id = 'coingecko';
  displayName = 'CoinGecko';
  assetClasses: AssetClass[] = ['cryptocurrency'] ;
  delayLabel = 'Live';

  constructor(private ctx: ProviderContext) {}

  private get baseUrl(): string {
    return this.ctx.env.COINGECKO_BASE_URL ?? 'https://api.coingecko.com/api/v3';
  }

  private get headers(): Record<string, string> {
    const key = this.ctx.env.COINGECKO_API_KEY;
    return key ? { 'x-cg-demo-api-key': key } : {};
  }

  async getLatestQuotes(request: LatestQuoteRequest): Promise<NormalizedQuote[]> {
    const externalIds = Object.values(request.mapping).filter(Boolean);
    if (externalIds.length === 0) return [];
    const ids = externalIds.join(',');
    const url = `${this.baseUrl}/coins/markets?vs_currency=usd&ids=${encodeURIComponent(ids)}&price_change_percentage=1h,24h,7d&per_page=250`;
    const raw = await fetchJson<unknown>(url, this.id, { headers: this.headers });
    const items = z.array(marketItemSchema).parse(raw);

    const byId = new Map(items.map((i) => [i.id, i]));
    const receivedAt = new Date().toISOString();
    const quotes: NormalizedQuote[] = [];

    for (const [canonical, external] of Object.entries(request.mapping)) {
      if (request.symbols && !request.symbols.includes(canonical)) continue;
      const item = byId.get(external);
      if (!item) continue;
      const price = toDecimalString(item.current_price);
      if (!price) continue;
      const marketTimestamp = toIsoTimestamp(item.last_updated);
      quotes.push({
        symbol: canonical,
        price,
        marketCap: toDecimalString(item.market_cap),
        volume: toDecimalString(item.total_volume),
        high: toDecimalString(item.high_24h),
        low: toDecimalString(item.low_24h),
        changeAbsolute: toDecimalString(item.price_change_24h),
        changePercent: toDecimalString(item.price_change_percentage_24h),
        circulatingSupply: toDecimalString(item.circulating_supply),
        marketTimestamp,
        receivedAt,
        freshness: 'live',
        rawChecksum: quoteChecksum(canonical, price, marketTimestamp, this.id),
        rawMetadata: {
          coinGeckoId: item.id,
          change1h: toDecimalString(item.price_change_percentage_1h_in_currency),
          change7d: toDecimalString(item.price_change_percentage_7d_in_currency),
          name: item.name,
        },
      });
    }
    return quotes;
  }

  async getHistoricalData(request: HistoricalRequest): Promise<NormalizedHistoricalPoint[]> {
    const days = Math.max(1, Math.ceil((request.end.getTime() - request.start.getTime()) / 86_400_000));
    const interval = days > 90 ? 'daily' : 'hourly';
    const url = `${this.baseUrl}/coins/${encodeURIComponent(request.externalSymbol)}/market_chart?vs_currency=usd&days=${days}&interval=${interval}`;
    const raw = await fetchJson<unknown>(url, this.id, { headers: this.headers });
    const data = chartSchema.parse(raw);

    // Convert price points to OHLC candles (bucket by UTC day/hour).
    const points: NormalizedHistoricalPoint[] = [];
    const bucketMs = interval === 'daily' ? 86_400_000 : 3_600_000;
    const buckets = new Map<number, { open: number; high: number; low: number; close: number; count: number }>();
    for (const [ms, price] of data.prices) {
      if (ms < request.start.getTime() || ms > request.end.getTime()) continue;
      const bucket = Math.floor(ms / bucketMs) * bucketMs;
      const b = buckets.get(bucket) ?? { open: price, high: price, low: price, close: price, count: 0 };
      b.high = Math.max(b.high, price);
      b.low = Math.min(b.low, price);
      b.close = price;
      b.count += 1;
      buckets.set(bucket, b);
    }
    for (const [bucket, b] of buckets) {
      const open = b.open.toFixed(8);
      points.push({
        symbol: request.symbol,
        time: new Date(bucket).toISOString(),
        interval: interval === 'daily' ? '1d' : '1h',
        open,
        high: b.high.toFixed(8),
        low: b.low.toFixed(8),
        close: b.close.toFixed(8),
      });
    }
    return points.sort((a, b) => a.time.localeCompare(b.time));
  }

  async getHealth(): Promise<ProviderHealth> {
    const started = Date.now();
    try {
      await fetchJson<unknown>(`${this.baseUrl}/ping`, this.id, { headers: this.headers, timeoutMs: 15_000 });
      return { ok: true, latencyMs: Date.now() - started };
    } catch (err) {
      return { ok: false, latencyMs: Date.now() - started, message: err instanceof Error ? err.message : 'error' };
    }
  }
}
