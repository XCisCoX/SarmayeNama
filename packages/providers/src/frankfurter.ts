import { z } from 'zod';
import type { ProviderContext, MarketDataProvider, LatestQuoteRequest, HistoricalRequest, ProviderHealth, AssetClass } from './types.js';
import { fetchJson } from './http.js';
import { quoteChecksum } from './normalize.js';
import type { NormalizedQuote, NormalizedHistoricalPoint } from '@sarmaye/shared';

/**
 * Frankfurter — daily ECB reference FX rates (frankfurter.dev).
 * Keyless. Must be labeled "Daily reference rate", never "Live".
 *
 * latest:  GET /v1/latest?base=USD  -> { amount, base, date, rates: {EUR: 0.87, ...} }
 * history: GET /v1/{start}..{end}?from=USD -> { rates: { "2026-07-30": {EUR: x, ...}, ... } }
 *
 * Rates are "units of target currency per 1 base unit". We normalize every
 * asset to "price in USD" (price of 1 unit of the asset in USD):
 *   USD asset -> 1.0
 *   other     -> 1 / rate(from USD)
 */

const latestSchema = z.object({
  amount: z.number(),
  base: z.string(),
  date: z.string(),
  rates: z.record(z.string(), z.number()),
});

const historySchema = z.object({
  rates: z.record(z.string(), z.record(z.string(), z.number())),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
});

export class FrankfurterProvider implements MarketDataProvider {
  id = 'frankfurter';
  displayName = 'Frankfurter';
  assetClasses: AssetClass[] = ['global_currency'] ;
  delayLabel = 'Daily reference rate';

  constructor(private ctx: ProviderContext) {}

  private get baseUrl(): string {
    return this.ctx.env.FRANKFURTER_BASE_URL ?? 'https://api.frankfurter.dev/v1';
  }

  async getLatestQuotes(request: LatestQuoteRequest): Promise<NormalizedQuote[]> {
    const from = request.mapping.FX_USD ?? 'USD';
    const url = `${this.baseUrl}/latest?base=${from}`;
    const raw = await fetchJson<unknown>(url, this.id);
    const data = latestSchema.parse(raw);

    const rates: Record<string, number> = { [data.base]: 1, ...data.rates };
    const receivedAt = new Date().toISOString();
    // Daily ECB reference: use the fixing date at 12:00 UTC as market time.
    const marketTimestamp = new Date(`${data.date}T12:00:00Z`).toISOString();
    const quotes: NormalizedQuote[] = [];

    for (const [canonical, external] of Object.entries(request.mapping)) {
      if (request.symbols && !request.symbols.includes(canonical)) continue;
      const rate = rates[external];
      if (rate === undefined || !Number.isFinite(rate) || rate <= 0) continue;
      // Price = units of USD per 1 unit of the currency.
      const price = external === from ? '1' : (1 / rate).toFixed(8);
      quotes.push({
        symbol: canonical,
        price,
        marketTimestamp,
        receivedAt,
        freshness: 'daily_reference',
        rawChecksum: quoteChecksum(canonical, price, marketTimestamp, this.id),
        rawMetadata: { base: data.base, date: data.date, ratePerUnit: external === from ? 1 : rate },
      });
    }
    return quotes;
  }

  async getHistoricalData(request: HistoricalRequest): Promise<NormalizedHistoricalPoint[]> {
    // All our global-currency assets are normalized to USD-quoted prices, so
    // history always requests from=USD and derives each asset's USD price.
    const from = 'USD';
    const start = request.start.toISOString().slice(0, 10);
    const end = request.end.toISOString().slice(0, 10);
    // Frankfurter allows at most 100 calendar days per call.
    const points: NormalizedHistoricalPoint[] = [];
    const dayMs = 86_400_000;
    let cursor = new Date(request.start);
    while (cursor < request.end) {
      const windowEnd = new Date(Math.min(cursor.getTime() + 99 * dayMs, request.end.getTime()));
      const url = `${this.baseUrl}/${cursor.toISOString().slice(0, 10)}..${windowEnd.toISOString().slice(0, 10)}?from=${from}`;
      const raw = await fetchJson<unknown>(url, this.id);
      const data = historySchema.parse(raw);
      for (const [dateStr, dayRates] of Object.entries(data.rates)) {
        const rate = dayRates[request.externalSymbol];
        if (rate === undefined || !Number.isFinite(rate) || rate <= 0) continue;
        const price = (1 / rate).toFixed(8);
        const time = new Date(`${dateStr}T12:00:00Z`).toISOString();
        points.push({
          symbol: request.symbol,
          time,
          interval: '1d',
          open: price,
          high: price,
          low: price,
          close: price,
        });
      }
      cursor = new Date(windowEnd.getTime() + dayMs);
    }
    // Historical reference rates are immutable — dedupe identical timestamps.
    const seen = new Set<string>();
    const unique = points.filter((p) => {
      const key = p.time;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    return unique.sort((a, b) => a.time.localeCompare(b.time));
  }

  async getHealth(): Promise<ProviderHealth> {
    const started = Date.now();
    try {
      await fetchJson<unknown>(`${this.baseUrl}/latest?base=USD`, this.id, { timeoutMs: 15_000 });
      return { ok: true, latencyMs: Date.now() - started };
    } catch (err) {
      return { ok: false, latencyMs: Date.now() - started, message: err instanceof Error ? err.message : 'error' };
    }
  }
}
