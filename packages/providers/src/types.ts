import type { AppEnv } from '@sarmaye/shared';
import type {
  AssetClass,
  CandleInterval,
  NormalizedHistoricalPoint,
  NormalizedQuote,
} from '@sarmaye/shared';

/** Everything a provider adapter needs to know about its environment. */
export interface ProviderContext {
  env: AppEnv;
  /** Structured logger callback (the worker wires this to pino). */
  log?: (level: 'debug' | 'info' | 'warn' | 'error', msg: string, meta?: Record<string, unknown>) => void;
}

export interface LatestQuoteRequest {
  /**
   * Mapping canonicalSymbol -> provider external symbol, e.g.
   * { USD: "USD", XAU: "XAUUSD" }. Built by the worker from the DB.
   */
  mapping: Record<string, string>;
  /** Restrict to these canonical symbols (undefined = all mapped). */
  symbols?: string[];
}

export interface HistoricalRequest {
  symbol: string;
  /** Provider-side symbol (already resolved via mapping). */
  externalSymbol: string;
  start: Date;
  end: Date;
  interval?: CandleInterval;
}

export interface ProviderHealth {
  ok: boolean;
  latencyMs?: number;
  message?: string;
}

export interface ProviderUsageStatus {
  used?: number;
  limit?: number;
  remaining?: number;
  resetAt?: Date | null;
}

/* ------------------------------------------------------------------ */
/* News (non-market data; served by the web app, cached in the DB)     */
/* ------------------------------------------------------------------ */

export interface NewsArticle {
  title: string;
  url: string;
  description?: string;
  source?: string;
  publishedAt?: string; // ISO, when the provider reports it
  lang: string;
}

export interface NewsProvider {
  id: string;
  displayName: string;
  isConfigured(): boolean;
  getNews(input: {
    query: string;
    count: number;
    freshness?: string;
    searchLang?: string;
    country?: string;
  }): Promise<NewsArticle[]>;
}

/**
 * The provider abstraction. Every external data source implements this.
 * Implementations are stateless regarding the database: they receive
 * everything they need and return normalized data.
 */
export interface MarketDataProvider {
  id: string;
  displayName: string;
  assetClasses: AssetClass[];
  /** Human-readable delay label, e.g. "Live", "Delayed", "Daily reference rate". */
  delayLabel: string;
  getLatestQuotes(request: LatestQuoteRequest): Promise<NormalizedQuote[]>;
  getHistoricalData(request: HistoricalRequest): Promise<NormalizedHistoricalPoint[]>;
  getHealth(): Promise<ProviderHealth>;
  getUsageStatus?(): Promise<ProviderUsageStatus>;
}

export type { NormalizedQuote, NormalizedHistoricalPoint };
export type { AssetClass } from '@sarmaye/shared';
