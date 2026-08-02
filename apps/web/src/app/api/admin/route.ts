import { okResponse, errorResponse, withRequestId } from '@/lib/api-helpers';
import { checkDatabaseHealth } from '@sarmaye/database';
import { prisma } from '@sarmaye/database';
import { serverEnv } from '@/lib/server-data';
import { AdminQuerySchema } from '@sarmaye/shared';

export const dynamic = 'force-dynamic';

/**
 * Internal diagnostics — protected by ADMIN_SECRET. Never expose API keys or
 * connection strings here (only counts and statuses).
 */
export async function GET(req: Request): Promise<Response> {
  const requestId = withRequestId();
  const url = new URL(req.url);
  const parsed = AdminQuerySchema.safeParse({ secret: url.searchParams.get('secret') ?? '' });
  if (!parsed.success) return errorResponse('invalid_input', 'Missing secret', 400, requestId);

  const env = serverEnv();
  if (parsed.data.secret !== env.ADMIN_SECRET) {
    return errorResponse('unauthorized', 'Invalid admin secret', 401, requestId);
  }

  const db = (await checkDatabaseHealth()) ? 'ok' : 'error';
  const today = new Date().toISOString().slice(0, 10);
  const [providers, usage, staleAssets, lastRuns, dbRows] = await Promise.all([
    prisma.provider.findMany({ orderBy: { code: 'asc' } }),
    prisma.providerUsage.findMany({ where: { date: today } }),
    prisma.latestQuote.findMany({
      where: { freshness: 'stale' },
      include: { asset: { select: { symbol: true } } },
      orderBy: { receivedAt: 'asc' },
    }),
    prisma.ingestionRun.findMany({
      orderBy: { startedAt: 'desc' },
      take: 25,
      select: {
        providerId: true,
        jobType: true,
        status: true,
        startedAt: true,
        finishedAt: true,
        quotesStored: true,
        errorMessage: true,
      },
    }),
    Promise.all([
      prisma.provider.count(),
      prisma.asset.count(),
      prisma.quoteSnapshot.count(),
      prisma.ohlcCandle.count(),
      prisma.latestQuote.count(),
    ]),
  ]);

  const usageByProvider = new Map(usage.map((u) => [u.providerId, u]));
  const healthRows = await prisma.providerHealthCheck.findMany({
    orderBy: { checkedAt: 'desc' },
    take: 100,
  });
  const lastHealth = new Map<string, (typeof healthRows)[number]>();
  for (const h of healthRows) {
    if (!lastHealth.has(h.providerId)) lastHealth.set(h.providerId, h);
  }

  return okResponse({
    db,
    providers: providers.map((p) => {
      const h = lastHealth.get(p.id);
      return {
        code: p.code,
        displayName: p.displayName,
        status: h?.status ?? (p.enabled ? 'ok' : 'disabled'),
        latencyMs: h?.latencyMs ?? null,
        lastError: h && h.status !== 'ok' ? h.errorMessage : null,
        usageToday: {
          requests: usageByProvider.get(p.id)?.requestCount ?? 0,
          successes: usageByProvider.get(p.id)?.successCount ?? 0,
          failures: usageByProvider.get(p.id)?.failureCount ?? 0,
        },
        dailyQuota: p.dailyQuota,
      };
    }),
    staleAssets: staleAssets.map((q) => ({
      symbol: q.asset.symbol,
      ageMinutes: Math.round((Date.now() - q.receivedAt.getTime()) / 60_000),
    })),
    lastRuns: lastRuns.map((r) => ({
      ...r,
      startedAt: r.startedAt.toISOString(),
      finishedAt: r.finishedAt?.toISOString() ?? null,
    })),
    dbRows: {
      providers: dbRows[0],
      assets: dbRows[1],
      snapshots: dbRows[2],
      candles: dbRows[3],
      latestQuotes: dbRows[4],
    },
  });
}
