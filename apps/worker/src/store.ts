import { prisma } from '@sarmaye/database';
import type { NormalizedQuote } from '@sarmaye/shared';
import { Prisma } from '@prisma/client';

export { prisma };

/**
 * Database write layer for the worker. All provider data reaches the DB here.
 */

/** Load canonical-symbol -> external-symbol mapping for a provider (by adapter code). */
export async function loadProviderMapping(providerCode: string): Promise<Record<string, string>> {
  const provider = await prisma.provider.findUnique({ where: { code: providerCode } });
  if (!provider) return {};
  const rows = await prisma.providerAsset.findMany({
    where: { providerId: provider.id, enabled: true, asset: { enabled: true } },
    include: { asset: { select: { symbol: true, quoteCurrency: true } } },
  });
  const mapping: Record<string, string> = {};
  for (const row of rows) mapping[row.asset.symbol] = row.externalSymbol;
  return mapping;
}

/** Load provider row by code. */
export async function getProviderByCode(code: string) {
  return prisma.provider.findUnique({ where: { code } });
}

interface StoredQuote {
  assetId: string;
  price: Prisma.Decimal;
  bid: Prisma.Decimal | null;
  ask: Prisma.Decimal | null;
  open: Prisma.Decimal | null;
  high: Prisma.Decimal | null;
  low: Prisma.Decimal | null;
  previousClose: Prisma.Decimal | null;
  changeAbsolute: Prisma.Decimal | null;
  changePercent: Prisma.Decimal | null;
  volume: Prisma.Decimal | null;
  marketCap: Prisma.Decimal | null;
  circulatingSupply: Prisma.Decimal | null;
  marketTimestamp: Date | null;
  receivedAt: Date;
  freshness: string;
  rawChecksum: string | null;
  rawMetadata: Prisma.InputJsonValue | typeof Prisma.DbNull;
}

function toDecimal(value: string | null | undefined): Prisma.Decimal | null {
  if (value === null || value === undefined) return null;
  try {
    return new Prisma.Decimal(value);
  } catch {
    return null;
  }
}

/**
 * Store normalized quotes: upsert latest + insert snapshot with duplicate
 * protection. marketTimestamp collisions are skipped (unique index), which
 * prevents duplicate snapshots for the same asset, provider and timestamp.
 * Returns { quotesStored, snapshotsInserted, assetsProcessed }.
 */
export async function storeQuotes(
  providerId: string,
  quotes: NormalizedQuote[],
  assetIdBySymbol: Map<string, string>
): Promise<{ quotesStored: number; snapshotsInserted: number; assetsProcessed: number }> {
  let quotesStored = 0;
  let snapshotsInserted = 0;
  const processed = new Set<string>();

  for (const q of quotes) {
    const assetId = assetIdBySymbol.get(q.symbol);
    if (!assetId) continue; // unknown symbol — skip silently (logged by caller)
    processed.add(q.symbol);

    const data: StoredQuote = {
      assetId,
      price: toDecimal(q.price)!,
      bid: toDecimal(q.bid),
      ask: toDecimal(q.ask),
      open: toDecimal(q.open),
      high: toDecimal(q.high),
      low: toDecimal(q.low),
      previousClose: toDecimal(q.previousClose),
      changeAbsolute: toDecimal(q.changeAbsolute),
      changePercent: toDecimal(q.changePercent),
      volume: toDecimal(q.volume),
      marketCap: toDecimal(q.marketCap),
      circulatingSupply: toDecimal(q.circulatingSupply),
      marketTimestamp: q.marketTimestamp ? new Date(q.marketTimestamp) : null,
      receivedAt: new Date(q.receivedAt),
      freshness: q.freshness,
      rawChecksum: q.rawChecksum ?? null,
      rawMetadata: (q.rawMetadata as Prisma.InputJsonValue) ?? Prisma.DbNull,
    };

    await prisma.latestQuote.upsert({
      where: { assetId_providerId: { assetId, providerId } },
      update: data,
      create: { ...data, providerId },
    });
    quotesStored += 1;

    // Snapshot: skip when marketTimestamp already exists (dedup guard).
    if (data.marketTimestamp) {
      try {
        await prisma.quoteSnapshot.create({ data: { ...data, providerId } });
        snapshotsInserted += 1;
      } catch (err: unknown) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
          // duplicate snapshot — expected on repeated ticks with same market timestamp
        } else {
          throw err;
        }
      }
    }
  }
  return { quotesStored, snapshotsInserted, assetsProcessed: processed.size };
}

