import type { AssetClass, Asset, CandleInterval, ChartRange, Market, QuoteCurrency } from './types.js';

/** Category definitions. Categories map 1:1 to asset classes for this product. */
export interface CategoryMeta {
  slug: string;
  assetClass: AssetClass;
  titleFa: string;
  titleEn: string;
  descriptionFa: string;
  descriptionEn: string;
  icon: string;
  sortOrder: number;
}

export const CATEGORIES: CategoryMeta[] = [
  {
    slug: 'iranian-currencies',
    assetClass: 'iranian_currency',
    titleFa: 'ارزهای ایرانی',
    titleEn: 'Iranian Currencies',
    descriptionFa: 'قیمت لحظه‌ای ارز در بازار آزاد ایران',
    descriptionEn: 'Live free-market currency prices in Iran',
    icon: 'banknote',
    sortOrder: 1,
  },
  {
    slug: 'iranian-gold-coins',
    assetClass: 'iranian_gold_coin',
    titleFa: 'طلا و سکه ایرانی',
    titleEn: 'Iranian Gold & Coins',
    descriptionFa: 'قیمت طلا و انواع سکه در بازار ایران',
    descriptionEn: 'Iranian gold and coin prices',
    icon: 'coins',
    sortOrder: 2,
  },
  {
    slug: 'global-currencies',
    assetClass: 'global_currency',
    titleFa: 'ارزهای جهانی',
    titleEn: 'Global Currencies',
    descriptionFa: 'نرخ مرجع روزانه ارزهای جهانی (داده مرجع، نه معاملات زنده)',
    descriptionEn: 'Daily reference exchange rates (reference data, not live trading)',
    icon: 'globe',
    sortOrder: 3,
  },
  {
    slug: 'precious-metals',
    assetClass: 'precious_metal',
    titleFa: 'فلزات گران‌بها',
    titleEn: 'Precious Metals',
    descriptionFa: 'قیمت طلا، نقره، پلاتین و پالادیوم',
    descriptionEn: 'Gold, silver, platinum and palladium prices',
    icon: 'gem',
    sortOrder: 4,
  },
  {
    slug: 'cryptocurrencies',
    assetClass: 'cryptocurrency',
    titleFa: 'رمزارزها',
    titleEn: 'Cryptocurrencies',
    descriptionFa: 'قیمت و اطلاعات بازار ارزهای دیجیتال',
    descriptionEn: 'Cryptocurrency prices and market data',
    icon: 'bitcoin',
    sortOrder: 5,
  },
  {
    slug: 'iranian-stocks',
    assetClass: 'iranian_stock',
    titleFa: 'بورس ایران',
    titleEn: 'Iranian Stocks',
    descriptionFa: 'داده بازار بورس اوراق بهادار تهران',
    descriptionEn: 'Tehran Stock Exchange market data',
    icon: 'chart',
    sortOrder: 6,
  },
  {
    slug: 'global-markets',
    assetClass: 'global_market',
    titleFa: 'بازارهای جهانی',
    titleEn: 'Global Markets',
    descriptionFa: 'سهام و کالاهای جهانی (ماژول آزمایشی)',
    descriptionEn: 'Global stocks and commodities (experimental module)',
    icon: 'trending',
    sortOrder: 7,
  },
  {
    slug: 'economic-indicators',
    assetClass: 'economic_indicator',
    titleFa: 'شاخص‌های اقتصادی',
    titleEn: 'Economic Indicators',
    descriptionFa: 'شاخص‌های کلان اقتصادی آمریکا و جهان',
    descriptionEn: 'US and global macroeconomic indicators',
    icon: 'activity',
    sortOrder: 8,
  },
];

export function categoryByClass(assetClass: AssetClass): CategoryMeta | undefined {
  return CATEGORIES.find((c) => c.assetClass === assetClass);
}

export function categoryBySlug(slug: string): CategoryMeta | undefined {
  return CATEGORIES.find((c) => c.slug === slug);
}

/* ------------------------------------------------------------------ */
/* Chart ranges -> aggregation interval + lookback                     */
/* ------------------------------------------------------------------ */

export interface RangeSpec {
  interval: CandleInterval;
  /** Seconds of history to look back (approximate). */
  lookbackSeconds: number;
  /** Provider-history bucket when available (crypto: "1d"|"14d"|"30d"|"1y"|"max"). */
  providerBucket: '1d' | '7d' | '14d' | '30d' | '90d' | '180d' | '365d' | '1825d' | 'max';
  labelFa: string;
  labelEn: string;
}

export const RANGE_SPECS: Record<ChartRange, RangeSpec> = {
  '1D': { interval: '5m', lookbackSeconds: 24 * 3600, providerBucket: '1d', labelFa: 'روز', labelEn: '1D' },
  '7D': { interval: '15m', lookbackSeconds: 7 * 24 * 3600, providerBucket: '7d', labelFa: 'هفته', labelEn: '7D' },
  '1M': { interval: '1h', lookbackSeconds: 30 * 24 * 3600, providerBucket: '30d', labelFa: 'ماه', labelEn: '1M' },
  '3M': { interval: '1d', lookbackSeconds: 90 * 24 * 3600, providerBucket: '90d', labelFa: '۳ ماه', labelEn: '3M' },
  '6M': { interval: '1d', lookbackSeconds: 180 * 24 * 3600, providerBucket: '180d', labelFa: '۶ ماه', labelEn: '6M' },
  '1Y': { interval: '1d', lookbackSeconds: 365 * 24 * 3600, providerBucket: '365d', labelFa: 'سال', labelEn: '1Y' },
  '5Y': { interval: '1w', lookbackSeconds: 5 * 365 * 24 * 3600, providerBucket: '1825d', labelFa: '۵ سال', labelEn: '5Y' },
  MAX: { interval: '1w', lookbackSeconds: 20 * 365 * 24 * 3600, providerBucket: 'max', labelFa: 'حداکثر', labelEn: 'MAX' },
};

export const ALL_CHART_RANGES: ChartRange[] = ['1D', '7D', '1M', '3M', '6M', '1Y', '5Y', 'MAX'];

/* ------------------------------------------------------------------ */
/* Provider metadata                                                   */
/* ------------------------------------------------------------------ */

export interface ProviderMeta {
  code: string;
  displayNameFa: string;
  displayNameEn: string;
  assetClasses: AssetClass[];
  authType: 'none' | 'query_param' | 'header';
  envKey: string; // env var holding the API key (empty if none)
  baseUrl: string;
  /** How data from this provider must be labeled. */
  delayLabel: string; // "Live" | "Delayed" | "Daily reference rate"
  defaultRefreshMs: number;
  dailyQuota: number | null;
  supportsHistory: boolean;
  attribution: string | null;
  fallbackProvider: string | null;
  enabledByDefault: boolean;
  notesFa: string;
  notesEn: string;
}

