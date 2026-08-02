import { prisma } from '@sarmaye/database';
import type {
  Asset,
  AssetHistoryResponse,
  Candle,
  CategoryMeta,
  ChartRange,
  ConversionResult,
  FreshnessStatus,
  MarketOverview,
  OverviewAsset,
  ProviderStatus,
  Quote,
  SearchResultItem,
  SparklinePoint,
} from '@sarmaye/shared';
import { CATEGORIES, HOME_ASSET_SYMBOLS, RANGE_SPECS, categoryByClass, categoryBySlug } from '@sarmaye/shared';
import { parseEnv, type AppEnv } from '@sarmaye/shared';
import { resolveAvailableRanges } from '@sarmaye/market-core';
import { isProviderConfigured, missingConfigFor, buildNewsProvider, buildGeminiSummarizer } from '@sarmaye/providers';
import { convert, type ConverterAssetInput } from './converter';

/**
 * Server-side data access. Used by SSR pages and API routes.
 * No provider keys ever leave the server.
 */

let cachedEnv: AppEnv | null = null;
export function serverEnv(): AppEnv {
  if (!cachedEnv) cachedEnv = parseEnv();
  return cachedEnv;
}

const DAY_MS = 86_400_000;

/* ------------------------------------------------------------------ */
/* Quote DTO mapping                                                   */
/* ------------------------------------------------------------------ */

function freshnessFor(receivedAt: Date, provider: { refreshIntervalMs: number | null; delayLabel: string }): Quote['freshness'] {
  const ageMs = Date.now() - receivedAt.getTime();
  const staleAfter = Math.max((provider.refreshIntervalMs ?? 300_000) * 3, 15 * 60_000);
  if (ageMs > staleAfter) return 'stale';
  return 'live';
}

function mapQuote(
  q: {
    price: unknown;
    bid: unknown;
    ask: unknown;
    open: unknown;
    high: unknown;
    low: unknown;
    previousClose: unknown;
    changeAbsolute: unknown;
    changePercent: unknown;
    volume: unknown;
    marketCap: unknown;
    circulatingSupply: unknown;
    marketTimestamp: Date | null;
    receivedAt: Date;
    freshness: string;
    rawMetadata: unknown;
    asset: { symbol: string; nameFa: string; nameEn: string; assetClass: string; unit: string; quoteCurrency: string; precision: number; icon: string | null; id: string };
    provider: { id: string; code: string; displayName: string; delayLabel: string; refreshIntervalMs: number | null };
  }
): Quote {
  const effective = q.freshness === 'stale' ? 'stale' : freshnessFor(q.receivedAt, q.provider);
  return {
    assetId: q.asset.id,
    assetSymbol: q.asset.symbol,
    assetNameFa: q.asset.nameFa,
    assetNameEn: q.asset.nameEn,
    assetClass: q.asset.assetClass as Quote['assetClass'],
    unit: q.asset.unit,
    quoteCurrency: q.asset.quoteCurrency as Quote['quoteCurrency'],
    precision: q.asset.precision,
    icon: q.asset.icon,
    price: q.price == null ? null : String(q.price),
    bid: q.bid == null ? null : String(q.bid),
    ask: q.ask == null ? null : String(q.ask),
    open: q.open == null ? null : String(q.open),
    high: q.high == null ? null : String(q.high),
    low: q.low == null ? null : String(q.low),
    previousClose: q.previousClose == null ? null : String(q.previousClose),
    changeAbsolute: q.changeAbsolute == null ? null : String(q.changeAbsolute),
    changePercent: q.changePercent == null ? null : String(q.changePercent),
    volume: q.volume == null ? null : String(q.volume),
    marketCap: q.marketCap == null ? null : String(q.marketCap),
    circulatingSupply: q.circulatingSupply == null ? null : String(q.circulatingSupply),
    marketTimestamp: q.marketTimestamp ? q.marketTimestamp.toISOString() : null,
    receivedAt: q.receivedAt.toISOString(),
    freshness: effective,
    providerId: q.provider.id,
    providerCode: q.provider.code,
    providerDisplayName: q.provider.displayName,
    delayLabel: q.provider.delayLabel,
    rawMetadata: (q.rawMetadata as Record<string, unknown> | null) ?? null,
  };
}

