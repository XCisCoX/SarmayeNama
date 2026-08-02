import type { AppEnv } from '@sarmaye/shared';
import { NormalizedQuoteSchema, type NormalizedQuote } from '@sarmaye/shared';
import type { MarketDataProvider } from '@sarmaye/providers';
import { isRetryableError, ProviderRateLimitedError } from '@sarmaye/providers';
import type { Logger } from 'pino';
import type { CircuitBreaker } from '../circuit-breaker.js';
import {
  getProviderByCode,
  getUsageToday,
  loadProviderMapping,
  recordHealth,
  recordRun,
  recordUsage,
  storeQuotes,
  ensureFirstCollectedAt,
} from '../store.js';
import { prisma } from '@sarmaye/database';
import { providerDailyQuota, staleAfterMs } from '../config.js';

export interface IngestJobOptions {
  env: AppEnv;
  log: Logger;
  circuit: CircuitBreaker;
  abortSignal: AbortSignal;
}

export interface IngestResult {
  providerId: string;
  status: 'success' | 'failed' | 'skipped';
  quotesStored: number;
  snapshotsInserted: number;
  assetsProcessed: number;
  error?: string;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Run one ingestion cycle for a provider: quota check, circuit check,
 * fetch, validate, store, and record usage/health/run observability.
 */
export async function runIngestion(
  provider: MarketDataProvider,
  opts: IngestJobOptions
): Promise<IngestResult> {
  const { env, log, circuit, abortSignal } = opts;
  const providerId = provider.id;

  // Circuit breaker
  if (circuit.isOpen(providerId)) {
    log.warn({ provider: providerId }, 'circuit open, skipping ingestion');
    await recordHealth(providerId, 'circuit_open', null, circuit.getState(providerId).lastError, circuit.getState(providerId).failures);
    return { providerId, status: 'skipped', quotesStored: 0, snapshotsInserted: 0, assetsProcessed: 0 };
  }

  const dbProvider = await getProviderByCode(providerId);
  if (!dbProvider) {
    log.error({ provider: providerId }, 'provider not found in database');
    return { providerId, status: 'skipped', quotesStored: 0, snapshotsInserted: 0, assetsProcessed: 0 };
  }
  // Store calls take the provider's DB id (FK), not the adapter code.
  const dbProviderId = dbProvider.id;

  // Quota check
  const quota = providerDailyQuota(providerId, env) ?? dbProvider.dailyQuota;
  if (quota) {
    const usage = await getUsageToday(dbProviderId);
    if (usage.requestCount >= quota) {
      log.info({ provider: providerId, used: usage.requestCount, quota }, 'daily quota exhausted, skipping');
      await recordHealth(dbProviderId, 'quota_exhausted', null, `Daily quota reached (${usage.requestCount}/${quota})`, circuit.getState(providerId).failures);
      return { providerId, status: 'skipped', quotesStored: 0, snapshotsInserted: 0, assetsProcessed: 0 };
    }
  }

  await recordRun({ providerId: dbProviderId, jobType: 'quotes', status: 'started' });

  try {
    if (abortSignal.aborted) throw new Error('aborted');
    // Count the request only when we actually attempt to reach the provider.
    await recordUsage(dbProviderId, { requests: 1 });
    const mapping = await loadProviderMapping(providerId);
    const symbols = Object.keys(mapping);
    if (symbols.length === 0) {
      log.warn({ provider: providerId }, 'no mapped assets for provider, skipping');
      await recordRun({ providerId: dbProviderId, jobType: 'quotes', status: 'success' });
      return { providerId, status: 'success', quotesStored: 0, snapshotsInserted: 0, assetsProcessed: 0 };
    }

    const started = Date.now();
    const quotes = await provider.getLatestQuotes({ mapping });
    const latencyMs = Date.now() - started;

    // Validate every quote with Zod; drop invalid ones (never store garbage).
    const valid: NormalizedQuote[] = [];
    for (const q of quotes) {
      const parsed = NormalizedQuoteSchema.safeParse(q);
      if (parsed.success) valid.push(parsed.data);
      else log.warn({ provider: providerId, symbol: q.symbol }, 'invalid quote dropped', { issues: parsed.error.issues });
    }

    // assetId lookup for the quotes' symbols
    const assets = await prisma.asset.findMany({
      where: { symbol: { in: valid.map((q) => q.symbol) } },
      select: { id: true, symbol: true },
    });
    const assetIdBySymbol = new Map(assets.map((a) => [a.symbol, a.id]));
    for (const id of assetIdBySymbol.values()) await ensureFirstCollectedAt(id);

    const { quotesStored, snapshotsInserted, assetsProcessed } = await storeQuotes(dbProviderId, valid, assetIdBySymbol);

    circuit.recordSuccess(providerId);
    await recordUsage(dbProviderId, { successes: 1 });
    await recordHealth(dbProviderId, 'ok', latencyMs, null, circuit.getState(providerId).failures);
    await recordRun({
      providerId: dbProviderId,
      jobType: 'quotes',
      status: 'success',
      assetsProcessed,
      quotesStored,
      metadata: { latencyMs, snapshotsInserted, quoteCount: valid.length },
    });
    log.info(
      { provider: providerId, assetsProcessed, quotesStored, snapshotsInserted, latencyMs },
      'ingestion success'
    );
    return { providerId, status: 'success', quotesStored, snapshotsInserted, assetsProcessed };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const retryable = isRetryableError(err);
    const rateLimited = err instanceof ProviderRateLimitedError;
    // Missing API keys are a configuration state, not an outage: they never
    // open the circuit and don't consume quota.
    const notConfigured = /not configured/i.test(message);
    if (notConfigured) {
      await recordHealth(dbProviderId, 'not_configured', null, message.slice(0, 200), 0);
      await recordRun({
        providerId: dbProviderId,
        jobType: 'quotes',
        status: 'skipped',
        errorMessage: message.slice(0, 200),
        metadata: { reason: 'not_configured' },
      });
      log.warn({ provider: providerId, err: message }, 'ingestion skipped: provider not configured');
      return { providerId, status: 'skipped', quotesStored: 0, snapshotsInserted: 0, assetsProcessed: 0 };
    }
    circuit.recordFailure(providerId, message);
    await recordUsage(dbProviderId, { failures: 1 });
    await recordHealth(
      dbProviderId,
      rateLimited ? 'quota_exhausted' : 'down',
      null,
      message.slice(0, 500),
      circuit.getState(providerId).failures
    );
    await recordRun({
      providerId: dbProviderId,
      jobType: 'quotes',
      status: 'failed',
      errorMessage: message.slice(0, 500),
      metadata: { retryable, rateLimited },
    });
    log.error({ provider: providerId, err: message, retryable, rateLimited }, 'ingestion failed');
    return { providerId, status: 'failed', quotesStored: 0, snapshotsInserted: 0, assetsProcessed: 0, error: message };
  }
}

/** Stale marking pass for one provider (last-known-good stays visible). */
export async function runStaleMarking(providerCode: string, env: AppEnv, log: Logger): Promise<number> {
  const dbProvider = await getProviderByCode(providerCode);
  if (!dbProvider) return 0;
  const count = await prisma.latestQuote.updateMany({
    where: {
      providerId: dbProvider.id,
      freshness: { not: 'stale' },
      receivedAt: { lt: new Date(Date.now() - staleAfterMs(providerCode, env)) },
    },
    data: { freshness: 'stale' },
  });
  if (count.count > 0) log.warn({ provider: providerCode, stale: count.count }, 'quotes marked stale');
  return count.count;
}

export { sleep };