export const PROVIDER_META: ProviderMeta[] = [
  {
    code: 'brsapi',
    displayNameFa: 'بی‌آر‌اس‌ای‌پی (BrsApi)',
    displayNameEn: 'BrsApi',
    assetClasses: ['iranian_currency', 'iranian_gold_coin'],
    authType: 'query_param',
    envKey: 'BRSAPI_API_KEY',
    baseUrl: 'https://Api.BrsApi.ir/Market/Gold_Currency.php',
    delayLabel: 'Live',
    defaultRefreshMs: 90_000,
    dailyQuota: 1500,
    supportsHistory: false,
    attribution: 'https://brsapi.ir',
    fallbackProvider: 'navasan',
    enabledByDefault: true,
    notesFa: 'کلید رایگان: ۱۵۰۰ درخواست در روز. تاریخچه رایگان ندارد؛ این سرویس از روز شروع به جمع‌آوری محلی اسنپ‌شات‌ها می‌کند.',
    notesEn: 'Free key: 1500 requests/day. No free history; this service collects local snapshots from startup.',
  },
  {
    code: 'navasan',
    displayNameFa: 'نواسان (Navasan)',
    displayNameEn: 'Navasan',
    assetClasses: ['iranian_currency', 'iranian_gold_coin'],
    authType: 'query_param',
    envKey: 'NAVASAN_API_KEY',
    baseUrl: 'https://api.navasan.tech/latest/',
    delayLabel: 'Live',
    defaultRefreshMs: 600_000,
    dailyQuota: null,
    supportsHistory: false,
    attribution: 'https://navasan.tech',
    fallbackProvider: null,
    enabledByDefault: true,
    notesFa: 'پلن رایگان سهمیه محدود دارد؛ فقط به‌عنوان پشتیبان کم‌فرکانس استفاده می‌شود. سهمیه فعلی را هنگام ثبت‌نام بررسی کنید.',
    notesEn: 'Free plan has a limited quota; used only as a low-frequency fallback. Verify current quota at signup.',
  },
  {
    code: 'brsapi-tsetmc',
    displayNameFa: 'بی‌آر‌اس‌ای‌پی بورس (BrsApi TSETMC)',
    displayNameEn: 'BrsApi TSETMC',
    assetClasses: ['iranian_stock'],
    authType: 'query_param',
    envKey: 'BRSAPI_API_KEY',
    baseUrl: 'https://Api.BrsApi.ir/Market/',
    delayLabel: 'Delayed',
    defaultRefreshMs: 300_000,
    dailyQuota: null,
    supportsHistory: true,
    attribution: 'https://brsapi.ir',
    fallbackProvider: null,
    enabledByDefault: false, // behind feature flag IRANIAN_STOCKS_ENABLED
    notesFa: 'داده بورس تهران پشت پرچم ویژگی است؛ برای فعال‌سازی IRANIAN_STOCKS_ENABLED=true را بگذارید.',
    notesEn: 'TSETMC data is behind a feature flag; set IRANIAN_STOCKS_ENABLED=true to enable.',
  },
  {
    code: 'frankfurter',
    displayNameFa: 'فرانک‌فورتر (Frankfurter)',
    displayNameEn: 'Frankfurter',
    assetClasses: ['global_currency'],
    authType: 'none',
    envKey: '',
    baseUrl: 'https://api.frankfurter.dev/v1',
    delayLabel: 'Daily reference rate',
    defaultRefreshMs: 12 * 3600_000,
    dailyQuota: null,
    supportsHistory: true,
    attribution: 'ECB reference rates via Frankfurter (frankfurter.dev)',
    fallbackProvider: null,
    enabledByDefault: true,
    notesFa: 'نرخ‌های مرجع روزانه بانک مرکزی اروپا؛ داده معاملاتی زنده نیست.',
    notesEn: 'Daily ECB reference rates; not live trading data.',
  },
  {
    code: 'metalsdev',
    displayNameFa: 'متالز.دِو (Metals.dev)',
    displayNameEn: 'Metals.dev',
    assetClasses: ['precious_metal'],
    authType: 'query_param',
    envKey: 'METALSDEV_API_KEY',
    baseUrl: 'https://api.metals.dev/v1',
    delayLabel: 'Live',
    defaultRefreshMs: 6 * 3600_000,
    dailyQuota: null,
    supportsHistory: true,
    attribution: 'https://metals.dev',
    fallbackProvider: 'alphavantage',
    enabledByDefault: true,
    notesFa: 'پلن رایگان محدود است؛ قبل از زمان‌بندی، سهمیه فعلی را از endpoint مصرف بررسی کنید.',
    notesEn: 'Free plan is limited; check current quota via the usage endpoint before scheduling.',
  },
  {
    code: 'alphavantage',
    displayNameFa: 'آلفا ونتیج (Alpha Vantage)',
    displayNameEn: 'Alpha Vantage',
    assetClasses: ['precious_metal', 'global_market', 'global_currency'],
    authType: 'query_param',
    envKey: 'ALPHAVANTAGE_API_KEY',
    baseUrl: 'https://www.alphavantage.co/query',
    delayLabel: 'Delayed',
    defaultRefreshMs: 24 * 3600_000,
    dailyQuota: 25,
    supportsHistory: true,
    attribution: 'https://alphavantage.co',
    fallbackProvider: null,
    enabledByDefault: false,
    notesFa: 'پلن رایگان ~۲۵ درخواست در روز؛ فقط چند فراخوانی زمان‌بندی‌شده در روز.',
    notesEn: 'Free plan ~25 requests/day; only a few scheduled calls per day.',
  },
  {
    code: 'coingecko',
    displayNameFa: 'کوین‌گکو (CoinGecko)',
    displayNameEn: 'CoinGecko',
    assetClasses: ['cryptocurrency'],
    authType: 'none', // keyless public endpoints; optional demo key via COINGECKO_API_KEY
    envKey: 'COINGECKO_API_KEY',
    baseUrl: 'https://api.coingecko.com/api/v3',
    delayLabel: 'Live',
    defaultRefreshMs: 300_000,
    dailyQuota: null,
    supportsHistory: true,
    attribution: 'https://www.coingecko.com',
    fallbackProvider: null,
    enabledByDefault: true,
    notesFa: 'endpoint های عمومی بدون کلید کار می‌کنند (محدودیت نرخ). کلید دموی رایگان اختیاری است.',
    notesEn: 'Keyless public endpoints work (rate-limited). Free demo key optional.',
  },
  {
    code: 'fred',
    displayNameFa: 'فرد (FRED)',
    displayNameEn: 'FRED',
    assetClasses: ['economic_indicator'],
    authType: 'query_param',
    envKey: 'FRED_API_KEY',
    baseUrl: 'https://api.stlouisfed.org/fred',
    delayLabel: 'Daily reference rate',
    defaultRefreshMs: 24 * 3600_000,
    dailyQuota: null,
    supportsHistory: true,
    attribution: 'Federal Reserve Bank of St. Louis, FRED',
    fallbackProvider: null,
    enabledByDefault: true,
    notesFa: 'شاخص‌های اقتصادی جدا از قیمت‌های بازار نمایش داده می‌شوند.',
    notesEn: 'Economic indicators are shown separately from market quotes.',
  },
  {
    code: 'finnhub',
    displayNameFa: 'فین‌هاب (Finnhub)',
    displayNameEn: 'Finnhub',
    assetClasses: ['global_market'],
    authType: 'header',
    envKey: 'FINNHUB_API_KEY',
    baseUrl: 'https://finnhub.io/api/v1',
    delayLabel: 'Live',
    defaultRefreshMs: 30 * 60_000,
    dailyQuota: 500,
    supportsHistory: false,
    attribution: 'https://finnhub.io',
    fallbackProvider: 'alphavantage',
    enabledByDefault: true,
    notesFa: 'سهام آمریکا در پلن رایگان به‌صورت زنده ارائه می‌شود (۶۰ درخواست در دقیقه). برای فعال‌سازی GLOBAL_MARKETS_ENABLED=true را بگذارید.',
    notesEn: 'US stocks are real-time on the free plan (60 calls/min). Requires GLOBAL_MARKETS_ENABLED=true.',
  },
  {
    code: 'eia',
    displayNameFa: 'اداره اطلاعات انرژی آمریکا (EIA)',
    displayNameEn: 'EIA (US Energy Information Administration)',
    assetClasses: ['global_market'],
    authType: 'query_param',
    envKey: 'EIA_API_KEY',
    baseUrl: 'https://api.eia.gov/v2/seriesid',
    delayLabel: 'Daily reference rate',
    defaultRefreshMs: 24 * 3600_000,
    dailyQuota: null,
    supportsHistory: true,
    attribution: 'US Energy Information Administration (EIA)',
    fallbackProvider: 'alphavantage',
    enabledByDefault: true,
    notesFa: 'قیمت‌های رسمی روزانه نفت و گاز آمریکا؛ داده مرجع روزانه است نه زنده.',
    notesEn: 'Official US daily energy prices; daily reference data, not live.',
  },
];