/* ------------------------------------------------------------------ */
/* Overview                                                            */
/* ------------------------------------------------------------------ */

export async function getOverview(_lang: 'fa' | 'en' = 'fa'): Promise<MarketOverview> {
  const symbols = HOME_ASSET_SYMBOLS;

  const quotes = await prisma.latestQuote.findMany({
    where: { asset: { enabled: true, symbol: { in: symbols } } },
    include: {
      asset: true,
      provider: { select: { id: true, code: true, displayName: true, delayLabel: true, refreshIntervalMs: true } },
    },
    orderBy: { asset: { sortOrder: 'asc' } },
  });

  // Sparklines: last 7 daily candles per symbol (single query).
  const since = new Date(Date.now() - 7 * DAY_MS);
  const candles = await prisma.ohlcCandle.findMany({
    where: { asset: { symbol: { in: symbols } }, interval: '1d', startTime: { gte: since } },
    select: { assetId: true, startTime: true, close: true },
    orderBy: { startTime: 'asc' },
  });
  const sparkByAsset = new Map<string, SparklinePoint[]>();
  for (const c of candles) {
    const arr = sparkByAsset.get(c.assetId) ?? [];
    arr.push({ t: c.startTime.getTime(), v: Number(c.close) });
    sparkByAsset.set(c.assetId, arr);
  }

  const assets: OverviewAsset[] = quotes.map((q) => ({
    ...mapQuote(q),
    sparkline: sparkByAsset.get(q.assetId) ?? [],
  }));

  // Gainers/losers among assets with a changePercent.
  const withChange = assets.filter((a) => a.changePercent !== null && a.price !== null);
  const gainers = [...withChange].sort((a, b) => Number(b.changePercent) - Number(a.changePercent)).slice(0, 5);
  const losers = [...withChange].sort((a, b) => Number(a.changePercent) - Number(b.changePercent)).slice(0, 5);

  const categories = await getCategories();

  const [providerStatuses, staleCount, sessions] = await Promise.all([
    getProviderStatuses(),
    prisma.latestQuote.count({ where: { freshness: 'stale' } }),
    getMarketSessions(),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    quoteCurrencyMode: 'TOMAN',
    categories,
    assets,
    gainers,
    losers,
    providerStatuses,
    staleCount,
    marketSessions: sessions,
  };
}

/* ------------------------------------------------------------------ */
/* Categories & assets                                                 */
/* ------------------------------------------------------------------ */

export async function getCategories(): Promise<CategoryMeta[]> {
  const env = serverEnv();
  const classes = CATEGORIES.filter((c) => c.assetClass !== 'economic_indicator' || env.ECONOMIC_INDICATORS_ENABLED).map((c) => c.assetClass);
  const counts = await prisma.asset.groupBy({
    by: ['assetClass'],
    where: { enabled: true, assetClass: { in: classes } },
    _count: { _all: true },
  });
  const countMap = new Map(counts.map((c) => [c.assetClass, c._count._all]));
  return CATEGORIES.filter((c) => classes.includes(c.assetClass)).map((c) => ({
    ...c,
    assetCount: countMap.get(c.assetClass) ?? 0,
  }));
}

export async function getCategoryAssets(slug: string): Promise<{ category: CategoryMeta; assets: Quote[] } | null> {
  const category = categoryBySlug(slug);
  if (!category) return null;
  const quotes = await prisma.latestQuote.findMany({
    where: { asset: { enabled: true, assetClass: category.assetClass } },
    include: {
      asset: true,
      provider: { select: { id: true, code: true, displayName: true, delayLabel: true, refreshIntervalMs: true } },
    },
    orderBy: { asset: { sortOrder: 'asc' } },
  });
  return { category, assets: quotes.map(mapQuote) };
}

export async function getAllAssets(): Promise<Asset[]> {
  const rows = await prisma.asset.findMany({
    where: { enabled: true },
    include: {
      aliases: { select: { alias: true } },
      providerAssets: { include: { provider: { select: { code: true } } } },
    },
    orderBy: [{ assetClass: 'asc' }, { sortOrder: 'asc' }],
  });
  return rows.map((r) => ({
    id: r.id,
    symbol: r.symbol,
    nameFa: r.nameFa,
    nameEn: r.nameEn,
    assetClass: r.assetClass as Asset['assetClass'],
    market: r.market as Asset['market'],
    quoteCurrency: r.quoteCurrency as Asset['quoteCurrency'],
    unit: r.unit,
    precision: r.precision,
    enabled: r.enabled,
    sortOrder: r.sortOrder,
    icon: r.icon,
    isDerived: r.isDerived,
    derivedFrom: r.derivedFrom as Asset['derivedFrom'],
    descriptionFa: r.descriptionFa,
    descriptionEn: r.descriptionEn,
    externalIds: r.externalIds as Record<string, string> | null,
    firstCollectedAt: r.firstCollectedAt ? r.firstCollectedAt.toISOString() : null,
    historyNoteFa: r.historyNoteFa,
    historyNoteEn: r.historyNoteEn,
    aliases: r.aliases.map((a) => a.alias),
    providers: r.providerAssets.map((pa) => ({
      providerCode: pa.provider.code,
      externalSymbol: pa.externalSymbol,
      enabled: pa.enabled,
      priority: pa.priority,
    })),
  }));
}

export async function getAssetDetail(symbol: string): Promise<{
  asset: Asset;
  quote: Quote | null;
  related: Quote[];
  availableRanges: ChartRange[];
}> {
  const asset = (await getAllAssets()).find((a) => a.symbol === symbol);
  if (!asset) return { asset: null as unknown as Asset, quote: null, related: [], availableRanges: [] };

  const quote = await prisma.latestQuote.findFirst({
    where: { assetId: asset.id },
    include: {
      asset: true,
      provider: { select: { id: true, code: true, displayName: true, delayLabel: true, refreshIntervalMs: true } },
    },
    orderBy: { receivedAt: 'desc' },
  });

  const related = await prisma.latestQuote.findMany({
    where: { asset: { enabled: true, assetClass: asset.assetClass, symbol: { not: symbol } } },
    include: {
      asset: true,
      provider: { select: { id: true, code: true, displayName: true, delayLabel: true, refreshIntervalMs: true } },
    },
    orderBy: { asset: { sortOrder: 'asc' } },
    take: 6,
  });

  const firstCandle = await prisma.ohlcCandle.findFirst({
    where: { assetId: asset.id },
    orderBy: { startTime: 'asc' },
    select: { startTime: true },
  });
  const firstData = firstCandle?.startTime ?? (asset.firstCollectedAt ? new Date(asset.firstCollectedAt) : null);
  const availableRanges = resolveAvailableRanges(firstData);
  // Provider-backed history (frankfurter/coingecko) always unlocks long ranges.
  const hasProviderHistory = await prisma.ohlcCandle.count({
    where: { assetId: asset.id, providerId: { not: null } },
  });
  if (hasProviderHistory > 0) {
    for (const r of ['3M', '6M', '1Y', '5Y', 'MAX'] as ChartRange[]) {
      if (!availableRanges.includes(r)) availableRanges.push(r);
    }
  }

  return { asset, quote: quote ? mapQuote(quote) : null, related: related.map(mapQuote), availableRanges };
}

/* ------------------------------------------------------------------ */
/* History                                                             */
/* ------------------------------------------------------------------ */

export async function getAssetHistory(
  symbol: string,
  range: ChartRange = '7D'
): Promise<AssetHistoryResponse | null> {
  const asset = await prisma.asset.findUnique({ where: { symbol } });
  if (!asset) return null;

  const spec = RANGE_SPECS[range];
  const end = new Date();
  const start = new Date(end.getTime() - spec.lookbackSeconds * 1000);

  const candles = await prisma.ohlcCandle.findMany({
    where: {
      assetId: asset.id,
      interval: spec.interval,
      startTime: { gte: start },
    },
    include: { provider: { select: { code: true } } },
    orderBy: { startTime: 'asc' },
    take: 2000,
  });

  const mapped: Candle[] = candles.map((c) => ({
    assetSymbol: asset.symbol,
    interval: c.interval as Candle['interval'],
    startTime: c.startTime.toISOString(),
    endTime: c.endTime.toISOString(),
    open: String(c.open),
    high: String(c.high),
    low: String(c.low),
    close: String(c.close),
    volume: c.volume == null ? null : String(c.volume),
    sampleCount: c.sampleCount,
    isFinal: c.isFinal,
    providerCode: c.provider?.code ?? null,
  }));

  const providerIds = new Set(candles.map((c) => c.providerId).filter(Boolean));
  const hasProviderHistory = providerIds.size > 0;
  const firstCandle = candles[0];
  const firstData = firstCandle?.startTime ?? (asset.firstCollectedAt ? new Date(asset.firstCollectedAt) : null);
  const availableRanges = resolveAvailableRanges(firstData);
  if (hasProviderHistory) {
    for (const r of ['3M', '6M', '1Y', '5Y', 'MAX'] as ChartRange[]) {
      if (!availableRanges.includes(r)) availableRanges.push(r);
    }
  }

  const historySource: AssetHistoryResponse['historySource'] = hasProviderHistory
    ? firstCandle
      ? 'mixed'
      : 'provider'
    : 'local_snapshots';

  return {
    symbol: asset.symbol,
    interval: spec.interval,
    range,
    start: start.toISOString(),
    end: end.toISOString(),
    candles: mapped,
    historySource,
    historyNoteFa: asset.historyNoteFa,
    historyNoteEn: asset.historyNoteEn,
    availableRanges,
  };
}

export async function getSparklines(symbols: string[], days = 7): Promise<Record<string, SparklinePoint[]>> {
  if (symbols.length === 0) return {};
  const since = new Date(Date.now() - days * DAY_MS);
  const candles = await prisma.ohlcCandle.findMany({
    where: { asset: { symbol: { in: symbols } }, interval: '1d', startTime: { gte: since } },
    select: { asset: { select: { symbol: true } }, startTime: true, close: true },
    orderBy: { startTime: 'asc' },
  });
  const out: Record<string, SparklinePoint[]> = {};
  for (const c of candles) {
    const arr = out[c.asset.symbol] ?? [];
    arr.push({ t: c.startTime.getTime(), v: Number(c.close) });
    out[c.asset.symbol] = arr;
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Converter                                                           */
/* ------------------------------------------------------------------ */

export async function runConversion(from: string, to: string, amount: string, lang: 'fa' | 'en'): Promise<ConversionResult> {
  const quotes = await prisma.latestQuote.findMany({
    include: {
      asset: { select: { symbol: true, nameFa: true, quoteCurrency: true } },
      provider: { select: { code: true } },
    },
  });
  const inputs: Record<string, ConverterAssetInput> = {};
  for (const q of quotes) {
    const key = q.asset.symbol;
    const existing = inputs[key];
    // Prefer the freshest / highest-priority quote for an asset.
    if (existing && existing.freshness !== 'stale' && q.freshness === 'stale') continue;
    if (existing && existing.providerCode === 'brsapi') continue;
    inputs[key] = {
      symbol: key,
      nameFa: q.asset.nameFa,
      quoteCurrency: q.asset.quoteCurrency,
      price: String(q.price),
      providerCode: q.provider.code,
      freshness: q.freshness as FreshnessStatus,
    };
  }
  return convert({ from, to, amount, quotes: inputs, lang });
}

/* ------------------------------------------------------------------ */
/* Search                                                              */
/* ------------------------------------------------------------------ */

function normalizeSearch(s: string): string {
  return s
    .toLowerCase()
    .replace(/[يی]/g, 'ی')
    .replace(/[كک]/g, 'ک')
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/\u200c/g, ' ')
    .trim();
}

export async function searchAssets(q: string, limit = 10): Promise<SearchResultItem[]> {
  const query = normalizeSearch(q);
  if (query.length === 0) return [];

  const assets = await getAllAssets();
  const quotes = await prisma.latestQuote.findMany({
    include: {
      asset: { select: { symbol: true, nameFa: true, nameEn: true, assetClass: true, unit: true, quoteCurrency: true, precision: true, icon: true, id: true } },
      provider: { select: { id: true, code: true, displayName: true, delayLabel: true, refreshIntervalMs: true } },
    },
  });
  const quoteByAsset = new Map<string, Quote>();
  for (const q2 of quotes) quoteByAsset.set(q2.assetId, mapQuote(q2));

  const scored: { asset: Asset; score: number; matchedAlias: string | null }[] = [];
  for (const asset of assets) {
    const names = [asset.symbol, asset.nameFa, asset.nameEn, ...asset.aliases].map(normalizeSearch);
    let best = -1;
    let matchedAlias: string | null = null;
    for (let i = 0; i < names.length; i += 1) {
      const n = names[i]!;
      let score = -1;
      if (n === query) score = 100 - i;
      else if (n.startsWith(query)) score = 60 - i;
      else if (n.includes(query)) score = 30 - i;
      if (score > best) {
        best = score;
        matchedAlias = i > 2 ? asset.aliases[i - 3] ?? null : null;
      }
    }
    if (best >= 0) scored.push({ asset, score: best, matchedAlias });
  }

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ asset, matchedAlias }) => {
      const quote = quoteByAsset.get(asset.id);
      return {
        symbol: asset.symbol,
        nameFa: asset.nameFa,
        nameEn: asset.nameEn,
        assetClass: asset.assetClass,
        icon: asset.icon,
        matchedAlias,
        quoteCurrency: asset.quoteCurrency,
        price: quote?.price ?? null,
        changePercent: quote?.changePercent ?? null,
        freshness: quote?.freshness ?? null,
      };
    });
}

