import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { PrismaClient, Prisma } from '@prisma/client';

/**
 * Integration tests against a real PostgreSQL database (sarmaye_test).
 * Run with: DATABASE_URL=postgresql://sarmaye:sarmaye@localhost:5432/sarmaye_test
 * Covers: ingestion storage, duplicate prevention, latest-quote upsert.
 */

const prisma = new PrismaClient();

const TEST_PROVIDER = 'itest-provider';
const TEST_SYMBOL = 'ITEST_ASSET';

beforeAll(async () => {
  await prisma.provider.upsert({
    where: { code: TEST_PROVIDER },
    update: {},
    create: { code: TEST_PROVIDER, displayName: 'Integration Test Provider', assetClasses: ['global_market'], baseUrl: 'https://example.test', delayLabel: 'Live' },
  });
  await prisma.asset.upsert({
    where: { symbol: TEST_SYMBOL },
    update: {},
    create: {
      symbol: TEST_SYMBOL,
      nameFa: 'دارایی تست',
      nameEn: 'Test Asset',
      assetClass: 'global_market',
      market: 'global',
      quoteCurrency: 'USD',
      unit: '1 test',
      precision: 2,
      sortOrder: 999,
      icon: 'spark',
    },
  });
});

afterAll(async () => {
  const provider = await prisma.provider.findUnique({ where: { code: TEST_PROVIDER } });
  if (provider) {
    await prisma.latestQuote.deleteMany({ where: { providerId: provider.id } });
    await prisma.quoteSnapshot.deleteMany({ where: { providerId: provider.id } });
    await prisma.providerHealthCheck.deleteMany({ where: { providerId: provider.id } });
    await prisma.ingestionRun.deleteMany({ where: { providerId: provider.id } });
    await prisma.providerUsage.deleteMany({ where: { providerId: provider.id } });
    await prisma.provider.delete({ where: { id: provider.id } });
  }
  await prisma.asset.deleteMany({ where: { symbol: TEST_SYMBOL } });
  await prisma.$disconnect();
});

describe('Database ingestion', () => {
  it('stores a latest quote and a snapshot', async () => {
    const provider = await prisma.provider.findUniqueOrThrow({ where: { code: TEST_PROVIDER } });
    const asset = await prisma.asset.findUniqueOrThrow({ where: { symbol: TEST_SYMBOL } });
    const ts = new Date('2026-07-31T10:00:00Z');
    await prisma.latestQuote.upsert({
      where: { assetId_providerId: { assetId: asset.id, providerId: provider.id } },
      update: { price: new Prisma.Decimal('123.45'), marketTimestamp: ts, freshness: 'live', receivedAt: new Date() },
      create: { assetId: asset.id, providerId: provider.id, price: new Prisma.Decimal('123.45'), marketTimestamp: ts, freshness: 'live', receivedAt: new Date() },
    });
    await prisma.quoteSnapshot.create({
      data: { assetId: asset.id, providerId: provider.id, price: new Prisma.Decimal('123.45'), marketTimestamp: ts, receivedAt: new Date() },
    });
    const latest = await prisma.latestQuote.findUnique({
      where: { assetId_providerId: { assetId: asset.id, providerId: provider.id } },
    });
    expect(latest!.price.toString()).toBe('123.45');
  });

  it('prevents duplicate snapshots for the same asset, provider and timestamp', async () => {
    const provider = await prisma.provider.findUniqueOrThrow({ where: { code: TEST_PROVIDER } });
    const asset = await prisma.asset.findUniqueOrThrow({ where: { symbol: TEST_SYMBOL } });
    const ts = new Date('2026-07-31T10:05:00Z');
    await prisma.quoteSnapshot.create({
      data: { assetId: asset.id, providerId: provider.id, price: new Prisma.Decimal('99'), marketTimestamp: ts, receivedAt: new Date() },
    });
    await expect(
      prisma.quoteSnapshot.create({
        data: { assetId: asset.id, providerId: provider.id, price: new Prisma.Decimal('99'), marketTimestamp: ts, receivedAt: new Date() },
      })
    ).rejects.toMatchObject({ code: 'P2002' });
    const count = await prisma.quoteSnapshot.count({
      where: { assetId: asset.id, providerId: provider.id, marketTimestamp: ts },
    });
    expect(count).toBe(1);
  });

  it('upserts latest quote (one row per asset+provider)', async () => {
    const provider = await prisma.provider.findUniqueOrThrow({ where: { code: TEST_PROVIDER } });
    const asset = await prisma.asset.findUniqueOrThrow({ where: { symbol: TEST_SYMBOL } });
    const ts = new Date('2026-07-31T11:00:00Z');
    for (let i = 1; i <= 3; i += 1) {
      await prisma.latestQuote.upsert({
        where: { assetId_providerId: { assetId: asset.id, providerId: provider.id } },
        update: { price: new Prisma.Decimal(String(100 + i)), marketTimestamp: ts, receivedAt: new Date() },
        create: { assetId: asset.id, providerId: provider.id, price: new Prisma.Decimal(String(100 + i)), marketTimestamp: ts, receivedAt: new Date() },
      });
    }
    const rows = await prisma.latestQuote.count({ where: { assetId: asset.id, providerId: provider.id } });
    expect(rows).toBe(1);
    const latest = await prisma.latestQuote.findUnique({
      where: { assetId_providerId: { assetId: asset.id, providerId: provider.id } },
    });
    expect(latest!.price.toString()).toBe('103');
  });
});
