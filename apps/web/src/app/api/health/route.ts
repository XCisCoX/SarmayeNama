import { NextResponse } from 'next/server';
import { checkDatabaseHealth } from '@sarmaye/database';
import { prisma } from '@sarmaye/database';
import { HealthResponseSchema } from '@sarmaye/shared';

export const dynamic = 'force-dynamic';

/** Public health endpoint: no sensitive details, just ok/degraded + counters. */
export async function GET(): Promise<NextResponse> {
  const dbOk = await checkDatabaseHealth();
  const [staleAssets, providers, providersDown] = dbOk
    ? await (async () => {
        const [stale, providerCount, healthRows] = await Promise.all([
          prisma.latestQuote.count({ where: { freshness: 'stale' } }),
          prisma.provider.count(),
          prisma.providerHealthCheck.findMany({
            orderBy: { checkedAt: 'desc' },
            take: 500,
          }),
        ]);
        // Latest check per provider decides its current state.
        const latest = new Map<string, string>();
        for (const h of healthRows) {
          if (!latest.has(h.providerId)) latest.set(h.providerId, h.status);
        }
        const down = [...latest.values()].filter((s) => s === 'down' || s === 'circuit_open').length;
        return [stale, providerCount, down] as const;
      })()
    : [0, 0, 0];
  const payload = {
    status: dbOk ? 'ok' : 'degraded',
    database: dbOk ? 'ok' : 'error',
    timestamp: new Date().toISOString(),
    staleAssets,
    providers,
    providersDown,
  };
  const parsed = HealthResponseSchema.safeParse(payload);
  return NextResponse.json(parsed.success ? parsed.data : payload, {
    status: dbOk ? 200 : 503,
    headers: { 'Cache-Control': 'no-store' },
  });
}