/* ------------------------------------------------------------------ */
/* Providers & sessions                                                */
/* ------------------------------------------------------------------ */

export async function getProviderStatuses(): Promise<ProviderStatus[]> {
  const env = serverEnv();
  const providers = await prisma.provider.findMany({ orderBy: { code: 'asc' } });
  const today = new Date().toISOString().slice(0, 10);
  const usage = await prisma.providerUsage.findMany({ where: { date: today } });
  const usageByProvider = new Map(usage.map((u) => [u.providerId, u]));
  const health = await prisma.providerHealthCheck.findMany({
    orderBy: { checkedAt: 'desc' },
    take: 100,
  });
  const lastHealth = new Map<string, (typeof health)[number]>();
  for (const h of health) {
    if (!lastHealth.has(h.providerId)) lastHealth.set(h.providerId, h);
  }

  return providers.map((p) => {
    const configured = isProviderConfigured(p.code, env);
    const missing = missingConfigFor(p.code, env);
    const usageRow = usageByProvider.get(p.id);
    const healthRow = lastHealth.get(p.id);
    let status: ProviderStatus['status'];
    if (!p.enabled) status = 'disabled';
    else if (!configured) status = 'not_configured';
    else if (healthRow?.status === 'quota_exhausted') status = 'quota_exhausted';
    else if (healthRow?.status === 'circuit_open') status = 'circuit_open';
    else if (healthRow?.status === 'down') status = 'down';
    else if (healthRow?.status === 'degraded') status = 'degraded';
    else status = 'ok';
    return {
      providerId: p.id,
      code: p.code,
      displayName: p.displayName,
      enabled: p.enabled,
      configured,
      missingConfig: missing,
      status,
      latencyMs: healthRow?.latencyMs ?? null,
      lastSuccessAt: healthRow?.status === 'ok' ? healthRow.checkedAt.toISOString() : null,
      lastError: healthRow && healthRow.status !== 'ok' ? healthRow.errorMessage : null,
      consecutiveFailures: healthRow?.consecutiveFailures ?? 0,
      usageToday: {
        requests: usageRow?.requestCount ?? 0,
        successes: usageRow?.successCount ?? 0,
        failures: usageRow?.failureCount ?? 0,
      },
      dailyQuota: p.dailyQuota,
      delayLabel: p.delayLabel,
      assetClasses: p.assetClasses as ProviderStatus['assetClasses'],
      attribution: p.attributionText,
      fallbackProvider: p.fallbackProviderCode,
    };
  });
}