export function providerMeta(code: string): ProviderMeta | undefined {
  return PROVIDER_META.find((p) => p.code === code);
}

/* ------------------------------------------------------------------ */
/* Asset catalog (seed data).                                          */
/* ------------------------------------------------------------------ */

export interface SeedAsset {
  symbol: string;
  nameFa: string;
  nameEn: string;
  assetClass: AssetClass;
  market: Market;
  quoteCurrency: QuoteCurrency;
  unit: string;
  precision: number;
  sortOrder: number;
  icon: string;
  /** Disabled by default (e.g. experimental modules); ignored unless set. */
  enabledByDefault?: boolean;
  aliases: string[];
  externalIds?: Record<string, string>;
  providers?: Record<string, string>; // providerCode -> externalSymbol
  descriptionFa?: string;
  descriptionEn?: string;
  isDerived?: boolean;
  derivedFrom?: { assetSymbols: string[]; formulaFa: string; formulaEn: string };
}

export const SEED_ASSETS: SeedAsset[] = [
  /* ---------------- Iranian currencies (BrsApi, Toman) ---------------- */
  { symbol: 'USD', nameFa: 'دلار آمریکا', nameEn: 'US Dollar', assetClass: 'iranian_currency', market: 'iran', quoteCurrency: 'TOMAN', unit: '1 USD', precision: 0, sortOrder: 1, icon: 'dollar', aliases: ['دلار', 'dollar', 'usd', 'دلار آمریکا'], externalIds: { brsapi: 'USD' }, providers: { brsapi: 'USD', navasan: 'usd_sell' } },
  { symbol: 'EUR', nameFa: 'یورو', nameEn: 'Euro', assetClass: 'iranian_currency', market: 'iran', quoteCurrency: 'TOMAN', unit: '1 EUR', precision: 0, sortOrder: 2, icon: 'euro', aliases: ['یورو', 'euro', 'eur'], externalIds: { brsapi: 'EUR' }, providers: { brsapi: 'EUR', navasan: 'eur_sell' } },
  { symbol: 'AED', nameFa: 'درهم امارات', nameEn: 'UAE Dirham', assetClass: 'iranian_currency', market: 'iran', quoteCurrency: 'TOMAN', unit: '1 AED', precision: 0, sortOrder: 3, icon: 'banknote', aliases: ['درهم', 'dirham', 'aed', 'درهم امارات'], externalIds: { brsapi: 'AED' }, providers: { brsapi: 'AED', navasan: 'aed_sell' } },
  { symbol: 'GBP', nameFa: 'پوند انگلیس', nameEn: 'British Pound', assetClass: 'iranian_currency', market: 'iran', quoteCurrency: 'TOMAN', unit: '1 GBP', precision: 0, sortOrder: 4, icon: 'banknote', aliases: ['پوند', 'pound', 'gbp', 'پوند انگلیس'], externalIds: { brsapi: 'GBP' }, providers: { brsapi: 'GBP', navasan: 'gbp_sell' } },
  { symbol: 'TRY', nameFa: 'لیر ترکیه', nameEn: 'Turkish Lira', assetClass: 'iranian_currency', market: 'iran', quoteCurrency: 'TOMAN', unit: '1 TRY', precision: 0, sortOrder: 5, icon: 'banknote', aliases: ['لیر', 'lira', 'try', 'لیر ترکیه'], externalIds: { brsapi: 'TRY' }, providers: { brsapi: 'TRY', navasan: 'try_sell' } },
  { symbol: 'CAD', nameFa: 'دلار کانادا', nameEn: 'Canadian Dollar', assetClass: 'iranian_currency', market: 'iran', quoteCurrency: 'TOMAN', unit: '1 CAD', precision: 0, sortOrder: 6, icon: 'banknote', aliases: ['دلار کانادا', 'canadian dollar', 'cad'], externalIds: { brsapi: 'CAD' }, providers: { brsapi: 'CAD' } },
  { symbol: 'CHF', nameFa: 'فرانک سوئیس', nameEn: 'Swiss Franc', assetClass: 'iranian_currency', market: 'iran', quoteCurrency: 'TOMAN', unit: '1 CHF', precision: 0, sortOrder: 7, icon: 'banknote', aliases: ['فرانک', 'swiss franc', 'chf', 'فرانک سوئیس'], externalIds: { brsapi: 'CHF' }, providers: { brsapi: 'CHF' } },
  { symbol: 'CNY', nameFa: 'یوآن چین', nameEn: 'Chinese Yuan', assetClass: 'iranian_currency', market: 'iran', quoteCurrency: 'TOMAN', unit: '1 CNY', precision: 0, sortOrder: 8, icon: 'banknote', aliases: ['یوآن', 'yuan', 'cny', 'یوآن چین'], externalIds: { brsapi: 'CNY' }, providers: { brsapi: 'CNY' } },
  { symbol: 'IQD', nameFa: 'دینار عراق', nameEn: 'Iraqi Dinar', assetClass: 'iranian_currency', market: 'iran', quoteCurrency: 'TOMAN', unit: '1 IQD', precision: 0, sortOrder: 9, icon: 'banknote', aliases: ['دینار عراق', 'iraqi dinar', 'iqd'], externalIds: { brsapi: 'IQD' }, providers: { brsapi: 'IQD' } },
  { symbol: 'JPY100', nameFa: 'یکصد ین ژاپن', nameEn: '100 Japanese Yen', assetClass: 'iranian_currency', market: 'iran', quoteCurrency: 'TOMAN', unit: '100 JPY', precision: 0, sortOrder: 10, icon: 'banknote', aliases: ['ین', 'yen', 'jpy', 'ین ژاپن'], externalIds: { brsapi: 'JPY' }, providers: { brsapi: 'JPY' } },
  { symbol: 'KWD', nameFa: 'دینار کویت', nameEn: 'Kuwaiti Dinar', assetClass: 'iranian_currency', market: 'iran', quoteCurrency: 'TOMAN', unit: '1 KWD', precision: 0, sortOrder: 11, icon: 'banknote', aliases: ['دینار کویت', 'kuwaiti dinar', 'kwd'], externalIds: { brsapi: 'KWD' }, providers: { brsapi: 'KWD' } },
  { symbol: 'AUD', nameFa: 'دلار استرالیا', nameEn: 'Australian Dollar', assetClass: 'iranian_currency', market: 'iran', quoteCurrency: 'TOMAN', unit: '1 AUD', precision: 0, sortOrder: 12, icon: 'banknote', aliases: ['دلار استرالیا', 'australian dollar', 'aud'], externalIds: { brsapi: 'AUD' }, providers: { brsapi: 'AUD' } },
  { symbol: 'SAR', nameFa: 'ریال عربستان', nameEn: 'Saudi Riyal', assetClass: 'iranian_currency', market: 'iran', quoteCurrency: 'TOMAN', unit: '1 SAR', precision: 0, sortOrder: 13, icon: 'banknote', aliases: ['ریال عربستان', 'saudi riyal', 'sar'], externalIds: { brsapi: 'SAR' }, providers: { brsapi: 'SAR' } },
  { symbol: 'RUB', nameFa: 'روبل روسیه', nameEn: 'Russian Ruble', assetClass: 'iranian_currency', market: 'iran', quoteCurrency: 'TOMAN', unit: '1 RUB', precision: 0, sortOrder: 14, icon: 'banknote', aliases: ['روبل', 'ruble', 'rub'], externalIds: { brsapi: 'RUB' }, providers: { brsapi: 'RUB' } },
  { symbol: 'SEK', nameFa: 'کرون سوئد', nameEn: 'Swedish Krona', assetClass: 'iranian_currency', market: 'iran', quoteCurrency: 'TOMAN', unit: '1 SEK', precision: 0, sortOrder: 15, icon: 'banknote', aliases: ['کرون', 'krona', 'sek'], externalIds: { brsapi: 'SEK' }, providers: { brsapi: 'SEK' } },
  { symbol: 'USDT_IRT', nameFa: 'دلار تتر', nameEn: 'Tether (IRT)', assetClass: 'iranian_currency', market: 'iran', quoteCurrency: 'TOMAN', unit: '1 USDT', precision: 0, sortOrder: 16, icon: 'tether', aliases: ['تتر', 'tether', 'usdt', 'دلار تتر'], externalIds: { brsapi: 'USDT_IRT' }, providers: { brsapi: 'USDT_IRT' } },

  /* ---------------- Iranian gold & coins (BrsApi, Toman) ---------------- */
  { symbol: 'IR_GOLD_18K', nameFa: 'طلای ۱۸ عیار', nameEn: '18K Gold (Iran)', assetClass: 'iranian_gold_coin', market: 'iran', quoteCurrency: 'TOMAN', unit: '1 gram (18k)', precision: 0, sortOrder: 1, icon: 'gold', aliases: ['طلای ۱۸', 'طلای 18', '18k gold', '18 عیار', 'طلای 18 عیار'], externalIds: { brsapi: 'IR_GOLD_18K' }, providers: { brsapi: 'IR_GOLD_18K' } },
  { symbol: 'IR_GOLD_24K', nameFa: 'طلای ۲۴ عیار', nameEn: '24K Gold (Iran)', assetClass: 'iranian_gold_coin', market: 'iran', quoteCurrency: 'TOMAN', unit: '1 gram (24k)', precision: 0, sortOrder: 2, icon: 'gold', aliases: ['طلای ۲۴', 'طلای 24', '24k gold', '24 عیار', 'طلای 24 عیار'], externalIds: { brsapi: 'IR_GOLD_24K' }, providers: { brsapi: 'IR_GOLD_24K' } },
  { symbol: 'IR_GOLD_MELTED', nameFa: 'طلای آب‌شده', nameEn: 'Melted Gold (Iran)', assetClass: 'iranian_gold_coin', market: 'iran', quoteCurrency: 'TOMAN', unit: '1 gram (melted)', precision: 0, sortOrder: 3, icon: 'gold', aliases: ['طلای آب‌شده', 'melted gold', 'طلای آب شده', 'آبشده'], externalIds: { brsapi: 'IR_GOLD_MELTED' }, providers: { brsapi: 'IR_GOLD_MELTED' } },
  { symbol: 'IR_COIN_EMAMI', nameFa: 'سکه امامی', nameEn: 'Emami Coin', assetClass: 'iranian_gold_coin', market: 'iran', quoteCurrency: 'TOMAN', unit: '1 coin', precision: 0, sortOrder: 4, icon: 'coin', aliases: ['سکه امامی', 'امامی', 'emami', 'سکه'], externalIds: { brsapi: 'IR_COIN_EMAMI' }, providers: { brsapi: 'IR_COIN_EMAMI' } },
  { symbol: 'IR_COIN_BAHAR', nameFa: 'سکه بهار آزادی', nameEn: 'Bahar Azadi Coin', assetClass: 'iranian_gold_coin', market: 'iran', quoteCurrency: 'TOMAN', unit: '1 coin', precision: 0, sortOrder: 5, icon: 'coin', aliases: ['بهار آزادی', 'bahar', 'سکه بهار'], externalIds: { brsapi: 'IR_COIN_BAHAR' }, providers: { brsapi: 'IR_COIN_BAHAR' } },
  { symbol: 'IR_COIN_HALF', nameFa: 'نیم سکه', nameEn: 'Half Coin', assetClass: 'iranian_gold_coin', market: 'iran', quoteCurrency: 'TOMAN', unit: '0.5 coin', precision: 0, sortOrder: 6, icon: 'coin', aliases: ['نیم سکه', 'half coin'], externalIds: { brsapi: 'IR_COIN_HALF' }, providers: { brsapi: 'IR_COIN_HALF' } },
  { symbol: 'IR_COIN_QUARTER', nameFa: 'ربع سکه', nameEn: 'Quarter Coin', assetClass: 'iranian_gold_coin', market: 'iran', quoteCurrency: 'TOMAN', unit: '0.25 coin', precision: 0, sortOrder: 7, icon: 'coin', aliases: ['ربع سکه', 'quarter coin'], externalIds: { brsapi: 'IR_COIN_QUARTER' }, providers: { brsapi: 'IR_COIN_QUARTER' } },
  { symbol: 'IR_COIN_1G', nameFa: 'سکه یک گرمی', nameEn: 'One-Gram Coin', assetClass: 'iranian_gold_coin', market: 'iran', quoteCurrency: 'TOMAN', unit: '1 gram coin', precision: 0, sortOrder: 8, icon: 'coin', aliases: ['سکه یک گرمی', 'یک گرمی', 'one gram'], externalIds: { brsapi: 'IR_COIN_1G' }, providers: { brsapi: 'IR_COIN_1G' } },
  { symbol: 'XAU', nameFa: 'انس طلا', nameEn: 'Gold Spot (oz)', assetClass: 'iranian_gold_coin', market: 'global', quoteCurrency: 'USD', unit: '1 troy ounce', precision: 1, sortOrder: 9, icon: 'gold', aliases: ['انس طلا', 'gold ounce', 'xau', 'طلا جهانی', 'اونس'], externalIds: { brsapi: 'XAUUSD', metalsdev: 'XAU' }, providers: { brsapi: 'XAUUSD', metalsdev: 'XAU' } },

  /* ---------------- Global currencies (Frankfurter, USD) ---------------- */
  { symbol: 'FX_USD', nameFa: 'دلار آمریکا (جهانی)', nameEn: 'US Dollar (Global)', assetClass: 'global_currency', market: 'global', quoteCurrency: 'USD', unit: '1 USD', precision: 4, sortOrder: 1, icon: 'dollar', aliases: ['دلار جهانی', 'us dollar global'], providers: { frankfurter: 'USD' } },
  { symbol: 'FX_EUR', nameFa: 'یورو (جهانی)', nameEn: 'Euro (Global)', assetClass: 'global_currency', market: 'global', quoteCurrency: 'USD', unit: '1 EUR', precision: 4, sortOrder: 2, icon: 'euro', aliases: ['یورو جهانی'], providers: { frankfurter: 'EUR' } },
  { symbol: 'FX_GBP', nameFa: 'پوند (جهانی)', nameEn: 'British Pound (Global)', assetClass: 'global_currency', market: 'global', quoteCurrency: 'USD', unit: '1 GBP', precision: 4, sortOrder: 3, icon: 'banknote', aliases: ['پوند جهانی'], providers: { frankfurter: 'GBP' } },
  { symbol: 'FX_JPY', nameFa: 'ین ژاپن (جهانی)', nameEn: 'Japanese Yen (Global)', assetClass: 'global_currency', market: 'global', quoteCurrency: 'USD', unit: '1 JPY', precision: 4, sortOrder: 4, icon: 'banknote', aliases: ['ین جهانی'], providers: { frankfurter: 'JPY' } },
  { symbol: 'FX_CHF', nameFa: 'فرانک سوئیس (جهانی)', nameEn: 'Swiss Franc (Global)', assetClass: 'global_currency', market: 'global', quoteCurrency: 'USD', unit: '1 CHF', precision: 4, sortOrder: 5, icon: 'banknote', aliases: ['فرانک جهانی'], providers: { frankfurter: 'CHF' } },
  { symbol: 'FX_CAD', nameFa: 'دلار کانادا (جهانی)', nameEn: 'Canadian Dollar (Global)', assetClass: 'global_currency', market: 'global', quoteCurrency: 'USD', unit: '1 CAD', precision: 4, sortOrder: 6, icon: 'banknote', aliases: [], providers: { frankfurter: 'CAD' } },
  { symbol: 'FX_AUD', nameFa: 'دلار استرالیا (جهانی)', nameEn: 'Australian Dollar (Global)', assetClass: 'global_currency', market: 'global', quoteCurrency: 'USD', unit: '1 AUD', precision: 4, sortOrder: 7, icon: 'banknote', aliases: [], providers: { frankfurter: 'AUD' } },
  { symbol: 'FX_CNY', nameFa: 'یوآن چین (جهانی)', nameEn: 'Chinese Yuan (Global)', assetClass: 'global_currency', market: 'global', quoteCurrency: 'USD', unit: '1 CNY', precision: 4, sortOrder: 8, icon: 'banknote', aliases: [], providers: { frankfurter: 'CNY' } },
  { symbol: 'FX_TRY', nameFa: 'لیر ترکیه (جهانی)', nameEn: 'Turkish Lira (Global)', assetClass: 'global_currency', market: 'global', quoteCurrency: 'USD', unit: '1 TRY', precision: 4, sortOrder: 9, icon: 'banknote', aliases: [], providers: { frankfurter: 'TRY' } },
  { symbol: 'FX_AED', nameFa: 'درهم امارات (جهانی)', nameEn: 'UAE Dirham (Global)', assetClass: 'global_currency', market: 'global', quoteCurrency: 'USD', unit: '1 AED', precision: 4, sortOrder: 10, icon: 'banknote', aliases: [], providers: { frankfurter: 'AED' } },
  { symbol: 'FX_INR', nameFa: 'روپیه هند (جهانی)', nameEn: 'Indian Rupee (Global)', assetClass: 'global_currency', market: 'global', quoteCurrency: 'USD', unit: '1 INR', precision: 4, sortOrder: 11, icon: 'banknote', aliases: [], providers: { frankfurter: 'INR' } },
  { symbol: 'FX_KRW', nameFa: 'وون کره (جهانی)', nameEn: 'South Korean Won (Global)', assetClass: 'global_currency', market: 'global', quoteCurrency: 'USD', unit: '1 KRW', precision: 4, sortOrder: 12, icon: 'banknote', aliases: [], providers: { frankfurter: 'KRW' } },
  { symbol: 'FX_SGD', nameFa: 'دلار سنگاپور (جهانی)', nameEn: 'Singapore Dollar (Global)', assetClass: 'global_currency', market: 'global', quoteCurrency: 'USD', unit: '1 SGD', precision: 4, sortOrder: 13, icon: 'banknote', aliases: [], providers: { frankfurter: 'SGD' } },
  { symbol: 'FX_HKD', nameFa: 'دلار هنگ‌کنگ (جهانی)', nameEn: 'Hong Kong Dollar (Global)', assetClass: 'global_currency', market: 'global', quoteCurrency: 'USD', unit: '1 HKD', precision: 4, sortOrder: 14, icon: 'banknote', aliases: [], providers: { frankfurter: 'HKD' } },
  { symbol: 'FX_MXN', nameFa: 'پزو مکزیک (جهانی)', nameEn: 'Mexican Peso (Global)', assetClass: 'global_currency', market: 'global', quoteCurrency: 'USD', unit: '1 MXN', precision: 4, sortOrder: 15, icon: 'banknote', aliases: [], providers: { frankfurter: 'MXN' } },
  { symbol: 'FX_BRL', nameFa: 'رئال برزیل (جهانی)', nameEn: 'Brazilian Real (Global)', assetClass: 'global_currency', market: 'global', quoteCurrency: 'USD', unit: '1 BRL', precision: 4, sortOrder: 16, icon: 'banknote', aliases: [], providers: { frankfurter: 'BRL' } },
  { symbol: 'FX_NOK', nameFa: 'کرون نروژ (جهانی)', nameEn: 'Norwegian Krone (Global)', assetClass: 'global_currency', market: 'global', quoteCurrency: 'USD', unit: '1 NOK', precision: 4, sortOrder: 17, icon: 'banknote', aliases: [], providers: { frankfurter: 'NOK' } },
  { symbol: 'FX_SEK', nameFa: 'کرون سوئد (جهانی)', nameEn: 'Swedish Krona (Global)', assetClass: 'global_currency', market: 'global', quoteCurrency: 'USD', unit: '1 SEK', precision: 4, sortOrder: 18, icon: 'banknote', aliases: [], providers: { frankfurter: 'SEK' } },
  { symbol: 'FX_ZAR', nameFa: 'رند آفریقای جنوبی (جهانی)', nameEn: 'South African Rand (Global)', assetClass: 'global_currency', market: 'global', quoteCurrency: 'USD', unit: '1 ZAR', precision: 4, sortOrder: 19, icon: 'banknote', aliases: [], providers: { frankfurter: 'ZAR' } },
  { symbol: 'FX_ILS', nameFa: 'شکل اسرائیل (جهانی)', nameEn: 'Israeli Shekel (Global)', assetClass: 'global_currency', market: 'global', quoteCurrency: 'USD', unit: '1 ILS', precision: 4, sortOrder: 20, icon: 'banknote', aliases: [], providers: { frankfurter: 'ILS' } },

  /* ---------------- Precious metals (Metals.dev / Alpha Vantage) ---------------- */
  { symbol: 'XAG', nameFa: 'نقره', nameEn: 'Silver Spot (oz)', assetClass: 'precious_metal', market: 'global', quoteCurrency: 'USD', unit: '1 troy ounce', precision: 3, sortOrder: 1, icon: 'silver', aliases: ['نقره', 'silver', 'xag'], externalIds: { metalsdev: 'XAG', av: 'XAG' }, providers: { metalsdev: 'XAG', alphavantage: 'XAGUSD' } },
  { symbol: 'XPT', nameFa: 'پلاتین', nameEn: 'Platinum Spot (oz)', assetClass: 'precious_metal', market: 'global', quoteCurrency: 'USD', unit: '1 troy ounce', precision: 2, sortOrder: 2, icon: 'platinum', aliases: ['پلاتین', 'platinum', 'xpt'], externalIds: { metalsdev: 'XPT', av: 'XPT' }, providers: { metalsdev: 'XPT' } },
  { symbol: 'XPD', nameFa: 'پالادیوم', nameEn: 'Palladium Spot (oz)', assetClass: 'precious_metal', market: 'global', quoteCurrency: 'USD', unit: '1 troy ounce', precision: 2, sortOrder: 3, icon: 'palladium', aliases: ['پالادیوم', 'palladium', 'xpd'], externalIds: { metalsdev: 'XPD', av: 'XPD' }, providers: { metalsdev: 'XPD' } },

  /* ---------------- Cryptocurrencies (CoinGecko) ---------------- */
  { symbol: 'BTC', nameFa: 'بیت‌کوین', nameEn: 'Bitcoin', assetClass: 'cryptocurrency', market: 'crypto', quoteCurrency: 'USD', unit: '1 BTC', precision: 0, sortOrder: 1, icon: 'bitcoin', aliases: ['بیت کوین', 'bitcoin', 'btc'], externalIds: { coingecko: 'bitcoin', brsapi: 'BTC' }, providers: { coingecko: 'bitcoin', brsapi: 'BTC' } },
  { symbol: 'ETH', nameFa: 'اتریوم', nameEn: 'Ethereum', assetClass: 'cryptocurrency', market: 'crypto', quoteCurrency: 'USD', unit: '1 ETH', precision: 0, sortOrder: 2, icon: 'ethereum', aliases: ['اتریوم', 'ethereum', 'eth'], externalIds: { coingecko: 'ethereum', brsapi: 'ETH' }, providers: { coingecko: 'ethereum', brsapi: 'ETH' } },
  { symbol: 'USDT', nameFa: 'تتر', nameEn: 'Tether', assetClass: 'cryptocurrency', market: 'crypto', quoteCurrency: 'USD', unit: '1 USDT', precision: 4, sortOrder: 3, icon: 'tether', aliases: ['تتر', 'tether', 'usdt'], externalIds: { coingecko: 'tether', brsapi: 'USDT' }, providers: { coingecko: 'tether', brsapi: 'USDT' } },
  { symbol: 'BNB', nameFa: 'بی‌ان‌بی', nameEn: 'BNB', assetClass: 'cryptocurrency', market: 'crypto', quoteCurrency: 'USD', unit: '1 BNB', precision: 2, sortOrder: 4, icon: 'bnb', aliases: ['bnb', 'بی ان بی'], externalIds: { coingecko: 'binancecoin', brsapi: 'BNB' }, providers: { coingecko: 'binancecoin', brsapi: 'BNB' } },
  { symbol: 'SOL', nameFa: 'سولانا', nameEn: 'Solana', assetClass: 'cryptocurrency', market: 'crypto', quoteCurrency: 'USD', unit: '1 SOL', precision: 2, sortOrder: 5, icon: 'solana', aliases: ['سولانا', 'solana', 'sol'], externalIds: { coingecko: 'solana', brsapi: 'SOL' }, providers: { coingecko: 'solana', brsapi: 'SOL' } },
  { symbol: 'XRP', nameFa: 'ریپل', nameEn: 'XRP', assetClass: 'cryptocurrency', market: 'crypto', quoteCurrency: 'USD', unit: '1 XRP', precision: 4, sortOrder: 6, icon: 'xrp', aliases: ['ریپل', 'xrp', 'ripple'], externalIds: { coingecko: 'ripple', brsapi: 'XRP' }, providers: { coingecko: 'ripple', brsapi: 'XRP' } },
  { symbol: 'DOGE', nameFa: 'دوج‌کوین', nameEn: 'Dogecoin', assetClass: 'cryptocurrency', market: 'crypto', quoteCurrency: 'USD', unit: '1 DOGE', precision: 6, sortOrder: 7, icon: 'doge', aliases: ['دوج کوین', 'dogecoin', 'doge'], externalIds: { coingecko: 'dogecoin', brsapi: 'DOGE' }, providers: { coingecko: 'dogecoin', brsapi: 'DOGE' } },
  { symbol: 'ADA', nameFa: 'کاردانو', nameEn: 'Cardano', assetClass: 'cryptocurrency', market: 'crypto', quoteCurrency: 'USD', unit: '1 ADA', precision: 4, sortOrder: 8, icon: 'ada', aliases: ['کاردانو', 'cardano', 'ada'], externalIds: { coingecko: 'cardano', brsapi: 'ADA' }, providers: { coingecko: 'cardano', brsapi: 'ADA' } },
  { symbol: 'TRX', nameFa: 'ترون', nameEn: 'TRON', assetClass: 'cryptocurrency', market: 'crypto', quoteCurrency: 'USD', unit: '1 TRX', precision: 4, sortOrder: 9, icon: 'trx', aliases: ['ترون', 'tron', 'trx'], externalIds: { coingecko: 'tron', brsapi: 'TRX' }, providers: { coingecko: 'tron', brsapi: 'TRX' } },
  { symbol: 'TON', nameFa: 'تون‌کوین', nameEn: 'Toncoin', assetClass: 'cryptocurrency', market: 'crypto', quoteCurrency: 'USD', unit: '1 TON', precision: 2, sortOrder: 10, icon: 'ton', aliases: ['تون کوین', 'toncoin', 'ton'], externalIds: { coingecko: 'the-open-network' }, providers: { coingecko: 'the-open-network' } },
  { symbol: 'LINK', nameFa: 'چین‌لینک', nameEn: 'Chainlink', assetClass: 'cryptocurrency', market: 'crypto', quoteCurrency: 'USD', unit: '1 LINK', precision: 2, sortOrder: 11, icon: 'link', aliases: ['چین لینک', 'chainlink', 'link'], externalIds: { coingecko: 'chainlink', brsapi: 'LINK' }, providers: { coingecko: 'chainlink', brsapi: 'LINK' } },
  { symbol: 'LTC', nameFa: 'لایت‌کوین', nameEn: 'Litecoin', assetClass: 'cryptocurrency', market: 'crypto', quoteCurrency: 'USD', unit: '1 LTC', precision: 2, sortOrder: 12, icon: 'ltc', aliases: ['لایت کوین', 'litecoin', 'ltc'], externalIds: { coingecko: 'litecoin', brsapi: 'LTC' }, providers: { coingecko: 'litecoin', brsapi: 'LTC' } },
  { symbol: 'AVAX', nameFa: 'آوالانچ', nameEn: 'Avalanche', assetClass: 'cryptocurrency', market: 'crypto', quoteCurrency: 'USD', unit: '1 AVAX', precision: 2, sortOrder: 13, icon: 'avax', aliases: ['آوالانچ', 'avalanche', 'avax'], externalIds: { coingecko: 'avalanche-2', brsapi: 'AVAX' }, providers: { coingecko: 'avalanche-2', brsapi: 'AVAX' } },
  { symbol: 'DOT', nameFa: 'پولکادات', nameEn: 'Polkadot', assetClass: 'cryptocurrency', market: 'crypto', quoteCurrency: 'USD', unit: '1 DOT', precision: 2, sortOrder: 14, icon: 'dot', aliases: ['پولکادات', 'polkadot', 'dot'], externalIds: { coingecko: 'polkadot', brsapi: 'DOT' }, providers: { coingecko: 'polkadot', brsapi: 'DOT' } },
  { symbol: 'SHIB', nameFa: 'شیبا اینو', nameEn: 'Shiba Inu', assetClass: 'cryptocurrency', market: 'crypto', quoteCurrency: 'USD', unit: '1 SHIB', precision: 8, sortOrder: 15, icon: 'shib', aliases: ['شیبا', 'shiba inu', 'shib'], externalIds: { coingecko: 'shiba-inu', brsapi: 'SHIB' }, providers: { coingecko: 'shiba-inu', brsapi: 'SHIB' } },

  /* ---------------- Iranian stocks (BrsApi TSETMC, feature-flagged) ---------------- */
  { symbol: 'TSETMC_KHODRO', nameFa: 'ایران‌خودرو', nameEn: 'Iran Khodro', assetClass: 'iranian_stock', market: 'iran', quoteCurrency: 'IRR', unit: '1 share', precision: 0, sortOrder: 1, icon: 'stock', aliases: ['ایران خودرو', 'khodro', 'خودرو'], enabledByDefault: false, externalIds: { tsetmc: 'khodro' } },
  { symbol: 'TSETMC_FARS', nameFa: 'فولاد مبارکه', nameEn: 'Mobarakeh Steel', assetClass: 'iranian_stock', market: 'iran', quoteCurrency: 'IRR', unit: '1 share', precision: 0, sortOrder: 2, icon: 'stock', aliases: ['فولاد', 'foolad', 'فولاد مبارکه'], enabledByDefault: false, externalIds: { tsetmc: 'fars' } },
  { symbol: 'TSETMC_SHASTA', nameFa: 'شستا', nameEn: 'Social Security Investment', assetClass: 'iranian_stock', market: 'iran', quoteCurrency: 'IRR', unit: '1 share', precision: 0, sortOrder: 3, icon: 'stock', aliases: ['شستا', 'shasta'], enabledByDefault: false, externalIds: { tsetmc: 'shasta' } },
  { symbol: 'TSETMC_MELT', nameFa: 'ملی صنایع مس', nameEn: 'National Iranian Copper', assetClass: 'iranian_stock', market: 'iran', quoteCurrency: 'IRR', unit: '1 share', precision: 0, sortOrder: 4, icon: 'stock', aliases: ['مس', 'ملی مس', 'copper'], enabledByDefault: false, externalIds: { tsetmc: 'melt' } },
  { symbol: 'TSETMC_PSHARAK', nameFa: 'پتروشیمی خلیج فارس', nameEn: 'Persian Gulf Petrochemical', assetClass: 'iranian_stock', market: 'iran', quoteCurrency: 'IRR', unit: '1 share', precision: 0, sortOrder: 5, icon: 'stock', aliases: ['خلیج فارس', 'پتروشیمی', 'psharak'], enabledByDefault: false, externalIds: { tsetmc: 'psharak' } },

  /* ---------------- Global markets (Alpha Vantage, experimental) ---------------- */
  { symbol: 'AV_AAPL', nameFa: 'اپل', nameEn: 'Apple Inc.', assetClass: 'global_market', market: 'global', quoteCurrency: 'USD', unit: '1 share', precision: 2, sortOrder: 1, icon: 'stock', aliases: ['apple', 'اپل', 'aapl'], enabledByDefault: false, externalIds: { av: 'AAPL', finnhub: 'AAPL' }, providers: { alphavantage: 'AAPL', finnhub: 'AAPL' } },
  { symbol: 'AV_MSFT', nameFa: 'مایکروسافت', nameEn: 'Microsoft Corp.', assetClass: 'global_market', market: 'global', quoteCurrency: 'USD', unit: '1 share', precision: 2, sortOrder: 2, icon: 'stock', aliases: ['microsoft', 'مایکروسافت', 'msft'], enabledByDefault: false, externalIds: { av: 'MSFT', finnhub: 'MSFT' }, providers: { alphavantage: 'MSFT', finnhub: 'MSFT' } },
  { symbol: 'AV_GOOGL', nameFa: 'آلفابت', nameEn: 'Alphabet Inc.', assetClass: 'global_market', market: 'global', quoteCurrency: 'USD', unit: '1 share', precision: 2, sortOrder: 3, icon: 'stock', aliases: ['google', 'گوگل', 'googl'], enabledByDefault: false, externalIds: { av: 'GOOGL', finnhub: 'GOOGL' }, providers: { alphavantage: 'GOOGL', finnhub: 'GOOGL' } },
  { symbol: 'AV_AMZN', nameFa: 'آمازون', nameEn: 'Amazon.com Inc.', assetClass: 'global_market', market: 'global', quoteCurrency: 'USD', unit: '1 share', precision: 2, sortOrder: 4, icon: 'stock', aliases: ['amazon', 'آمازون', 'amzn'], enabledByDefault: false, externalIds: { av: 'AMZN', finnhub: 'AMZN' }, providers: { alphavantage: 'AMZN', finnhub: 'AMZN' } },
  { symbol: 'AV_NVDA', nameFa: 'انویدیا', nameEn: 'NVIDIA Corp.', assetClass: 'global_market', market: 'global', quoteCurrency: 'USD', unit: '1 share', precision: 2, sortOrder: 5, icon: 'stock', aliases: ['nvidia', 'انویدیا', 'nvda'], enabledByDefault: false, externalIds: { av: 'NVDA', finnhub: 'NVDA' }, providers: { alphavantage: 'NVDA', finnhub: 'NVDA' } },
  { symbol: 'AV_TSLA', nameFa: 'تسلا', nameEn: 'Tesla Inc.', assetClass: 'global_market', market: 'global', quoteCurrency: 'USD', unit: '1 share', precision: 2, sortOrder: 6, icon: 'stock', aliases: ['tesla', 'تسلا', 'tsla'], enabledByDefault: false, externalIds: { av: 'TSLA', finnhub: 'TSLA' }, providers: { alphavantage: 'TSLA', finnhub: 'TSLA' } },
  { symbol: 'AV_META', nameFa: 'متا', nameEn: 'Meta Platforms', assetClass: 'global_market', market: 'global', quoteCurrency: 'USD', unit: '1 share', precision: 2, sortOrder: 7, icon: 'stock', aliases: ['meta', 'متا', 'facebook'], enabledByDefault: false, externalIds: { av: 'META', finnhub: 'META' }, providers: { alphavantage: 'META', finnhub: 'META' } },
  { symbol: 'AV_SPY', nameFa: 'شاخص اس‌اند‌پی ۵۰۰', nameEn: 'S&P 500 ETF (SPY)', assetClass: 'global_market', market: 'global', quoteCurrency: 'USD', unit: '1 share', precision: 2, sortOrder: 7, icon: 'activity', aliases: ['spy', 'اس اند پی', 's&p 500'], enabledByDefault: false, externalIds: { av: 'SPY', finnhub: 'SPY' }, providers: { alphavantage: 'SPY', finnhub: 'SPY' } },
  { symbol: 'OIL_WTI', nameFa: 'نفت وست تگزاس', nameEn: 'WTI Crude Oil', assetClass: 'global_market', market: 'commodities', quoteCurrency: 'USD', unit: '1 barrel', precision: 2, sortOrder: 8, icon: 'oil', aliases: ['نفت', 'wti', 'وست تگزاس', 'oil'], enabledByDefault: false, externalIds: { av: 'WTI', eia: 'PET.RWTC.D' }, providers: { alphavantage: 'WTI', eia: 'PET.RWTC.D' } },
  { symbol: 'OIL_BRENT', nameFa: 'نفت برنت', nameEn: 'Brent Crude Oil', assetClass: 'global_market', market: 'commodities', quoteCurrency: 'USD', unit: '1 barrel', precision: 2, sortOrder: 9, icon: 'oil', aliases: ['برنت', 'brent'], enabledByDefault: false, externalIds: { av: 'BRENT', eia: 'PET.RBRTE.D' }, providers: { alphavantage: 'BRENT', eia: 'PET.RBRTE.D' } },
  { symbol: 'GAS_NATURAL', nameFa: 'گاز طبیعی', nameEn: 'Natural Gas', assetClass: 'global_market', market: 'commodities', quoteCurrency: 'USD', unit: '1 MMBtu', precision: 3, sortOrder: 10, icon: 'gas', aliases: ['گاز طبیعی', 'natural gas'], enabledByDefault: false, externalIds: { av: 'NATURAL GAS', eia: 'NG.RNGWHHD.D' }, providers: { alphavantage: 'NATURAL GAS', eia: 'NG.RNGWHHD.D' } },
  { symbol: 'COPPER', nameFa: 'مس جهانی', nameEn: 'Copper', assetClass: 'global_market', market: 'commodities', quoteCurrency: 'USD', unit: '1 pound', precision: 3, sortOrder: 11, icon: 'copper', aliases: ['مس جهانی', 'copper'], enabledByDefault: false, externalIds: { av: 'COPPER' }, providers: { alphavantage: 'COPPER' } },
  { symbol: 'WHEAT', nameFa: 'گندم', nameEn: 'Wheat', assetClass: 'global_market', market: 'commodities', quoteCurrency: 'USD', unit: '1 bushel', precision: 3, sortOrder: 12, icon: 'wheat', aliases: ['گندم', 'wheat'], enabledByDefault: false, externalIds: { av: 'WHEAT' }, providers: { alphavantage: 'WHEAT' } },
  { symbol: 'CORN', nameFa: 'ذرت', nameEn: 'Corn', assetClass: 'global_market', market: 'commodities', quoteCurrency: 'USD', unit: '1 bushel', precision: 3, sortOrder: 13, icon: 'corn', aliases: ['ذرت', 'corn'], enabledByDefault: false, externalIds: { av: 'CORN' }, providers: { alphavantage: 'CORN' } },

  /* ---------------- Economic indicators (FRED) ---------------- */
  { symbol: 'ECON_CPI', nameFa: 'تورم آمریکا (CPI)', nameEn: 'US CPI Inflation', assetClass: 'economic_indicator', market: 'macro', quoteCurrency: 'USD', unit: 'index', precision: 1, sortOrder: 1, icon: 'activity', aliases: ['تورم', 'cpi', 'inflation'], enabledByDefault: false, externalIds: { fred: 'CPIAUCSL' }, providers: { fred: 'CPIAUCSL' } },
  { symbol: 'ECON_FEDFUNDS', nameFa: 'نرخ بهره فدرال', nameEn: 'Federal Funds Rate', assetClass: 'economic_indicator', market: 'macro', quoteCurrency: 'USD', unit: 'percent', precision: 2, sortOrder: 2, icon: 'activity', aliases: ['نرخ بهره', 'fed rate', 'فدرال'], enabledByDefault: false, externalIds: { fred: 'FEDFUNDS' }, providers: { fred: 'FEDFUNDS' } },
  { symbol: 'ECON_UNRATE', nameFa: 'نرخ بیکاری آمریکا', nameEn: 'US Unemployment Rate', assetClass: 'economic_indicator', market: 'macro', quoteCurrency: 'USD', unit: 'percent', precision: 2, sortOrder: 3, icon: 'activity', aliases: ['بیکاری', 'unemployment'], enabledByDefault: false, externalIds: { fred: 'UNRATE' }, providers: { fred: 'UNRATE' } },
  { symbol: 'ECON_DGS10', nameFa: 'بازده اوراق ۱۰ ساله', nameEn: '10-Year Treasury Yield', assetClass: 'economic_indicator', market: 'macro', quoteCurrency: 'USD', unit: 'percent', precision: 2, sortOrder: 4, icon: 'activity', aliases: ['اوراق', 'treasury', 'بازده'], enabledByDefault: false, externalIds: { fred: 'DGS10' }, providers: { fred: 'DGS10' } },
  { symbol: 'ECON_DXY', nameFa: 'شاخص دلار', nameEn: 'US Dollar Index (proxy)', assetClass: 'economic_indicator', market: 'macro', quoteCurrency: 'USD', unit: 'index', precision: 2, sortOrder: 5, icon: 'activity', aliases: ['دلار index', 'dxy', 'شاخص دلار'], enabledByDefault: false, externalIds: { fred: 'DTWEXBGS' }, providers: { fred: 'DTWEXBGS' } },
  { symbol: 'ECON_WTI', nameFa: 'نفت (سری اقتصادی)', nameEn: 'Crude Oil (economic series)', assetClass: 'economic_indicator', market: 'macro', quoteCurrency: 'USD', unit: 'USD/barrel', precision: 2, sortOrder: 6, icon: 'activity', aliases: ['نفت اقتصادی'], enabledByDefault: false, externalIds: { fred: 'DCOILWTICO' }, providers: { fred: 'DCOILWTICO' } },
];

