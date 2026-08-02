import { prisma } from '@sarmaye/database';
import type { Logger } from 'pino';
import type { AppEnv } from '@sarmaye/shared';
import type { MarketDataProvider } from '@sarmaye/providers';
import { ProviderRateLimitedError } from '@sarmaye/providers';

/**
 * Provider-history seeding job.
 * - Frankfurter: incremental daily sync for global currencies (immutable
 *   historical reference rates are cached aggressively).
 * - CoinGecko: incremental daily sync of daily candles per crypto asset,
 *   paced to respect public rate limits.
 * Provider history is stored as 1d candles in the same table as locally
 * aggregated candles, so charts are uniform.
 */

const DAY_MS = 86_400_000;

export async function runHistorySeeding(
  providers: MarketDataProvider[],
  env: AppEnv,
  log: Logger,
  abortSignal: AbortSignal
): Promise<{ provider: string; candles: number }[]> {
  const results: { provider: string; candles: number }[] = [];
  for (const provider of providers) {
    if (abortSignal.aborted) break;
    if (!['frankfurter', 'coingecko'].includes(provider.id)) continue;
    try {
      const candles = await seedProviderHistory(provider, log, abortSignal);
      results.push({ provider: provider.id, candles });
      if (candles > 0) log.info({ provider: provider.id, candles }, 'history seed complete');
    } catch (err) {
      log.warn({ provider: provider.id, err: err instanceof Error ? err.message : String(err) }, 'history seed failed');
    }
  }
  return results;
}

async function seedProviderHistory(
  provider: MarketDataProvider,
  log: Logger,
  abortSignal: AbortSignal
): Promise<number> {
  const providerRow = await prisma.provider.findUnique({ where: { code: provider.id } });
  if (!providerRow || !providerRow.enabled) return 0;

  const mappings = await prisma.providerAsset.findMany({
    where: { providerId: providerRow.id, enabled: true, asset: { enabled: true } },
    include: { asset: { select: { symbol: true, firstCollectedAt: true } } },
  });
  if (mappings.length === 0) return 0;

  let total = 0;
  for (const m of mappings) {
    if (abortSignal.aborted) break;
    const asset = m.asset;

    // Incremental: only fetch what we don't have yet.
    const lastCandle = await prisma.ohlcCandle.findFirst({
      where: { assetId: m.assetId, interval: '1d', providerId: providerRow.id },
      orderBy: { startTime: 'desc' },
      select: { startTime: true },
    });

    const end = new Date();
    const start = lastCandle ? new Date(lastCandle.startTime.getTime() + DAY_MS) : new Date(end.getTime() - 365 * DAY_MS);
    if (start >= end) continue; // up to date

    let points: Awaited<ReturnType<MarketDataProvider['getHistoricalData']>> = [];
    try {
      points = await provider.getHistoricalData({
        symbol: asset.symbol,
        externalSymbol: m.externalSymbol,
        start,
        end,
      });
    } catch (err) {
      // Rate limits: stop the whole seed run; remaining assets resume next run.
      if (err instanceof ProviderRateLimitedError) {
        log.warn({ provider: provider.id, asset: asset.symbol }, 'history seed rate limited, deferring remainder');
        break;
      }
      log.warn({ provider: provider.id, asset: asset.symbol, err: err instanceof Error ? err.message : String(err) }, 'history seed failed for asset');
      continue;
    }

    let stored = 0;
    for (const p of points) {
      const startTime = new Date(p.time);
      const endTime = new Date(startTime.getTime() + (p.interval === '1h' ? 3_600_000 : DAY_MS));
      await prisma.ohlcCandle.upsert({
        where: {
          assetId_interval_startTime: { assetId: m.assetId, interval: p.interval, startTime },
        },
        update: {
          open: p.open,
          high: p.high,
          low: p.low,
          close: p.close,
          volume: p.volume ?? null,
          sampleCount: 1,
          isFinal: true,
          endTime,
          providerId: providerRow.id,
        },
        create: {
          assetId: m.assetId,
          interval: p.interval,
          startTime,
          endTime,
          open: p.open,
          high: p.high,
          low: p.low,
          close: p.close,
          volume: p.volume ?? null,
          sampleCount: 1,
          isFinal: true,
          providerId: providerRow.id,
        },
      });
      stored += 1;
    }
    total += stored;
    if (provider.id === 'coingecko') {
      // Pace public-limit calls; sleep between assets (8s keeps us under the
      // keyless rate limit; remaining assets resume on the next run).
      await new Promise((r) => setTimeout(r, 8000));
    }
  }
  return total;
}