export async function getMarketSessions(): Promise<{ market: string; isOpen: boolean; labelFa: string; labelEn: string }[]> {
  const sessions = await prisma.marketSession.findMany();
  return sessions.map((s) => ({
    market: s.market,
    isOpen: s.isOpen,
    labelFa: s.noteFa ?? s.market,
    labelEn: s.noteEn ?? s.market,
  }));
}

export async function getStaleAssetSymbols(): Promise<{ symbol: string; nameFa: string; ageMinutes: number }[]> {
  const quotes = await prisma.latestQuote.findMany({
    where: { freshness: 'stale' },
    include: { asset: { select: { symbol: true, nameFa: true } } },
    orderBy: { receivedAt: 'asc' },
  });
  return quotes.map((q) => ({
    symbol: q.asset.symbol,
    nameFa: q.asset.nameFa,
    ageMinutes: Math.round((Date.now() - q.receivedAt.getTime()) / 60_000),
  }));
}

export { categoryByClass, categoryBySlug };

/* ------------------------------------------------------------------ */
/* Market news (NewsAPI / Brave, DB-cached, quota-guarded)             */
/* ------------------------------------------------------------------ */

export interface NewsResponse {
  items: {
    title: string;
    url: string;
    description?: string;
    source?: string;
    publishedAt?: string;
  }[];
  provider: string | null;
  enabled: boolean;
  fetchedAt: string | null;
  stale: boolean;
  reason?: string;
}

