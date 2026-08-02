import { z } from 'zod';

/**
 * Environment variable contract shared by web + worker.
 * Secrets are server-only; the browser bundle never sees these.
 */
export const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // Iranian markets
  BRSAPI_API_KEY: z.string().optional(),
  NAVASAN_API_KEY: z.string().optional(),
  IRANIAN_STOCKS_ENABLED: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),

  // Precious metals
  METALSDEV_API_KEY: z.string().optional(),
  ALPHAVANTAGE_API_KEY: z.string().optional(),
  GLOBAL_MARKETS_ENABLED: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),

  // Crypto
  COINGECKO_API_KEY: z.string().optional(), // optional demo key

  // Macro
  FRED_API_KEY: z.string().optional(),
  ECONOMIC_INDICATORS_ENABLED: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),

  // Market news (NewsAPI free tier: 100 req/day non-commercial; Brave free
  // tier: 2000 queries/month). NewsAPI is preferred when its key is present.
  NEWS_API_KEY: z.string().optional(),
  NEWSAPI_BASE_URL: z.string().url().optional(), // test override
  BRAVE_API_KEY: z.string().optional(),
  NEWS_ENABLED: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),
  NEWS_INTERVAL_MS: z.coerce.number().int().min(300_000).default(45 * 60_000),
  BRAVE_BASE_URL: z.string().url().optional(), // test override

  // Global markets — US stocks via Finnhub (free: real-time US quotes, 60/min)
  FINNHUB_API_KEY: z.string().optional(),
  FINNHUB_BASE_URL: z.string().url().optional(), // test override
  FINNHUB_INTERVAL_MS: z.coerce.number().int().min(60_000).default(30 * 60_000),
  FINNHUB_DAILY_LIMIT: z.coerce.number().int().min(1).default(500),

  // Energy commodities via EIA (official US daily reference data, free key)
  EIA_API_KEY: z.string().optional(),
  EIA_BASE_URL: z.string().url().optional(), // test override
  EIA_INTERVAL_MS: z.coerce.number().int().min(3600_000).default(24 * 3600_000),

  // AI market summary (Google Gemini free tier; labeled, never financial advice)
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_BASE_URL: z.string().url().optional(), // test override
  GEMINI_MODEL: z.string().default('gemini-2.0-flash'),
  GEMINI_SUMMARIES_ENABLED: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),
  GEMINI_INTERVAL_MS: z.coerce.number().int().min(300_000).default(30 * 60_000),

  // Scheduler tuning (milliseconds)
  BRSAPI_INTERVAL_MS: z.coerce.number().int().min(30_000).default(90_000),
  NAVASAN_INTERVAL_MS: z.coerce.number().int().min(60_000).default(600_000),
  TSETMC_INTERVAL_MS: z.coerce.number().int().min(60_000).default(300_000),
  METALS_INTERVAL_MS: z.coerce.number().int().min(60_000).default(6 * 3600_000),
  COINGECKO_INTERVAL_MS: z.coerce.number().int().min(60_000).default(300_000),
  FRANKFURTER_INTERVAL_MS: z.coerce.number().int().min(3600_000).default(12 * 3600_000),
  ALPHAVANTAGE_INTERVAL_MS: z.coerce.number().int().min(3600_000).default(24 * 3600_000),
  FRED_INTERVAL_MS: z.coerce.number().int().min(3600_000).default(24 * 3600_000),

  // Quota budgets (daily request caps per provider)
  BRSAPI_DAILY_LIMIT: z.coerce.number().int().min(1).default(1500),
  NAVASAN_DAILY_LIMIT: z.coerce.number().int().min(1).default(240),
  METALSDEV_DAILY_LIMIT: z.coerce.number().int().min(1).default(20),
  ALPHAVANTAGE_DAILY_LIMIT: z.coerce.number().int().min(1).default(25),
  COINGECKO_DAILY_LIMIT: z.coerce.number().int().min(1).default(1000),

  // Aggregation & retention
  AGGREGATE_INTERVAL_MS: z.coerce.number().int().min(60_000).default(300_000),
  SNAPSHOT_RETENTION_DAYS: z.coerce.number().int().min(1).default(90),
  HEALTH_CHECK_INTERVAL_MS: z.coerce.number().int().min(60_000).default(300_000),

  // Circuit breaker
  CIRCUIT_FAILURE_THRESHOLD: z.coerce.number().int().min(1).default(5),
  CIRCUIT_COOLDOWN_MS: z.coerce.number().int().min(10_000).default(300_000),

  // Web
  ADMIN_SECRET: z.string().default('change-me-admin-secret'),
  WEB_ORIGIN: z.string().default('http://localhost:3000'),

  // Optional base-URL overrides (used by tests against mock servers)
  BRSAPI_BASE_URL: z.string().url().optional(),
  NAVASAN_BASE_URL: z.string().url().optional(),
  TSETMC_BASE_URL: z.string().url().optional(),
  FRANKFURTER_BASE_URL: z.string().url().optional(),
  METALSDEV_BASE_URL: z.string().url().optional(),
  ALPHAVANTAGE_BASE_URL: z.string().url().optional(),
  COINGECKO_BASE_URL: z.string().url().optional(),
  FRED_BASE_URL: z.string().url().optional(),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
  LOG_JSON: z.enum(['true', 'false']).default('true'),
});

export type AppEnv = z.infer<typeof EnvSchema>;

export function parseEnv(source: Record<string, string | undefined> = process.env): AppEnv {
  const parsed = EnvSchema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  return parsed.data;
}

/** Keys of env vars that are secrets and must never appear in logs or API responses. */
export const SECRET_ENV_KEYS = [
  'BRSAPI_API_KEY',
  'NAVASAN_API_KEY',
  'METALSDEV_API_KEY',
  'ALPHAVANTAGE_API_KEY',
  'COINGECKO_API_KEY',
  'FRED_API_KEY',
  'ADMIN_SECRET',
  'DATABASE_URL',
];
