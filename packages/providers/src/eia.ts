import { z } from 'zod';
import { fetchJson, ProviderError } from './http.js';
import { toDecimalString } from './normalize.js';
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
 * EIA (US Energy Information Administration) — official daily reference prices
 * for crude oil and natural gas. Free API key, generous limits.
 * https://www.eia.gov/opendata/
 */
const seriesDataSchema = z
  .object({
    response: z
      .object({
        data: z.array(
          z.object({
            period: z.string(), // YYYY-MM-DD
            value: z.union([z.string(), z.number(), z.null()]).optional(),
          })
        ),
      })
      .optional(),
  })
  .passthrough();

export class EiaProvider implements MarketDataProvider {
  id = 'eia';
  displayName = 'EIA (US Energy Information Administration)';
  assetClasses: AssetClass[] = ['global_market'];
  delayLabel = 'Daily reference rate'; // official daily data, never "live"
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(private readonly ctx: ProviderContext) {
    this.apiKey = ctx.env.EIA_API_KEY ?? '';
    this.baseUrl = ctx.env.EIA_BASE_URL ?? 'https://api.eia.gov/v2/seriesid';
  }

  private seriesUrl(external: string, startIso: string, endIso: string): string {
    const q = new URLSearchParams({
      api_key: this.apiKey,
      out: 'json',
      frequency: 'daily',
      start: startIso.slice(0, 10),
      end: endIso.slice(0, 10),
    });
    return `${this.baseUrl}/${encodeURIComponent(external)}/data?${q.toString()}`;
  }

  async getLatestQuotes(request: LatestQuoteRequest): Promise<NormalizedQuote[]> {
    if (!this.apiKey) throw new ProviderError('EIA_API_KEY is not configured', this.id, false);
    const receivedAt = new Date();
    const start = new Date(receivedAt.getTime() - 45 * 24 * 3600_000).toISOString();
    const out: NormalizedQuote[] = [];
    for (const [symbol, external] of Object.entries(request.mapping)) {
      const raw = await fetchJson<unknown>(this.seriesUrl(external, start, receivedAt.toISOString()), this.id, { retries: 1, timeoutMs: 20_000 });
      const parsed = seriesDataSchema.parse(raw);
      const rows = (parsed.response?.data ?? []).filter((r) => r.value !== null && r.value !== '');
      const latest = rows[rows.length - 1];
      const price = toDecimalString(latest?.value);
      if (!price) continue;
      const prev = rows.length > 1 ? toDecimalString(rows[rows.length - 2]?.value) : null;
      const changeAbsolute = prev && price ? (Number(price) - Number(prev)).toFixed(8) : null;
      out.push({
        symbol,
        price,
        bid: null,
        ask: null,
        open: null,
        high: null,
        low: null,
        previousClose: prev,
        changeAbsolute,
        changePercent: prev && Number(prev) !== 0 ? (((Number(price) - Number(prev)) / Number(prev)) * 100).toFixed(6) : null,
        volume: null,
        marketTimestamp: latest?.period ? new Date(latest.period + 'T00:00:00Z').toISOString() : receivedAt.toISOString(),
        receivedAt: receivedAt.toISOString(),
        freshness: 'daily_reference',
        rawChecksum: '',
        rawMetadata: { provider: this.id, externalSymbol: external, source: 'EIA open data' },
      });
    }
    return out;
  }

  async getHistoricalData(request: HistoricalRequest): Promise<NormalizedHistoricalPoint[]> {
    if (!this.apiKey) throw new ProviderError('EIA_API_KEY is not configured', this.id, false);
    const raw = await fetchJson<unknown>(
      this.seriesUrl(request.externalSymbol, request.start.toISOString(), request.end.toISOString()),
      this.id,
      { retries: 1, timeoutMs: 25_000 }
    );
    const parsed = seriesDataSchema.parse(raw);
    const points: NormalizedHistoricalPoint[] = [];
    for (const row of parsed.response?.data ?? []) {
      const price = toDecimalString(row.value);
      if (!price) continue;
      const time = new Date(row.period + 'T12:00:00Z').toISOString();
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
    return points;
  }

  async getHealth(): Promise<ProviderHealth> {
    return { ok: Boolean(this.apiKey), message: this.apiKey ? undefined : 'not configured' };
  }
}
