import { z } from 'zod';
import type { ProviderContext, MarketDataProvider, LatestQuoteRequest, HistoricalRequest, ProviderHealth, AssetClass } from './types.js';
import { fetchJson, ProviderError, ProviderRateLimitedError } from './http.js';
import { quoteChecksum, toDecimalString, toIsoTimestamp } from './normalize.js';
import type { NormalizedQuote, NormalizedHistoricalPoint } from '@sarmaye/shared';

/**
 * Alpha Vantage — global stocks, commodities, FX and metals fallback.
 * Free plan ≈ 25 requests/day. Use only on low-frequency schedules with a
 * hard daily quota. US stock quotes from this provider are delayed, not
 * real-time — the delayLabel reflects that.
 *
 * Stocks:     function=GLOBAL_QUOTE&symbol=IBM
 * FX/metals:  function=CURRENCY_EXCHANGE_RATE&from_currency=XAU&to_currency=USD
 * Commodity:  function=WTI&interval=daily (also BRENT, NATURAL GAS, COPPER,
 *             WHEAT, CORN)
 * Stock history: function=TIME_SERIES_DAILY&symbol=IBM&outputsize=compact
 */

const globalQuoteSchema = z.object({
  'Global Quote': z
    .object({
      '01. symbol': z.string().optional(),
      '02. open': z.string().optional(),
      '03. high': z.string().optional(),
      '04. low': z.string().optional(),
      '05. price': z.string().optional(),
      '06. volume': z.string().optional(),
      '07. latest trading day': z.string().optional(),
      '08. previous close': z.string().optional(),
      '09. change': z.string().optional(),
      '10. change percent': z.string().optional(),
    })
    .optional(),
});

const fxRateSchema = z.object({
  'Realtime Currency Exchange Rate': z
    .object({
      '5. Exchange Rate': z.string().optional(),
      '6. Last Refreshed': z.string().optional(),
    })
    .optional(),
});

const timeSeriesSchema = z.object({
  'Time Series (Daily)': z.record(
    z.string(),
    z.object({
      '1. open': z.string(),
      '2. high': z.string(),
      '3. low': z.string(),
      '4. close': z.string(),
      '5. volume': z.string().optional(),
    })
  ).optional(),
});

const commoditySchema = z.object({
  name: z.string().optional(),
  data: z
    .array(z.object({ date: z.string(), value: z.string() }))
    .optional(),
});

export class AlphaVantageProvider implements MarketDataProvider {
  id = 'alphavantage';
  displayName = 'Alpha Vantage';
  assetClasses: AssetClass[] = ['precious_metal', 'global_market', 'global_currency'] ;
  delayLabel = 'Delayed';

  constructor(private ctx: ProviderContext) {}

  private get key(): string {
    return this.ctx.env.ALPHAVANTAGE_API_KEY ?? '';
  }

  private get baseUrl(): string {
    return this.ctx.env.ALPHAVANTAGE_BASE_URL ?? 'https://www.alphavantage.co/query';
  }

  private async query(params: Record<string, string>): Promise<unknown> {
    if (!this.key) throw new ProviderError('ALPHAVANTAGE_API_KEY is not configured', this.id, false);
    const qs = new URLSearchParams({ ...params, apikey: this.key });
    const raw = await fetchJson<unknown>(`${this.baseUrl}?${qs.toString()}`, this.id);
    // Free-tier error shapes: Information/Note = rate-limit advisories
    // ("Please consider spreading out your free API requests…").
    const info = (raw as { Information?: string; Note?: string; 'Error Message'?: string });
    if (info.Information || info.Note) {
      throw new ProviderRateLimitedError(
        this.id,
        (info.Information ?? info.Note ?? 'Alpha Vantage rate limited').slice(0, 200)
      );
    }
    if (info['Error Message']) {
      throw new ProviderError(info['Error Message'], this.id, false);
    }
    return raw;
  }

  /** Free tier allows ~1 request/second; pace multi-symbol loops. */
  private async paced(symbols: number): Promise<void> {
    if (symbols > 1) await new Promise((r) => setTimeout(r, 1200));
  }

