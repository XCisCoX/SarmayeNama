import { tryAdvisoryLock, checkDatabaseHealth } from '@sarmaye/database';
import { buildRegistry, type MarketDataProvider } from '@sarmaye/providers';
import { loadConfig, providerIntervalMs, withJitter } from './config.js';
import { CircuitBreaker } from './circuit-breaker.js';
import { Scheduler, jittered } from './scheduler.js';
import { runIngestion, runStaleMarking } from './jobs/ingest.js';
import { runAggregation } from './jobs/aggregate.js';
import { runHistorySeeding } from './jobs/history.js';
import { runMarketSessions, runPrune } from './jobs/sessions.js';
import { disconnectDb, prisma } from './store.js';

const { env, log, lockId } = loadConfig();

async function main(): Promise<void> {
  log.info('sarmaye worker starting');

  // ---- Database readiness ----
  for (let i = 0; i < 30; i += 1) {
    if (await checkDatabaseHealth()) break;
    log.warn('database not ready, retrying…');
    await new Promise((r) => setTimeout(r, 2000));
    if (i === 29) throw new Error('database unreachable after 60s');
  }

  // ---- Advisory lock: prevent duplicate workers ----
  let releaseLock: (() => Promise<void>) | null = null;
  for (let i = 0; i < 5; i += 1) {
    releaseLock = await tryAdvisoryLock(lockId);
    if (releaseLock) break;
    log.warn('another worker instance holds the advisory lock, retrying…');
    await new Promise((r) => setTimeout(r, 3000));
  }
  if (!releaseLock) {
    log.error('advisory lock not acquired — another worker is running. Exiting.');
    process.exit(1);
  }
  log.info('advisory lock acquired');

  const abortController = new AbortController();
  const circuit = new CircuitBreaker(env.CIRCUIT_FAILURE_THRESHOLD, env.CIRCUIT_COOLDOWN_MS);
  const providers: MarketDataProvider[] = buildRegistry(env, (level, msg, meta) => log[level](meta ?? {}, msg));

  // ---- Provider ingestion jobs ----
  const scheduler = new Scheduler(log);
  for (const provider of providers) {
    scheduler.schedule({
      name: `ingest:${provider.id}`,
      run: async () => {
        await runIngestion(provider, { env, log, circuit, abortSignal: abortController.signal });
        await runStaleMarking(provider.id, env, log);
      },
      intervalMs: () => withJitter(providerIntervalMs(provider.id, env)),
    });
  }

  // ---- Aggregation job ----
  scheduler.schedule({
    name: 'aggregate',
    run: async () => {
      await runAggregation(env, log);
    },
    intervalMs: () => jittered(env.AGGREGATE_INTERVAL_MS, 0.05),
  });

  // ---- Provider history seeding (frankfurter + coingecko), daily-ish ----
  scheduler.schedule({
    name: 'history-seed',
    run: async () => {
      await runHistorySeeding(providers, env, log, abortController.signal);
    },
    intervalMs: () => jittered(24 * 3600_000, 0.1),
    runOnStart: true,
  });

  // ---- Market sessions (every 15 min) ----
  scheduler.schedule({
    name: 'sessions',
    run: async () => {
      await runMarketSessions(log);
    },
    intervalMs: () => 15 * 60_000,
  });

  // ---- Prune raw snapshots beyond retention (daily) ----
  scheduler.schedule({
    name: 'prune',
    run: async () => {
      const providerIds = (await prisma.provider.findMany({ select: { id: true } })).map((p: { id: string }) => p.id);
      await runPrune(env.SNAPSHOT_RETENTION_DAYS, providerIds, log);
    },
    intervalMs: () => jittered(24 * 3600_000, 0.1),
    runOnStart: false,
  });

  // ---- Graceful shutdown ----
  const shutdown = async (signal: string) => {
    log.info({ signal }, 'shutting down');
    abortController.abort();
    await scheduler.stop();
    await releaseLock?.();
    await disconnectDb();
    process.exit(0);
  };
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

main().catch((err) => {
  log.fatal({ err: err instanceof Error ? err.message : String(err) }, 'worker crashed');
  process.exit(1);
});
