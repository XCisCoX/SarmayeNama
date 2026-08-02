/**
 * Core domain types shared across the web app, the ingestion worker and the
 * database layer. These are the normalized, provider-independent shapes.
 */

import type { CategoryMeta } from './constants.js';

export const ASSET_CLASSES = [
  'iranian_currency',
  'iranian_gold_coin',
  'global_currency',
  'precious_metal',
  'cryptocurrency',
  'iranian_stock',
  'global_market',
  'economic_indicator',
] as const;

export type AssetClass = (typeof ASSET_CLASSES)[number];

export const MARKETS = ['iran', 'global', 'crypto', 'commodities', 'macro'] as const;
export type Market = (typeof MARKETS)[number];

export const QUOTE_CURRENCIES = ['TOMAN', 'RIAL', 'USD', 'EUR', 'IRR'] as const;
export type QuoteCurrency = (typeof QUOTE_CURRENCIES)[number];

export type FreshnessStatus =
  | 'live'
  | 'delayed'
  | 'daily_reference'
  | 'derived'
  | 'cached'
  | 'stale';

export const CANDLE_INTERVALS = ['5m', '15m', '1h', '1d', '1w', '1mo'] as const;
export type CandleInterval = (typeof CANDLE_INTERVALS)[number];

/** Chart ranges offered by the UI. Ranges without data are hidden, never faked. */
export const CHART_RANGES = ['1D', '7D', '1M', '3M', '6M', '1Y', '5Y', 'MAX'] as const;
export type ChartRange = (typeof CHART_RANGES)[number];

export interface Asset {
  id: string;
  symbol: string;
  nameFa: string;
  nameEn: string;
  assetClass: AssetClass;
  market: Market;
  quoteCurrency: QuoteCurrency;
  /** Human description of one unit, e.g. "1 USD", "1 troy ounce", "1 coin". */
  unit: string;
  /** Decimal places used when displaying prices. */
  precision: number;
  enabled: boolean;
  sortOrder: number;
  /** Icon metadata — an icon name from the local icon set (never remote URLs). */
  icon: string | null;
  isDerived: boolean;
  /** Inputs used when isDerived, e.g. ["XAU","USD"] plus a formula description. */
  derivedFrom: { assetSymbols: string[]; formulaFa: string; formulaEn: string } | null;
  descriptionFa: string | null;
  descriptionEn: string | null;
  /** Provider-specific external identifiers, e.g. { coingecko: "bitcoin" }. */
  externalIds: Record<string, string> | null;
  firstCollectedAt: string | null;
  /** Human message about locally-collected history, e.g. "collected since …". */
  historyNoteFa: string | null;
  historyNoteEn: string | null;
  aliases: string[];
  providers: { providerCode: string; externalSymbol: string; enabled: boolean; priority: number }[];
}

export interface Quote {
  assetId: string;
  assetSymbol: string;
  assetNameFa: string;
  assetNameEn: string;
  assetClass: AssetClass;
  unit: string;
  quoteCurrency: QuoteCurrency;
  precision: number;
  icon: string | null;
  price: string | null; // decimal as string
  bid: string | null;
  ask: string | null;
  open: string | null;
  high: string | null;
  low: string | null;
  previousClose: string | null;
  changeAbsolute: string | null;
  changePercent: string | null;
  volume: string | null;
  marketCap: string | null;
  circulatingSupply: string | null;
  marketTimestamp: string | null;
  receivedAt: string | null;
  freshness: FreshnessStatus;
  providerId: string;
  providerCode: string;
  providerDisplayName: string;
  delayLabel: string;
  rawMetadata: Record<string, unknown> | null;
}

export interface Candle {
  assetSymbol: string;
  interval: CandleInterval;
  startTime: string; // ISO
  endTime: string; // ISO
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string | null;
  sampleCount: number;
  isFinal: boolean;
  providerCode: string | null;
}

export interface ProviderStatus {
  providerId: string;
  code: string;
  displayName: string;
  enabled: boolean;
  configured: boolean; // has the required API key been configured?
  missingConfig: string[]; // names of missing env vars
  status: 'ok' | 'degraded' | 'down' | 'circuit_open' | 'quota_exhausted' | 'disabled' | 'not_configured';
  latencyMs: number | null;
  lastSuccessAt: string | null;
  lastError: string | null;
  consecutiveFailures: number;
  usageToday: { requests: number; successes: number; failures: number };
  dailyQuota: number | null;
  delayLabel: string;
  assetClasses: AssetClass[];
  attribution: string | null;
  fallbackProvider: string | null;
}

export interface SparklinePoint {
  t: number; // epoch ms
  v: number; // close value
}

export interface OverviewAsset extends Quote {
  sparkline: SparklinePoint[];
}

export interface MarketOverview {
  generatedAt: string;
  quoteCurrencyMode: QuoteCurrency;
  categories: CategoryMeta[];
  assets: OverviewAsset[];
  gainers: OverviewAsset[];
  losers: OverviewAsset[];
  providerStatuses: ProviderStatus[];
  staleCount: number;
  marketSessions: { market: string; isOpen: boolean; labelFa: string; labelEn: string }[];
}

export interface ConversionResult {
  from: string;
  to: string;
  amount: string;
  result: string;
  rate: string;
  formula: string;
  direct: boolean; // false => derived via an intermediate asset
  sourceAssets: { symbol: string; nameFa: string; price: string; providerCode: string; freshness: FreshnessStatus }[];
  timestamp: string;
}

export interface AssetHistoryResponse {
  symbol: string;
  interval: CandleInterval;
  range: ChartRange;
  start: string;
  end: string;
  candles: Candle[];
  /** Where the candle data came from: provider-supplied or locally collected. */
  historySource: 'provider' | 'local_snapshots' | 'mixed';
  historyNoteFa: string | null;
  historyNoteEn: string | null;
  availableRanges: ChartRange[];
}

export interface SearchResultItem {
  symbol: string;
  nameFa: string;
  nameEn: string;
  assetClass: AssetClass;
  icon: string | null;
  matchedAlias: string | null;
  quoteCurrency: QuoteCurrency;
  price: string | null;
  changePercent: string | null;
  freshness: FreshnessStatus | null;
}
