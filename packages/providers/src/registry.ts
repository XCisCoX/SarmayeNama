import type { AppEnv } from '@sarmaye/shared';
import type { MarketDataProvider, NewsProvider, ProviderContext } from './types.js';
import { BrsApiProvider } from './brsapi.js';
import { NavasanProvider } from './navasan.js';
import { BrsApiTsetmcProvider } from './tsetmc.js';
import { FrankfurterProvider } from './frankfurter.js';
import { MetalsDevProvider } from './metalsdev.js';
import { AlphaVantageProvider } from './alphavantage.js';
import { CoinGeckoProvider } from './coingecko.js';
import { FredProvider } from './fred.js';
import { FinnhubProvider } from './finnhub.js';
import { EiaProvider } from './eia.js';
import { NewsApiNewsProvider } from './newsapi.js';
import { BraveNewsProvider } from './bravenews.js';
import { GeminiSummarizer } from './gemini.js';

/**
 * Registry: builds the set of enabled provider adapters from the validated
 * environment. A provider is "configured" when its required key is present;
 * unconfigured providers are excluded (the UI explains what is missing).
 */
export function buildRegistry(env: AppEnv, log?: ProviderContext['log']): MarketDataProvider[] {
  const ctx: ProviderContext = { env, log };
  const providers: MarketDataProvider[] = [];

  const brsapi = new BrsApiProvider(ctx);
  providers.push(brsapi);

  const frankfurter = new FrankfurterProvider(ctx);
  providers.push(frankfurter);

  const coingecko = new CoinGeckoProvider(ctx);
  providers.push(coingecko);

  if (env.NAVASAN_API_KEY) providers.push(new NavasanProvider(ctx));

  if (env.METALSDEV_API_KEY) providers.push(new MetalsDevProvider(ctx));

  if (env.ALPHAVANTAGE_API_KEY && env.GLOBAL_MARKETS_ENABLED) {
    providers.push(new AlphaVantageProvider(ctx));
  }

  if (env.FRED_API_KEY && env.ECONOMIC_INDICATORS_ENABLED) {
    providers.push(new FredProvider(ctx));
  }

  if (env.FINNHUB_API_KEY && env.GLOBAL_MARKETS_ENABLED) {
    providers.push(new FinnhubProvider(ctx));
  }

  if (env.EIA_API_KEY) {
    providers.push(new EiaProvider(ctx));
  }

  if (env.BRSAPI_API_KEY && env.IRANIAN_STOCKS_ENABLED) {
    providers.push(new BrsApiTsetmcProvider(ctx));
  }

  return providers;
}

/** Build the news provider: NewsAPI preferred, Brave as fallback. */
export function buildNewsProvider(env: AppEnv, log?: ProviderContext['log']): NewsProvider | null {
  const ctx: ProviderContext = { env, log };
  if (env.NEWS_API_KEY) return new NewsApiNewsProvider(ctx);
  if (env.BRAVE_API_KEY) return new BraveNewsProvider(ctx);
  return null;
}

/** Build the Gemini AI summarizer (null when not configured). */
export function buildGeminiSummarizer(env: AppEnv, log?: ProviderContext['log']): GeminiSummarizer | null {
  const ctx: ProviderContext = { env, log };
  if (env.GEMINI_API_KEY && env.GEMINI_SUMMARIES_ENABLED) return new GeminiSummarizer(ctx);
  return null;
}

/** All provider ids the system knows about (including unconfigured ones). */
export const ALL_PROVIDER_IDS = [
  'brsapi',
  'navasan',
  'brsapi-tsetmc',
  'frankfurter',
  'metalsdev',
  'alphavantage',
  'coingecko',
  'fred',
  'finnhub',
  'eia',
] as const;

export function isProviderConfigured(providerId: string, env: AppEnv): boolean {
  switch (providerId) {
    case 'brsapi':
    case 'brsapi-tsetmc':
      return Boolean(env.BRSAPI_API_KEY);
    case 'navasan':
      return Boolean(env.NAVASAN_API_KEY);
    case 'metalsdev':
      return Boolean(env.METALSDEV_API_KEY);
    case 'alphavantage':
      return Boolean(env.ALPHAVANTAGE_API_KEY);
    case 'fred':
      return Boolean(env.FRED_API_KEY);
    case 'finnhub':
      return Boolean(env.FINNHUB_API_KEY);
    case 'eia':
      return Boolean(env.EIA_API_KEY);
    case 'coingecko':
    case 'frankfurter':
      return true; // keyless
    default:
      return false;
  }
}

export function missingConfigFor(providerId: string, env: AppEnv): string[] {
  switch (providerId) {
    case 'brsapi':
    case 'brsapi-tsetmc':
      return env.BRSAPI_API_KEY ? [] : ['BRSAPI_API_KEY'];
    case 'navasan':
      return env.NAVASAN_API_KEY ? [] : ['NAVASAN_API_KEY'];
    case 'metalsdev':
      return env.METALSDEV_API_KEY ? [] : ['METALSDEV_API_KEY'];
    case 'alphavantage':
      return env.ALPHAVANTAGE_API_KEY ? [] : ['ALPHAVANTAGE_API_KEY'];
    case 'fred':
      return env.FRED_API_KEY ? [] : ['FRED_API_KEY'];
    case 'finnhub':
      return env.FINNHUB_API_KEY ? [] : ['FINNHUB_API_KEY'];
    case 'eia':
      return env.EIA_API_KEY ? [] : ['EIA_API_KEY'];
    default:
      return [];
  }
}

export type { MarketDataProvider, ProviderContext, LatestQuoteRequest, HistoricalRequest, ProviderHealth, ProviderUsageStatus } from './types.js';
export { ProviderError, ProviderRateLimitedError, ProviderTimeoutError, fetchJson, isRetryableError } from './http.js';
export { quoteChecksum, toDecimalString, toIsoTimestamp, jalaliToIso } from './normalize.js';
export { BrsApiProvider, NavasanProvider, BrsApiTsetmcProvider, FrankfurterProvider, MetalsDevProvider, AlphaVantageProvider, CoinGeckoProvider, FredProvider };
