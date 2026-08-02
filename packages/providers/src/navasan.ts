import { z } from 'zod';
import type { ProviderContext, MarketDataProvider, LatestQuoteRequest, HistoricalRequest, ProviderHealth, AssetClass } from './types.js';
import { fetchJson, ProviderError } from './http.js';
import { quoteChecksum, toDecimalString, toIsoTimestamp } from './normalize.js';
import type { NormalizedQuote, NormalizedHistoricalPoint } from '@sarmaye/shared';

/**
 * Navasan — Iranian currency API (navasan.tech).
 * Used ONLY as a low-frequency fallback for BrsApi. The free plan is
 * rate-limited; verify the current quota at signup before enabling.
 *
 * Endpoint: GET https://api.navasan.tech/latest/?api_key=KEY
 * Response: { "usd_sell": { value, time, change, ... }, "eur_sell": {...}, ... }
 * Each field object carries: value (string), time (unix seconds),
 * change (string), min, max, etc. Field names are keyed by the asset.
 */

const navasanFieldSchema = z.object({
  value: z.union([z.string(), z.number()]).optional(),
  time: z.union([z.string(), z.number()]).optional(),
  change: z.union([z.string(), z.number()]).optional(),
});

const navasanResponseSchema = z.record(z.string(), navasanFieldSchema);

export class NavasanProvider implements MarketDataProvider {
  id = 'navasan';
  displayName = 'Navasan';
  assetClasses: AssetClass[] = ['iranian_currency', 'iranian_gold_coin'] ;
  delayLabel = 'Live';

  constructor(private ctx: ProviderContext) {}

  private get key(): string {
    return this.ctx.env.NAVASAN_API_KEY ?? '';
  }

  private get baseUrl(): string {
    return this.ctx.env.NAVASAN_BASE_URL ?? 'https://api.navasan.tech/latest';
  }

  async getLatestQuotes(request: LatestQuoteRequest): Promise<NormalizedQuote[]> {
    if (!this.key) throw new ProviderError('NAVASAN_API_KEY is not configured', this.id, false);
    const url = `${this.baseUrl}/?api_key=${encodeURIComponent(this.key)}`;
    const raw = await fetchJson<unknown>(url, this.id);
    const data = navasanResponseSchema.parse(raw);

    const receivedAt = new Date().toISOString();
    const quotes: NormalizedQuote[] = [];
    for (const [canonical, external] of Object.entries(request.mapping)) {
      if (request.symbols && !request.symbols.includes(canonical)) continue;
      const field = data[external];
      if (!field) continue;
      const price = toDecimalString(field.value);
      if (!price) continue;
      const marketTimestamp = toIsoTimestamp(field.time);
      quotes.push({
        symbol: canonical,
        price,
        changeAbsolute: toDecimalString(field.change),
        marketTimestamp,
        receivedAt,
        freshness: 'live',
        rawChecksum: quoteChecksum(canonical, price, marketTimestamp, this.id),
        rawMetadata: { navasanField: external },
      });
    }
    return quotes;
  }

  async getHistoricalData(): Promise<NormalizedHistoricalPoint[]> {
    return [];
  }

  async getHealth(): Promise<ProviderHealth> {
    if (!this.key) return { ok: false, message: 'NAVASAN_API_KEY not configured' };
    const started = Date.now();
    try {
      await fetchJson<unknown>(`${this.baseUrl}/?api_key=${encodeURIComponent(this.key)}`, this.id, { timeoutMs: 15_000 });
      return { ok: true, latencyMs: Date.now() - started };
    } catch (err) {
      return { ok: false, latencyMs: Date.now() - started, message: err instanceof Error ? err.message : 'error' };
    }
  }
}
