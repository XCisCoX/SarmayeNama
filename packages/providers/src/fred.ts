import { z } from 'zod';
import type { ProviderContext, MarketDataProvider, LatestQuoteRequest, HistoricalRequest, ProviderHealth, AssetClass } from './types.js';
import { fetchJson, ProviderError } from './http.js';
import { quoteChecksum, toDecimalString } from './normalize.js';
import type { NormalizedQuote, NormalizedHistoricalPoint } from '@sarmaye/shared';

/**
 * FRED — US macroeconomic indicators (stlouisfed.org).
 * Free 32-char API key. Economic indicators are kept separate from market
 * quotes in the UI (economic-indicators category).
 *
 * GET /fred/series/observations?series_id=CPIAUCSL&api_key=KEY&file_type=json
 * Response: { observations: [{ date: "2026-06-01", value: "330.2" }] }
 * Missing values are "." — they must be skipped, never shown as prices.
 */

const fredObservationSchema = z.object({
  date: z.string(),
  value: z.string(),
});

const fredResponseSchema = z.object({
  observations: z.array(fredObservationSchema),
});

export class FredProvider implements MarketDataProvider {
  id = 'fred';
  displayName = 'FRED';
  assetClasses: AssetClass[] = ['economic_indicator'] ;
  delayLabel = 'Daily reference rate';

  constructor(private ctx: ProviderContext) {}

  private get key(): string {
    return this.ctx.env.FRED_API_KEY ?? '';
  }

  private get baseUrl(): string {
    return this.ctx.env.FRED_BASE_URL ?? 'https://api.stlouisfed.org/fred';
  }

  private async observations(seriesId: string, limit: number, sort: 'asc' | 'desc' = 'desc') {
    const qs = new URLSearchParams({
      series_id: seriesId,
      api_key: this.key,
      file_type: 'json',
      sort_order: sort,
      limit: String(limit),
    });
    const raw = await fetchJson<unknown>(`${this.baseUrl}/series/observations?${qs.toString()}`, this.id);
    return fredResponseSchema.parse(raw).observations;
  }

  async getLatestQuotes(request: LatestQuoteRequest): Promise<NormalizedQuote[]> {
    if (!this.key) throw new ProviderError('FRED_API_KEY is not configured', this.id, false);
    const receivedAt = new Date().toISOString();
    const quotes: NormalizedQuote[] = [];
    for (const [canonical, external] of Object.entries(request.mapping)) {
      if (request.symbols && !request.symbols.includes(canonical)) continue;
      const obs = await this.observations(external, 3);
      const valid = obs.filter((o) => o.value !== '.');
      const latest = valid[0];
      if (!latest) continue;
      const prev = valid[1];
      const price = toDecimalString(latest.value);
      if (!price) continue;
      const marketTimestamp = new Date(`${latest.date}T00:00:00Z`).toISOString();
      quotes.push({
        symbol: canonical,
        price,
        // change is computed by the worker from previousValue in rawMetadata
        marketTimestamp,
        receivedAt,
        freshness: 'daily_reference',
        rawChecksum: quoteChecksum(canonical, price, marketTimestamp, this.id),
        rawMetadata: { seriesId: external, date: latest.date, previousDate: prev?.date ?? null, previousValue: prev?.value ?? null },
      });
    }
    return quotes;
  }

  async getHistoricalData(request: HistoricalRequest): Promise<NormalizedHistoricalPoint[]> {
    const obs = await this.observations(request.externalSymbol, 5000, 'asc');
    const points: NormalizedHistoricalPoint[] = [];
    for (const o of obs) {
      if (o.value === '.') continue;
      const time = new Date(`${o.date}T00:00:00Z`);
      if (time < request.start || time > request.end) continue;
      const price = toDecimalString(o.value);
      if (!price) continue;
      points.push({
        symbol: request.symbol,
        time: time.toISOString(),
        interval: '1d',
        open: price,
        high: price,
        low: price,
        close: price,
      });
    }
    return points.sort((a, b) => a.time.localeCompare(b.time));
  }

  async getHealth(): Promise<ProviderHealth> {
    if (!this.key) return { ok: false, message: 'FRED_API_KEY not configured' };
    const started = Date.now();
    try {
      await this.observations('DFF', 1);
      return { ok: true, latencyMs: Date.now() - started };
    } catch (err) {
      return { ok: false, latencyMs: Date.now() - started, message: err instanceof Error ? err.message : 'error' };
    }
  }
}
