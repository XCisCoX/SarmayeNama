import { z } from 'zod';
import { CANDLE_INTERVALS, CHART_RANGES } from './types.js';

/** Zod schemas for every public API surface. All route inputs must pass through these. */

export const CandleIntervalSchema = z.enum(CANDLE_INTERVALS);
export const ChartRangeSchema = z.enum(CHART_RANGES);

export const HistoryQuerySchema = z.object({
  symbol: z.string().min(1).max(64),
  range: ChartRangeSchema.optional(),
  start: z.string().datetime({ offset: true }).or(z.string().datetime()).optional(),
  end: z.string().datetime({ offset: true }).or(z.string().datetime()).optional(),
  interval: CandleIntervalSchema.optional(),
  provider: z.string().optional(),
});

export const ConverterQuerySchema = z.object({
  from: z.string().min(1).max(32),
  to: z.string().min(1).max(32),
  amount: z
    .string()
    .regex(/^\d+(\.\d+)?$/, 'amount must be a non-negative decimal')
    .optional(),
});

export const SearchQuerySchema = z.object({
  q: z.string().min(1).max(100),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export const AssetsQuerySchema = z.object({
  category: z.string().optional(),
  assetClass: z.string().optional(),
  enabled: z.enum(['true', 'false']).optional(),
  search: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(100),
  offset: z.coerce.number().int().min(0).default(0),
});

export const OverviewQuerySchema = z.object({
  currencyMode: z.enum(['TOMAN', 'RIAL']).optional(),
  lang: z.enum(['fa', 'en']).optional(),
});

export const SparklinesQuerySchema = z.object({
  symbols: z
    .string()
    .max(2000)
    .transform((s) => s.split(',').map((x) => x.trim()).filter(Boolean).slice(0, 40)),
  days: z.coerce.number().int().min(2).max(365).default(7),
});

export const AdminQuerySchema = z.object({
  secret: z.string().min(1),
});

/** Normalized quote — the provider-agnostic shape that reaches the database. */
export const NormalizedQuoteSchema = z.object({
  assetId: z.string().optional(), // filled by the worker via symbol mapping
  symbol: z.string().min(1).max(64),
  price: z.string().regex(/^-?\d+(\.\d+)?$/),
  bid: z.string().regex(/^-?\d+(\.\d+)?$/).nullable().optional(),
  ask: z.string().regex(/^-?\d+(\.\d+)?$/).nullable().optional(),
  open: z.string().regex(/^-?\d+(\.\d+)?$/).nullable().optional(),
  high: z.string().regex(/^-?\d+(\.\d+)?$/).nullable().optional(),
  low: z.string().regex(/^-?\d+(\.\d+)?$/).nullable().optional(),
  previousClose: z.string().regex(/^-?\d+(\.\d+)?$/).nullable().optional(),
  changeAbsolute: z.string().regex(/^-?\d+(\.\d+)?$/).nullable().optional(),
  changePercent: z.string().regex(/^-?\d+(\.\d+)?$/).nullable().optional(),
  volume: z.string().regex(/^-?\d+(\.\d+)?$/).nullable().optional(),
  marketCap: z.string().regex(/^-?\d+(\.\d+)?$/).nullable().optional(),
  circulatingSupply: z.string().regex(/^-?\d+(\.\d+)?$/).nullable().optional(),
  /** When the market itself observed this price. */
  marketTimestamp: z.string().datetime().nullable().optional(),
  /** Always provided by the worker: when our server received it. */
  receivedAt: z.string().datetime(),
  /** live | delayed | daily_reference | derived | cached | stale */
  freshness: z.enum(['live', 'delayed', 'daily_reference', 'derived', 'cached', 'stale']),
  rawChecksum: z.string().optional(),
  rawMetadata: z.record(z.unknown()).nullable().optional(),
});

export type NormalizedQuote = z.infer<typeof NormalizedQuoteSchema>;

/** Normalized historical point (provider-supplied history). */
export const NormalizedHistoricalPointSchema = z.object({
  symbol: z.string().min(1).max(64),
  /** Candle start (bucket start). */
  time: z.string().datetime(),
  interval: CandleIntervalSchema,
  open: z.string().regex(/^-?\d+(\.\d+)?$/),
  high: z.string().regex(/^-?\d+(\.\d+)?$/),
  low: z.string().regex(/^-?\d+(\.\d+)?$/),
  close: z.string().regex(/^-?\d+(\.\d+)?$/),
  volume: z.string().regex(/^-?\d+(\.\d+)?$/).nullable().optional(),
});

export type NormalizedHistoricalPoint = z.infer<typeof NormalizedHistoricalPointSchema>;

export const ErrorEnvelopeSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    requestId: z.string().optional(),
  }),
});

export const HealthResponseSchema = z.object({
  status: z.enum(['ok', 'degraded']),
  database: z.enum(['ok', 'error']),
  timestamp: z.string().datetime(),
  staleAssets: z.number(),
  providers: z.number(),
  providersDown: z.number(),
});
