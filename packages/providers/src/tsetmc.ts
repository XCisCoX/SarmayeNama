import { z } from 'zod';
import type { ProviderContext, MarketDataProvider, LatestQuoteRequest, HistoricalRequest, ProviderHealth, AssetClass } from './types.js';
import { fetchJson, ProviderError } from './http.js';
import { quoteChecksum, toDecimalString, toIsoTimestamp } from './normalize.js';
import type { NormalizedQuote, NormalizedHistoricalPoint } from '@sarmaye/shared';

/**
 * BrsApi TSETMC — Tehran Stock Exchange data.
 * Behind the IRANIAN_STOCKS_ENABLED feature flag. The free TSETMC API needs
 * a separate key request (brsapi.ir/tsetmc-exchange-free-bourse-api-key-request).
 * The response shape follows the sample at
 * brsapi.ir/Api/Tsetmc/Sample/Api_FreeBourseWebService.json:
 * [ { id, isin, l18 (title), l30 (name), pmin, pmax, tmin, tmax, z (last),
 *     mv (value), bvol (buy volume), ... } ]
 * Prices are in Rial.
 */

const tsetmcItemSchema = z.object({
  isin: z.string().optional(),
  id: z.union([z.string(), z.number()]).optional(),
  l18: z.string().optional(),
  l30: z.string().optional(),
  z: z.union([z.string(), z.number()]).nullable().optional(), // last price
  pmin: z.union([z.string(), z.number()]).nullable().optional(),
  pmax: z.union([z.string(), z.number()]).nullable().optional(),
  tmin: z.union([z.string(), z.number()]).nullable().optional(),
  tmax: z.union([z.string(), z.number()]).nullable().optional(),
  mv: z.union([z.string(), z.number()]).nullable().optional(),
  bvol: z.union([z.string(), z.number()]).nullable().optional(),
  time: z.string().optional(),
});

export class BrsApiTsetmcProvider implements MarketDataProvider {
  id = 'brsapi-tsetmc';
  displayName = 'BrsApi TSETMC';
  assetClasses: AssetClass[] = ['iranian_stock'] ;
  delayLabel = 'Delayed';

  constructor(private ctx: ProviderContext) {}

  private get key(): string {
    return this.ctx.env.BRSAPI_API_KEY ?? '';
  }

  private get baseUrl(): string {
    return this.ctx.env.TSETMC_BASE_URL ?? 'https://Api.BrsApi.ir/Market';
  }

  async getLatestQuotes(request: LatestQuoteRequest): Promise<NormalizedQuote[]> {
    if (!this.key) throw new ProviderError('BRSAPI_API_KEY is not configured', this.id, false);
    // The TSETMC free endpoint returns the full market snapshot.
    const url = `${this.baseUrl}/Tsetmc.php?key=${encodeURIComponent(this.key)}`;
    const raw = await fetchJson<unknown>(url, this.id);
    const items = z.array(tsetmcItemSchema).parse(raw);

    const receivedAt = new Date().toISOString();
    const quotes: NormalizedQuote[] = [];
    for (const [canonical, external] of Object.entries(request.mapping)) {
      if (request.symbols && !request.symbols.includes(canonical)) continue;
      const item = items.find((i) => {
        const isin = (i.isin ?? '').toLowerCase();
        const name = (i.l30 ?? i.l18 ?? '').toLowerCase();
        return isin.includes(external) || name.includes(external);
      });
      if (!item) continue;
      const price = toDecimalString(item.z);
      if (!price) continue;
      const marketTimestamp = toIsoTimestamp(item.time) ?? receivedAt;
      quotes.push({
        symbol: canonical,
        price,
        high: toDecimalString(item.tmax),
        low: toDecimalString(item.tmin),
        open: toDecimalString(item.pmin),
        previousClose: toDecimalString(item.pmax),
        volume: toDecimalString(item.bvol),
        marketTimestamp,
        receivedAt,
        freshness: 'delayed',
        rawChecksum: quoteChecksum(canonical, price, marketTimestamp, this.id),
        rawMetadata: { isin: item.isin, title: item.l30 ?? item.l18 },
      });
    }
    return quotes;
  }

  async getHistoricalData(): Promise<NormalizedHistoricalPoint[]> {
    return [];
  }

  async getHealth(): Promise<ProviderHealth> {
    if (!this.key) return { ok: false, message: 'BRSAPI_API_KEY not configured' };
    const started = Date.now();
    try {
      await fetchJson<unknown>(`${this.baseUrl}/Tsetmc.php?key=${encodeURIComponent(this.key)}`, this.id, { timeoutMs: 15_000 });
      return { ok: true, latencyMs: Date.now() - started };
    } catch (err) {
      return { ok: false, latencyMs: Date.now() - started, message: err instanceof Error ? err.message : 'error' };
    }
  }
}
