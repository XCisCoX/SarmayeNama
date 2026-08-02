import { PrismaClient } from '@prisma/client';

/**
 * Shared Prisma client. In dev with hot reload we avoid creating many clients.
 * Use `getDb()` everywhere instead of instantiating PrismaClient directly.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

/** Acquire a Postgres advisory lock; returns a release function. */
export async function acquireAdvisoryLock(lockId: number): Promise<() => Promise<void>> {
  await prisma.$executeRaw`SELECT pg_advisory_lock(${lockId})`;
  let released = false;
  return async () => {
    if (released) return;
    released = true;
    await prisma.$executeRaw`SELECT pg_advisory_unlock(${lockId})`;
  };
}

/** Try to acquire a lock without blocking; returns null if busy. */
export async function tryAdvisoryLock(lockId: number): Promise<(() => Promise<void>) | null> {
  const rows = await prisma.$queryRaw<{ locked: boolean }[]>`
    SELECT pg_try_advisory_lock(${lockId}) AS locked`;
  if (!rows[0]?.locked) return null;
  let released = false;
  return async () => {
    if (released) return;
    released = true;
    await prisma.$executeRaw`SELECT pg_advisory_unlock(${lockId})`;
  };
}
