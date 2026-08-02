import { prisma } from '@sarmaye/database';
import { dec, type OhlcInput } from '@sarmaye/market-core';
import type { Logger } from 'pino';
import type { AppEnv } from '@sarmaye/shared';

/** Compute a single OHLC bar from ticks that all belong to one bucket. */
function ohlcFromTicks(ticks: OhlcInput[]) {
  if (ticks.length === 0) return null;
  let open = dec(ticks[0]!.price);
  let high = open;
  let low = open;
  let close = open;
  let volume = dec(0);
  let count = 0;
  for (const t of ticks) {
    const p = dec(t.price);
    if (p.lt(low)) low = p;
    if (p.gt(high)) high = p;
    close = p;
    volume = volume.plus(dec(t.volume ?? 0));
    count += 1;
  }
  return { open, high, low, close, volume, sampleCount: count };
}

/**
 * OHLC aggregation job.
 * Transforms raw snapshots into 5m / 15m / 1h / 1d / 1w / 1mo candles.
 * Bucketing is calendar-aware for weeks (Monday) and months (UTC month start);
 * intra-day intervals are epoch-aligned.
 */

const INTERVALS = ['5m', '15m', '1h', '1d', '1w', '1mo'] as const;
type Interval = (typeof INTERVALS)[number];

const DAY_MS = 86_400_000;
const WEEK_MS = 7 * DAY_MS;

function bucketStart(t: number, interval: Interval): number {
  switch (interval) {
    case '5m':
      return Math.floor(t / 300_000) * 300_000;
    case '15m':
      return Math.floor(t / 900_000) * 900_000;
    case '1h':
      return Math.floor(t / 3_600_000) * 3_600_000;
    case '1d':
      return Math.floor(t / DAY_MS) * DAY_MS;
    case '1w': {
      // Monday-aligned weeks
      const mondayOffset = 3 * DAY_MS; // 1970-01-01 was a Thursday
      return Math.floor((t - mondayOffset) / WEEK_MS) * WEEK_MS + mondayOffset;
    }
    case '1mo': {
      const d = new Date(t);
      return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1);
    }
  }
}

function bucketEnd(start: number, interval: Interval): number {
  if (interval === '1mo') {
    const d = new Date(start);
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1);
  }
  if (interval === '1w') return start + WEEK_MS;
  if (interval === '1d') return start + DAY_MS;
  if (interval === '1h') return start + 3_600_000;
  if (interval === '15m') return start + 900_000;
  return start + 300_000;
}

export async function runAggregation(env: AppEnv, log: Logger, now = new Date()): Promise<number> {
  const assets = await prisma.asset.findMany({ where: { enabled: true }, select: { id: true, symbol: true } });
  let candlesUpserted = 0;

  for (const asset of assets) {
    for (const interval of INTERVALS) {
      // Find the last aggregated candle start so we only re-aggregate the tail.
      const last = await prisma.ohlcCandle.findFirst({
        where: { assetId: asset.id, interval },
        orderBy: { startTime: 'desc' },
        select: { startTime: true },
      });
      const since = last ? last.startTime.getTime() : now.getTime() - 30 * DAY_MS; // bootstrap: last 30 days
      const sinceDate = new Date(since);

      const snapshots = await prisma.quoteSnapshot.findMany({
        where: {
          assetId: asset.id,
          receivedAt: { gte: sinceDate },
        },
        select: { receivedAt: true, price: true, providerId: true },
        orderBy: { receivedAt: 'asc' },
      });
      if (snapshots.length === 0) continue;

      const inputs: OhlcInput[] = snapshots.map((s) => ({
        time: s.receivedAt.getTime(),
        price: s.price.toNumber(),
      }));

      // Group by bucket (calendar-aware), then aggregate each bucket.
      const grouped = new Map<number, OhlcInput[]>();
      for (const input of inputs) {
        const t = typeof input.time === 'number' ? input.time : input.time.getTime();
        const start = bucketStart(t, interval);
        const arr = grouped.get(start) ?? [];
        arr.push(input);
        grouped.set(start, arr);
      }

      for (const [start, ticks] of grouped) {
        const bar = ohlcFromTicks(ticks);
        if (!bar) continue;
        const end = bucketEnd(start, interval);
        const isFinal = end <= now.getTime();
        const providerIds = [...new Set(snapshots.map((s) => s.providerId))];

        await prisma.ohlcCandle.upsert({
          where: { assetId_interval_startTime: { assetId: asset.id, interval, startTime: new Date(start) } },
          update: {
            open: bar.open.toDecimalPlaces(8).toString(),
            high: bar.high.toDecimalPlaces(8).toString(),
            low: bar.low.toDecimalPlaces(8).toString(),
            close: bar.close.toDecimalPlaces(8).toString(),
            volume: bar.volume.toDecimalPlaces(8).toString(),
            sampleCount: bar.sampleCount,
            isFinal,
            endTime: new Date(end),
          },
          create: {
            assetId: asset.id,
            interval,
            startTime: new Date(start),
            endTime: new Date(end),
            open: bar.open.toDecimalPlaces(8).toString(),
            high: bar.high.toDecimalPlaces(8).toString(),
            low: bar.low.toDecimalPlaces(8).toString(),
            close: bar.close.toDecimalPlaces(8).toString(),
            volume: bar.volume.toDecimalPlaces(8).toString(),
            sampleCount: bar.sampleCount,
            isFinal,
            providerId: providerIds[0] ?? null,
          },
        });
        candlesUpserted += 1;
      }
    }
  }
  if (candlesUpserted > 0) {
    log.info({ candlesUpserted, assets: assets.length }, 'aggregation complete');
  }
  return candlesUpserted;
}
