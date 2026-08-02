import { z } from 'zod';
import { fetchJson, ProviderError } from './http.js';
import { toDecimalString, toIsoTimestamp } from './normalize.js';
import type {
  MarketDataProvider,
  ProviderContext,
  LatestQuoteRequest,
  HistoricalRequest,
  NormalizedQuote,
  NormalizedHistoricalPoint,
  ProviderHealth,
} from './types.js';
import type { AssetClass } from '@sarmaye/shared';

/**
 * Finnhub — US stock quotes (real-time on the free plan, 60 calls/min).
 * https://finnhub.io/docs/api/quote
 */
const quoteSchema = z
  .object({
    c: z.number().nullable().optional(), // current price
    d: z.number().nullable().optional(), // change
    dp: z.number().nullable().optional(), // percent change
    h: z.number().nullable().optional(), // high
    l: z.number().nullable().optional(), // low
    o: z.number().nullable().optional(), // open
    pc: z.number().nullable().optional(), // previous close
    t: z.number().nullable().optional(), // timestamp (unix seconds)
  })
  .passthrough();

export class FinnhubProvider implements MarketDataProvider {
  id = 'finnhub';
  displayName = 'Finnhub';
  assetClasses: AssetClass[] = ['global_market'];
  delayLabel = 'Live'; // US stocks are real-time on Finnhub's free plan
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(private readonly ctx: ProviderContext) {
    this.apiKey = ctx.env.FINNHUB_API_KEY ?? '';
    this.baseUrl = ctx.env.FINNHUB_BASE_URL ?? 'https://finnhub.io/api/v1';
  }

  async getLatestQuotes(request: LatestQuoteRequest): Promise<NormalizedQuote[]> {
    if (!this.apiKey) throw new ProviderError('FINNHUB_API_KEY is not configured', this.id, false);
    const receivedAt = new Date();
    const out: NormalizedQuote[] = [];
    for (const [symbol, external] of Object.entries(request.mapping)) {
      const url = `${this.baseUrl}/quote?symbol=${encodeURIComponent(external)}&token=${this.apiKey}`;
      const raw = await fetchJson<unknown>(url, this.id, { retries: 1, timeoutMs: 15_000 });
      const parsed = quoteSchema.parse(raw);
      const price = toDecimalString(parsed.c);
      if (!price || price === '0') continue; // illiquid/missing — never invent
      out.push({
        symbol,
        price,
        bid: null,
        ask: null,
        open: toDecimalString(parsed.o),
        high: toDecimalString(parsed.h),
        low: toDecimalString(parsed.l),
        previousClose: toDecimalString(parsed.pc),
        changeAbsolute: toDecimalString(parsed.d),
        changePercent: toDecimalString(parsed.dp),
        volume: null,
        marketTimestamp: parsed.t ? toIsoTimestamp(parsed.t) : receivedAt.toISOString(),
        receivedAt: receivedAt.toISOString(),
        freshness: 'live',
        rawChecksum: '', // filled by store
        rawMetadata: { provider: this.id, externalSymbol: external },
      });
    }
    return out;
  }

  async getHistoricalData(_request: HistoricalRequest): Promise<NormalizedHistoricalPoint[]> {
    // Free plan has no clean batch history endpoint; local snapshots cover it.
    return [];
  }

  async getHealth(): Promise<ProviderHealth> {
    return { ok: Boolean(this.apiKey), message: this.apiKey ? undefined : 'not configured' };
  }
}