  async getLatestQuotes(request: LatestQuoteRequest): Promise<NormalizedQuote[]> {
    const receivedAt = new Date().toISOString();
    const quotes: NormalizedQuote[] = [];

    for (const [canonical, external] of Object.entries(request.mapping)) {
      if (request.symbols && !request.symbols.includes(canonical)) continue;
      // Commodities are identified by uppercase single-word function names.
      if (['WTI', 'BRENT', 'NATURAL GAS', 'COPPER', 'WHEAT', 'CORN'].includes(external)) {
        const raw = await this.query({ function: external, interval: 'daily' });
        const data = commoditySchema.parse(raw);
        const last = data.data?.[0];
        if (!last) continue;
        const price = toDecimalString(last.value);
        if (!price) continue;
        const marketTimestamp = toIsoTimestamp(last.date);
        quotes.push({
          symbol: canonical,
          price,
          marketTimestamp,
          receivedAt,
          freshness: 'delayed',
          rawChecksum: quoteChecksum(canonical, price, marketTimestamp, this.id),
          rawMetadata: { avFunction: external, name: data.name },
        });
        continue;
      }
      if (external === 'XAUUSD' || external === 'XAGUSD' || external === 'XAU' || external === 'XAG') {
        const [from, to] = external === 'XAUUSD' || external === 'XAGUSD' ? [external.slice(0, 3), 'USD'] : [external, 'USD'];
        const raw = await this.query({ function: 'CURRENCY_EXCHANGE_RATE', from_currency: from, to_currency: to });
        const data = fxRateSchema.parse(raw);
        const rate = data['Realtime Currency Exchange Rate'];
        const price = rate ? toDecimalString(rate['5. Exchange Rate']) : null;
        if (!price) continue;
        const marketTimestamp = rate?.['6. Last Refreshed'] ? toIsoTimestamp(rate['6. Last Refreshed']) : receivedAt;
        quotes.push({
          symbol: canonical,
          price,
          marketTimestamp,
          receivedAt,
          freshness: 'delayed',
          rawChecksum: quoteChecksum(canonical, price, marketTimestamp, this.id),
          rawMetadata: { avFunction: 'CURRENCY_EXCHANGE_RATE', from, to },
        });
        continue;
      }
      // Stocks: GLOBAL_QUOTE
      const raw = await this.query({ function: 'GLOBAL_QUOTE', symbol: external });
      const data = globalQuoteSchema.parse(raw);
      const quote = data['Global Quote'];
      if (!quote) continue;
      const price = toDecimalString(quote['05. price']);
      if (!price) continue;
      const marketTimestamp = toIsoTimestamp(quote['07. latest trading day']);
      quotes.push({
        symbol: canonical,
        price,
        open: toDecimalString(quote['02. open']),
        high: toDecimalString(quote['03. high']),
        low: toDecimalString(quote['04. low']),
        volume: toDecimalString(quote['06. volume']),
        previousClose: toDecimalString(quote['08. previous close']),
        changeAbsolute: toDecimalString(quote['09. change']),
        changePercent: toDecimalString(quote['10. change percent']),
        marketTimestamp,
        receivedAt,
        freshness: 'delayed',
        rawChecksum: quoteChecksum(canonical, price, marketTimestamp, this.id),
        rawMetadata: { avSymbol: quote['01. symbol'] },
      });
    }
    return quotes;
  }

  /** Daily stock history (TIME_SERIES_DAILY, compact = last 100 days). */
  async getHistoricalData(request: HistoricalRequest): Promise<NormalizedHistoricalPoint[]> {
    const url = `${this.baseUrl}?function=TIME_SERIES_DAILY&symbol=${encodeURIComponent(request.externalSymbol)}&outputsize=compact&apikey=${encodeURIComponent(this.key)}`;
    const raw = await fetchJson<unknown>(url, this.id);
    const data = timeSeriesSchema.parse(raw);
    const series = data['Time Series (Daily)'] ?? {};
    const points: NormalizedHistoricalPoint[] = [];
    for (const [dateStr, day] of Object.entries(series)) {
      const time = new Date(`${dateStr}T00:00:00Z`);
      if (time < request.start || time > request.end) continue;
      points.push({
        symbol: request.symbol,
        time: time.toISOString(),
        interval: '1d',
        open: day['1. open'],
        high: day['2. high'],
        low: day['3. low'],
        close: day['4. close'],
        volume: day['5. volume'] ? toDecimalString(day['5. volume']) ?? undefined : undefined,
      });
    }
    return points.sort((a, b) => a.time.localeCompare(b.time));
  }

  async getHealth(): Promise<ProviderHealth> {
    if (!this.key) return { ok: false, message: 'ALPHAVANTAGE_API_KEY not configured' };
    const started = Date.now();
    try {
      await this.query({ function: 'GLOBAL_QUOTE', symbol: 'IBM' });
      return { ok: true, latencyMs: Date.now() - started };
    } catch (err) {
      return { ok: false, latencyMs: Date.now() - started, message: err instanceof Error ? err.message : 'error' };
    }
  }
}