const NEWS_QUERIES: Record<string, string> = {
  // NewsAPI has no Persian-language sources; mixing English terms with the
  // Persian words keeps the feed relevant for a Persian audience.
  fa: 'bitcoin OR gold OR oil OR دلار OR طلا OR بیت کوین',
  en: 'gold OR oil OR bitcoin OR forex',
};

/**
 * News is fetched at most once per NEWS_INTERVAL_MS regardless of how many
 * visits hit the route (the DB cache decides freshness, so browsers can never
 * hammer the news API).
 */
export async function getNewsItems(lang: 'fa' | 'en' = 'fa', env: AppEnv = serverEnv()): Promise<NewsResponse> {
  const provider = buildNewsProvider(env);
  const configured = Boolean(env.NEWS_ENABLED && provider && provider.isConfigured());

  if (configured) {
    const latest = await prisma.newsItem.findFirst({ where: { lang }, orderBy: { fetchedAt: 'desc' } });
    const fresh = latest && Date.now() - latest.fetchedAt.getTime() < env.NEWS_INTERVAL_MS;
    if (!fresh) {
      try {
        const articles = await provider!.getNews({
          query: NEWS_QUERIES[lang] ?? NEWS_QUERIES.fa,
          count: 12,
          searchLang: lang,
          country: 'ir',
        });
        for (const a of articles) {
          await prisma.newsItem.upsert({
            where: { url: a.url },
            update: { fetchedAt: new Date() },
            create: {
              title: a.title,
              url: a.url,
              description: a.description ?? null,
              source: a.source ?? null,
              publishedAt: a.publishedAt ? new Date(a.publishedAt) : null,
              lang,
            },
          });
        }
      } catch {
        // Fall through to cached items (stale flag set below).
      }
    }
  }

  const items = await prisma.newsItem.findMany({ where: { lang }, orderBy: { fetchedAt: 'desc' }, take: 12 });
  const last = items[0]?.fetchedAt;
  return {
    items: items.map((i) => ({
      title: i.title,
      url: i.url,
      description: i.description ?? undefined,
      source: i.source ?? undefined,
      publishedAt: i.publishedAt?.toISOString(),
    })),
    provider: provider?.id ?? null,
    enabled: configured,
    fetchedAt: last?.toISOString() ?? null,
    stale: Boolean(last && Date.now() - last.getTime() > env.NEWS_INTERVAL_MS * 3),
    reason: configured ? undefined : 'not_configured',
  };
}

