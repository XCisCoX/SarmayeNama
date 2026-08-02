/**
 * Idempotent seed: providers, asset catalog, aliases, provider-asset mapping,
 * market sessions and system settings. Safe to run repeatedly.
 */
import { PrismaClient } from '@prisma/client';
import {
  PROVIDER_META,
  SEED_ASSETS,
  CATEGORIES,
  type SeedAsset,
} from '@sarmaye/shared';

const prisma = new PrismaClient();

async function main() {
  // ---- Providers ----
  for (const meta of PROVIDER_META) {
    await prisma.provider.upsert({
      where: { code: meta.code },
      update: {
        displayName: meta.displayNameEn,
        description: meta.notesEn,
        assetClasses: [...meta.assetClasses],
        authType: meta.authType,
        baseUrl: meta.baseUrl,
        delayLabel: meta.delayLabel,
        refreshIntervalMs: meta.defaultRefreshMs,
        dailyQuota: meta.dailyQuota,
        attributionRequired: Boolean(meta.attribution),
        attributionText: meta.attribution,
        fallbackProviderCode: meta.fallbackProvider,
        enabled: meta.enabledByDefault,
        config: {
          notesFa: meta.notesFa,
          notesEn: meta.notesEn,
          envKey: meta.envKey,
          supportsHistory: meta.supportsHistory,
          defaultRefreshMs: meta.defaultRefreshMs,
        },
      },
      create: {
        code: meta.code,
        displayName: meta.displayNameEn,
        description: meta.notesEn,
        assetClasses: [...meta.assetClasses],
        authType: meta.authType,
        baseUrl: meta.baseUrl,
        delayLabel: meta.delayLabel,
        refreshIntervalMs: meta.defaultRefreshMs,
        dailyQuota: meta.dailyQuota,
        attributionRequired: Boolean(meta.attribution),
        attributionText: meta.attribution,
        fallbackProviderCode: meta.fallbackProvider,
        enabled: meta.enabledByDefault,
        isDefault: meta.code === 'brsapi' || meta.code === 'frankfurter' || meta.code === 'coingecko',
        config: {
          notesFa: meta.notesFa,
          notesEn: meta.notesEn,
          envKey: meta.envKey,
          supportsHistory: meta.supportsHistory,
          defaultRefreshMs: meta.defaultRefreshMs,
        },
      },
    });
  }

  // ---- Assets ----
  // Feature-flagged modules enable their assets only when the matching env
  // flag is set (so the worker's "enabled assets" mapping picks them up).
  const flagEnv = process.env;
  const globalMarketsOn = flagEnv.GLOBAL_MARKETS_ENABLED === 'true';
  const economicOn = flagEnv.ECONOMIC_INDICATORS_ENABLED === 'true';
  const iranianStocksOn = flagEnv.IRANIAN_STOCKS_ENABLED === 'true';

  for (const seed of SEED_ASSETS) {
    let enabled = seed.enabledByDefault !== false;
    if (/^(AV_|OIL_|GAS_|COPPER|WHEAT|CORN)/.test(seed.symbol)) enabled = globalMarketsOn;
    if (seed.symbol.startsWith('ECON_')) enabled = economicOn;
    if (seed.symbol.startsWith('TSETMC_')) enabled = iranianStocksOn;
    const asset = await prisma.asset.upsert({
      where: { symbol: seed.symbol },
      update: {
        nameFa: seed.nameFa,
        nameEn: seed.nameEn,
        assetClass: seed.assetClass,
        market: seed.market,
        quoteCurrency: seed.quoteCurrency,
        unit: seed.unit,
        precision: seed.precision,
        sortOrder: seed.sortOrder,
        icon: seed.icon,
        enabled,
        isDerived: seed.isDerived ?? false,
        derivedFrom: seed.derivedFrom ?? null,
        descriptionFa: seed.descriptionFa ?? null,
        descriptionEn: seed.descriptionEn ?? null,
        externalIds: seed.externalIds ?? null,
      },
      create: {
        symbol: seed.symbol,
        nameFa: seed.nameFa,
        nameEn: seed.nameEn,
        assetClass: seed.assetClass,
        market: seed.market,
        quoteCurrency: seed.quoteCurrency,
        unit: seed.unit,
        precision: seed.precision,
        sortOrder: seed.sortOrder,
        icon: seed.icon,
        enabled,
        isDerived: seed.isDerived ?? false,
        derivedFrom: seed.derivedFrom ?? null,
        descriptionFa: seed.descriptionFa ?? null,
        descriptionEn: seed.descriptionEn ?? null,
        externalIds: seed.externalIds ?? null,
      },
    });

    // Aliases
    for (const alias of seed.aliases) {
      await prisma.assetAlias.upsert({
        where: { assetId_alias: { assetId: asset.id, alias } },
        update: {},
        create: { assetId: asset.id, alias },
      });
    }

    // Provider mapping
    for (const [providerCode, externalSymbol] of Object.entries(seed.providers ?? {})) {
      const provider = await prisma.provider.findUnique({ where: { code: providerCode } });
      if (!provider) continue;
      await prisma.providerAsset.upsert({
        where: { assetId_providerId: { assetId: asset.id, providerId: provider.id } },
        update: { externalSymbol },
        create: {
          assetId: asset.id,
          providerId: provider.id,
          externalSymbol,
          priority: providerCode === 'brsapi' ? 10 : providerCode === 'coingecko' ? 20 : 100,
        },
      });
    }
  }

  // ---- Market sessions ----
  const sessions: { market: string; timezone: string; noteFa: string; noteEn: string }[] = [
    { market: 'iran_fx', timezone: 'Asia/Tehran', noteFa: 'بازار آزاد ارز ایران (شنبه تا چهارشنبه)', noteEn: 'Iran free currency market (Sat–Wed)' },
    { market: 'tsetmc', timezone: 'Asia/Tehran', noteFa: 'بورس تهران: شنبه تا چهارشنبه ۹:۰۰ تا ۱۲:۳۰', noteEn: 'TSE: Sat–Wed 09:00–12:30' },
    { market: 'forex', timezone: 'UTC', noteFa: 'بازار ارز جهانی (دوشنبه تا جمعه)', noteEn: 'Global FX (Mon–Fri)' },
    { market: 'crypto', timezone: 'UTC', noteFa: 'بازار رمزارز ۲۴/۷', noteEn: 'Crypto market 24/7' },
    { market: 'metals', timezone: 'UTC', noteFa: 'بازار فلزات گران‌بها (دوشنبه تا جمعه)', noteEn: 'Precious metals (Mon–Fri)' },
    { market: 'commodities', timezone: 'UTC', noteFa: 'بازار کالا (دوشنبه تا جمعه)', noteEn: 'Commodities (Mon–Fri)' },
  ];
  for (const s of sessions) {
    await prisma.marketSession.upsert({
      where: { market: s.market },
      update: { timezone: s.timezone, noteFa: s.noteFa, noteEn: s.noteEn },
      create: { ...s },
    });
  }

  // ---- System settings ----
  await prisma.systemSetting.upsert({
    where: { key: 'schema_version' },
    update: { value: 1 },
    create: { key: 'schema_version', value: 1 },
  });
  await prisma.systemSetting.upsert({
    where: { key: 'seeded_at' },
    update: { value: new Date().toISOString() },
    create: { key: 'seeded_at', value: new Date().toISOString() },
  });

  const counts = {
    providers: await prisma.provider.count(),
    assets: await prisma.asset.count(),
    aliases: await prisma.assetAlias.count(),
    providerAssets: await prisma.providerAsset.count(),
  };
  console.log(`Seed complete: ${JSON.stringify(counts)}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
