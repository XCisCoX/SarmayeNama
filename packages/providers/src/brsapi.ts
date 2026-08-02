import { z } from 'zod';
import type { ProviderContext, MarketDataProvider, LatestQuoteRequest, HistoricalRequest, ProviderHealth, AssetClass } from './types.js';
import { fetchJson, ProviderError } from './http.js';
import { quoteChecksum, toDecimalString, toIsoTimestamp } from './normalize.js';
import type { NormalizedQuote, NormalizedHistoricalPoint } from '@sarmaye/shared';

/**
 * BrsApi — Iranian free-market gold & currency API.
 * https://brsapi.ir  — free key: 1500 requests/day.
 * Endpoint: GET https://Api.BrsApi.ir/Market/Gold_Currency.php?key=KEY
 * Returns { gold: [...], currency: [...], cryptocurrency: [...] } where each
 * item has { date (Jalali), time, time_unix, symbol, name_en, name, price,
 * change_value, change_percent, unit }.
 *
 * Prices are in Toman (unit: "تومان") except global items like XAUUSD and
 * cryptocurrencies which are in USD (unit: "دلار").
 */

const brsItemSchema = z.object({
  date: z.string().optional(),
  time: z.string().optional(),
  time_unix: z.number().optional(),
  symbol: z.string(),
  name_en: z.string().optional(),
  name: z.string().optional(),
  price: z.union([z.number(), z.string()]),
  change_value: z.union([z.number(), z.string()]).optional(),
  change_percent: z.union([z.number(), z.string()]).optional(),
  unit: z.string().optional(),
});

const brsResponseSchema = z.object({
  gold: z.array(brsItemSchema).optional(),
  currency: z.array(brsItemSchema).optional(),
  cryptocurrency: z.array(brsItemSchema).optional(),
});

export class BrsApiProvider implements MarketDataProvider {
  id = 'brsapi';
  displayName = 'BrsApi';
  assetClasses: AssetClass[] = ['iranian_currency', 'iranian_gold_coin'] ;
  delayLabel = 'Live';

  constructor(private ctx: ProviderContext) {}

  private get key(): string {
    return this.ctx.env.BRSAPI_API_KEY ?? '';
  }

  private get baseUrl(): string {
    return `${this.ctx.env.BRSAPI_BASE_URL ?? 'https://Api.BrsApi.ir/Market'}/Gold_Currency.php`;
  }

  private log(level: 'debug' | 'info' | 'warn' | 'error', msg: string, meta?: Record<string, unknown>) {
    this.ctx.log?.(level, msg, { provider: this.id, ...meta });
  }

  async getLatestQuotes(request: LatestQuoteRequest): Promise<NormalizedQuote[]> {
    if (!this.key) {
      throw new ProviderError('BRSAPI_API_KEY is not configured', this.id, false);
    }
    const url = `${this.baseUrl}?key=${encodeURIComponent(this.key)}`;
    this.log('debug', 'fetching BrsApi latest', { url: this.baseUrl });
    const raw = await fetchJson<unknown>(url, this.id);
    const parsed = brsResponseSchema.parse(raw);

    const byExternal = new Map<string, z.infer<typeof brsItemSchema>>();
    for (const group of [parsed.gold ?? [], parsed.currency ?? [], parsed.cryptocurrency ?? []]) {
      for (const item of group) byExternal.set(item.symbol, item);
    }

    const receivedAt = new Date().toISOString();
    const quotes: NormalizedQuote[] = [];

    for (const [canonical, external] of Object.entries(request.mapping)) {
      if (request.symbols && !request.symbols.includes(canonical)) continue;
      const item = byExternal.get(external);
      if (!item) continue;

      const price = toDecimalString(item.price);
      if (!price) continue;
      const marketTimestamp = item.time_unix
        ? toIsoTimestamp(item.time_unix)
        : toIsoTimestamp(`${item.date ?? ''} ${item.time ?? ''}`);

      quotes.push({
        symbol: canonical,
        price,
        changeAbsolute: toDecimalString(item.change_value),
        changePercent: toDecimalString(item.change_percent),
        marketTimestamp,
        receivedAt,
        freshness: 'live',
        rawChecksum: quoteChecksum(canonical, price, marketTimestamp, this.id),
        rawMetadata: {
          providerSymbol: external,
          nameFa: item.name,
          nameEn: item.name_en,
          unit: item.unit,
          date: item.date,
          time: item.time,
        },
      });
    }
    return quotes;
  }

  /** BrsApi free tier has no history endpoint. Local snapshots fill the gap. */
  async getHistoricalData(): Promise<NormalizedHistoricalPoint[]> {
    return [];
  }

  async getHealth(): Promise<ProviderHealth> {
    if (!this.key) return { ok: false, message: 'BRSAPI_API_KEY not configured' };
    const started = Date.now();
    try {
      await fetchJson<unknown>(`${this.baseUrl}?key=${encodeURIComponent(this.key)}`, this.id, { timeoutMs: 15_000 });
      return { ok: true, latencyMs: Date.now() - started };
    } catch (err) {
      return { ok: false, latencyMs: Date.now() - started, message: err instanceof Error ? err.message : 'error' };
    }
  }
}
