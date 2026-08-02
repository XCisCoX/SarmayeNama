import { z } from 'zod';
import type { ProviderContext, MarketDataProvider, LatestQuoteRequest, HistoricalRequest, ProviderHealth, AssetClass } from './types.js';
import { fetchJson, ProviderError } from './http.js';
import { quoteChecksum, toDecimalString } from './normalize.js';
import type { NormalizedQuote, NormalizedHistoricalPoint } from '@sarmaye/shared';

/**
 * Metals.dev — precious metals spot prices.
 * Free plan requires an API key and is request-limited; the worker enforces
 * a daily quota and low-frequency schedule. Response (v1/latest):
 * {
 *   status: "success", currency: "USD", unit: "per troy ounce",
 *   timestamp: <unix>, metals: { gold: 3200.5, silver: ..., platinum: ..., palladium: ... }
 * }
 */

const metalsLatestSchema = z.object({
  status: z.string(),
  currency: z.string().optional(),
  unit: z.string().optional(),
  timestamp: z.number().optional(),
  metals: z.record(z.string(), z.number()),
});

/** Metals.dev payload keys are metal names; translate canonical symbols. */
const METAL_KEYS: Record<string, string> = {
  XAU: 'gold',
  XAG: 'silver',
  XPT: 'platinum',
  XPD: 'palladium',
};

export class MetalsDevProvider implements MarketDataProvider {
  id = 'metalsdev';
  displayName = 'Metals.dev';
  assetClasses: AssetClass[] = ['precious_metal'];
  delayLabel = 'Live';

  constructor(private ctx: ProviderContext) {}

  private get key(): string {
    return this.ctx.env.METALSDEV_API_KEY ?? '';
  }

  private get baseUrl(): string {
    return this.ctx.env.METALSDEV_BASE_URL ?? 'https://api.metals.dev/v1';
  }

  async getLatestQuotes(request: LatestQuoteRequest): Promise<NormalizedQuote[]> {
    if (!this.key) throw new ProviderError('METALSDEV_API_KEY is not configured', this.id, false);
    const url = `${this.baseUrl}/latest?api_key=${encodeURIComponent(this.key)}&currency=USD`;
    const raw = await fetchJson<unknown>(url, this.id);
    const data = metalsLatestSchema.parse(raw);

    const receivedAt = new Date().toISOString();
    const marketTimestamp = data.timestamp ? new Date(data.timestamp * 1000).toISOString() : receivedAt;
    const quotes: NormalizedQuote[] = [];

    for (const [canonical, external] of Object.entries(request.mapping)) {
      if (request.symbols && !request.symbols.includes(canonical)) continue;
      const metalKey = METAL_KEYS[external] ?? external;
      const price = data.metals[metalKey];
      if (price === undefined) continue;
      const priceStr = toDecimalString(price);
      if (!priceStr) continue;
      quotes.push({
        symbol: canonical,
        price: priceStr,
        marketTimestamp,
        receivedAt,
        freshness: 'live',
        rawChecksum: quoteChecksum(canonical, priceStr, marketTimestamp, this.id),
        rawMetadata: { currency: data.currency, unit: data.unit, providerTimestamp: data.timestamp, metalKey },
      });
    }
    return quotes;
  }

  /** Free plan historical support varies; rely on local snapshots as the primary history source. */
  async getHistoricalData(): Promise<NormalizedHistoricalPoint[]> {
    return [];
  }

  async getHealth(): Promise<ProviderHealth> {
    if (!this.key) return { ok: false, message: 'METALSDEV_API_KEY not configured' };
    const started = Date.now();
    try {
      await fetchJson<unknown>(`${this.baseUrl}/latest?api_key=${encodeURIComponent(this.key)}&currency=USD`, this.id, { timeoutMs: 15_000 });
      return { ok: true, latencyMs: Date.now() - started };
    } catch (err) {
      return { ok: false, latencyMs: Date.now() - started, message: err instanceof Error ? err.message : 'error' };
    }
  }
}