/** Record an ingestion run (job-level observability). */
export async function recordRun(input: {
  providerId: string;
  jobType: string;
  status: 'started' | 'success' | 'failed' | 'partial' | 'skipped';
  assetsProcessed?: number;
  quotesStored?: number;
  errorMessage?: string;
  metadata?: Prisma.InputJsonValue;
}): Promise<void> {
  await prisma.ingestionRun.create({
    data: {
      providerId: input.providerId,
      jobType: input.jobType,
      status: input.status,
      assetsProcessed: input.assetsProcessed ?? 0,
      quotesStored: input.quotesStored ?? 0,
      errorMessage: input.errorMessage,
      metadata: input.metadata ?? undefined,
      startedAt: new Date(),
      finishedAt: new Date(),
    },
  });
}

/** Increment provider usage counters for today. */
export async function recordUsage(
  providerId: string,
  delta: { requests?: number; successes?: number; failures?: number },
  now = new Date()
): Promise<void> {
  const date = now.toISOString().slice(0, 10);
  await prisma.providerUsage.upsert({
    where: { providerId_date: { providerId, date } },
    update: {
      requestCount: { increment: delta.requests ?? 0 },
      successCount: { increment: delta.successes ?? 0 },
      failureCount: { increment: delta.failures ?? 0 },
      lastRequestAt: now,
    },
    create: {
      providerId,
      date,
      requestCount: delta.requests ?? 0,
      successCount: delta.successes ?? 0,
      failureCount: delta.failures ?? 0,
      lastRequestAt: now,
    },
  });
}

export async function getUsageToday(providerId: string, now = new Date()): Promise<{
  requestCount: number;
  successCount: number;
  failureCount: number;
}> {
  const date = now.toISOString().slice(0, 10);
  const row = await prisma.providerUsage.findUnique({
    where: { providerId_date: { providerId, date } },
  });
  return {
    requestCount: row?.requestCount ?? 0,
    successCount: row?.successCount ?? 0,
    failureCount: row?.failureCount ?? 0,
  };
}

/** Record a provider health check. */
export async function recordHealth(
  providerId: string,
  status: string,
  latencyMs: number | null,
  errorMessage: string | null,
  consecutiveFailures: number
): Promise<void> {
  await prisma.providerHealthCheck.create({
    data: { providerId, status, latencyMs, errorMessage, consecutiveFailures },
  });
}

/** Mark quotes as stale when older than the per-provider staleness threshold. */
export async function markStaleQuotes(
  providerId: string,
  staleAfterMs: number,
  now = new Date()
): Promise<number> {
  const cutoff = new Date(now.getTime() - staleAfterMs);
  const result = await prisma.latestQuote.updateMany({
    where: { providerId, receivedAt: { lt: cutoff }, freshness: { not: 'stale' } },
    data: { freshness: 'stale' },
  });
  return result.count;
}

/** Mark an asset as first-collected when it has its first quote. */
export async function ensureFirstCollectedAt(assetId: string): Promise<void> {
  await prisma.asset.updateMany({
    where: { id: assetId, firstCollectedAt: null },
    data: { firstCollectedAt: new Date() },
  });
}

/** Prune raw snapshots older than retention (candles are kept). */
export async function pruneSnapshots(providerIds: string[], retentionDays: number): Promise<number> {
  const cutoff = new Date(Date.now() - retentionDays * 86_400_000);
  const result = await prisma.quoteSnapshot.deleteMany({
    where: { receivedAt: { lt: cutoff }, providerId: { in: providerIds } },
  });
  return result.count;
}

/** Count assets whose latest quote is stale. */
export async function countStaleAssets(): Promise<number> {
  return prisma.latestQuote.count({ where: { freshness: 'stale' } });
}

export async function disconnectDb(): Promise<void> {
  await prisma.$disconnect();
}