/* ------------------------------------------------------------------ */
/* AI market summary (Gemini, cached in SystemSetting)                 */
/* ------------------------------------------------------------------ */

export interface AiSummaryResponse {
  text: string | null;
  model: string | null;
  generatedAt: string | null;
  enabled: boolean;
  reason?: string;
}

const AI_CACHE_KEYS: Record<string, string> = { fa: 'ai_summary:fa', en: 'ai_summary:en' };

/** Summarize the latest stored quotes with Gemini (cached, server-only). */
export async function getAiSummary(lang: 'fa' | 'en' = 'fa', env: AppEnv = serverEnv()): Promise<AiSummaryResponse> {
  const gemini = buildGeminiSummarizer(env);
  const cacheKey = AI_CACHE_KEYS[lang];

  const readCache = async (): Promise<AiSummaryResponse | null> => {
    const row = await prisma.systemSetting.findUnique({ where: { key: cacheKey } });
    if (!row?.value) return null;
    const parsed = typeof row.value === 'string' ? JSON.parse(row.value) : row.value;
    if (parsed && typeof parsed.text === 'string') {
      return { text: parsed.text, model: parsed.model ?? null, generatedAt: parsed.generatedAt ?? null, enabled: true };
    }
    return null;
  };

  if (!gemini) return { text: null, model: null, generatedAt: null, enabled: false, reason: 'not_configured' };

  const cached = await readCache();
  if (cached && cached.generatedAt && Date.now() - new Date(cached.generatedAt).getTime() < env.GEMINI_INTERVAL_MS) {
    return cached;
  }

  // Build a compact market snapshot from the latest stored quotes.
  const quotes = await prisma.latestQuote.findMany({
    where: { asset: { enabled: true } },
    include: { asset: { select: { symbol: true, nameFa: true } }, provider: { select: { code: true } } },
    orderBy: { receivedAt: 'desc' },
    take: 40,
  });
  const marketText = quotes
    .map((q) => `${q.asset.symbol} ${q.asset.nameFa}: ${q.price} (تغییر ${q.changePercent ?? '—'}%) — ${q.provider.code}`)
    .join('\n');

  try {
    const res = await gemini.summarize(marketText, lang);
    await prisma.systemSetting.upsert({
      where: { key: cacheKey },
      update: { value: JSON.stringify(res) },
      create: { key: cacheKey, value: JSON.stringify(res) },
    });
    return { text: res.text, model: res.model, generatedAt: res.generatedAt, enabled: true };
  } catch {
    return cached ?? { text: null, model: null, generatedAt: null, enabled: true, reason: 'error' };
  }
}