export type SeedAssetWithFlags = SeedAsset & { enabledByDefault?: boolean };

export const ASSET_BY_SYMBOL: Record<string, SeedAsset> = Object.fromEntries(
  SEED_ASSETS.map((a) => [a.symbol, a])
);

/** Assets that appear on the home page "market summary" section. */
export const HOME_ASSET_SYMBOLS: string[] = [
  'USD', 'EUR', 'AED', 'IR_GOLD_18K', 'IR_GOLD_24K', 'IR_GOLD_MELTED', 'XAU',
  'IR_COIN_EMAMI', 'IR_COIN_HALF', 'IR_COIN_QUARTER', 'BTC', 'ETH',
];

/** Default conversion presets shown in the converter UI. */
export const CONVERTER_PRESETS: { from: string; to: string; labelFa: string; labelEn: string }[] = [
  { from: 'USD', to: 'TOMAN', labelFa: 'دلار به تومان', labelEn: 'USD to Toman' },
  { from: 'EUR', to: 'TOMAN', labelFa: 'یورو به تومان', labelEn: 'EUR to Toman' },
  { from: 'TOMAN', to: 'USD', labelFa: 'تومان به دلار', labelEn: 'Toman to USD' },
  { from: 'XAU', to: 'GRAM_24K', labelFa: 'انس طلا به گرم', labelEn: 'Gold ounce to gram' },
  { from: 'GRAM_24K', to: 'GRAM_18K', labelFa: '۲۴ عیار به ۱۸ عیار', labelEn: '24K to 18K gold' },
  { from: 'BTC', to: 'USD', labelFa: 'بیت‌کوین به دلار', labelEn: 'BTC to USD' },
  { from: 'BTC', to: 'TOMAN', labelFa: 'بیت‌کوین به تومان', labelEn: 'BTC to Toman' },
];
