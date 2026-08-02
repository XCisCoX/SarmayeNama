import { pino, type Logger } from 'pino';
import { parseEnv, type AppEnv } from '@sarmaye/shared';

export interface WorkerConfig {
  env: AppEnv;
  log: Logger;
  /** Advisory lock id that prevents duplicate worker instances. */
  lockId: number;
}

export function loadConfig(): WorkerConfig {
  const env = parseEnv();
  const log = pino({
    level: env.LOG_LEVEL,
    // JSON logs in production (docker), pretty in dev
    transport:
      env.LOG_JSON === 'true'
        ? undefined
        : { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss' } },
    base: { service: 'sarmaye-worker' },
  });
  return { env, log, lockId: 42 };
}

export function providerIntervalMs(providerId: string, env: AppEnv): number {
  switch (providerId) {
    case 'brsapi':
      return env.BRSAPI_INTERVAL_MS;
    case 'navasan':
      return env.NAVASAN_INTERVAL_MS;
    case 'brsapi-tsetmc':
      return env.TSETMC_INTERVAL_MS;
    case 'frankfurter':
      return env.FRANKFURTER_INTERVAL_MS;
    case 'metalsdev':
      return env.METALS_INTERVAL_MS;
    case 'alphavantage':
      return env.ALPHAVANTAGE_INTERVAL_MS;
    case 'coingecko':
      return env.COINGECKO_INTERVAL_MS;
    case 'fred':
      return env.FRED_INTERVAL_MS;
    case 'finnhub':
      return env.FINNHUB_INTERVAL_MS;
    case 'eia':
      return env.EIA_INTERVAL_MS;
    default:
      return 300_000;
  }
}

export function providerDailyQuota(providerId: string, env: AppEnv): number | null {
  switch (providerId) {
    case 'brsapi':
      return env.BRSAPI_DAILY_LIMIT;
    case 'navasan':
      return env.NAVASAN_DAILY_LIMIT;
    case 'metalsdev':
      return env.METALSDEV_DAILY_LIMIT;
    case 'finnhub':
      return env.FINNHUB_DAILY_LIMIT;
    case 'alphavantage':
      return env.ALPHAVANTAGE_DAILY_LIMIT;
    case 'coingecko':
      return env.COINGECKO_DAILY_LIMIT;
    default:
      return null;
  }
}

export function staleAfterMs(providerId: string, env: AppEnv): number {
  // 3x the refresh interval is the staleness threshold, with a floor.
  return Math.max(providerIntervalMs(providerId, env) * 3, 15 * 60_000);
}

/** Add ±10% jitter to an interval so providers don't see synchronized thundering herds. */
export function withJitter(intervalMs: number): number {
  const jitter = (Math.random() - 0.5) * 0.2 * intervalMs;
  return Math.max(30_000, Math.round(intervalMs + jitter));
}
