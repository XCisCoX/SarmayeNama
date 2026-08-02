import { Decimal } from 'decimal.js';
import { GRAMS_PER_TROY_OUNCE } from '@sarmaye/market-core';
import type { ConversionResult, FreshnessStatus } from '@sarmaye/shared';

/**
 * Currency & gold converter (pure logic, unit-testable).
 *
 * Value model: every convertible unit has a price in a quote currency.
 *   - Iranian assets quote in TOMAN (direct)
 *   - Global assets quote in USD (direct)
 *   - GRAM_24K / GRAM_18K are DERIVED from XAU (oz price in USD)
 *   - TOMAN and RIAL are pseudo-assets
 * Conversions route through Toman or USD as the hub; results are labeled
 * direct or derived and always list their input sources.
 */

export const KARAT_18_FINENESS = new Decimal('0.750');
export const KARAT_24_FINENESS = new Decimal('0.999');

export interface ConverterAssetInput {
  symbol: string;
  nameFa: string;
  quoteCurrency: 'TOMAN' | 'USD' | 'EUR' | string;
  price: string;
  providerCode: string;
  freshness: FreshnessStatus;
}

export interface ConverterContext {
  /** Live quotes keyed by canonical symbol. */
  quotes: Record<string, ConverterAssetInput>;
  lang: 'fa' | 'en';
  now?: Date;
}

interface ValueNode {
  symbol: string;
  /** Value of 1 unit in USD (null if unknown). */
  usd: Decimal | null;
  /** Value of 1 unit in Toman (null if unknown). */
  toman: Decimal | null;
  /** true when the USD value comes from a direct quote. */
  usdDirect: boolean;
  /** true when the Toman value comes from a direct quote. */
  tomanDirect: boolean;
  /** Human formula for deriving this node's value. */
  formula: string;
  sources: { symbol: string; nameFa: string; price: string; providerCode: string; freshness: FreshnessStatus }[];
}

const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';

function faNum(value: Decimal.Value): string {
  return new Decimal(value).toDecimalPlaces(4).toString().replace(/\d/g, (d) => FA_DIGITS[Number(d)]);
}

export function convert(input: {
  from: string;
  to: string;
  amount: string;
  quotes: Record<string, ConverterAssetInput>;
  lang?: 'fa' | 'en';
}): ConversionResult {
  const { from, to, amount, quotes } = input;
  const lang = input.lang ?? 'fa';
  const amt = new Decimal(amount || '1');

  const nodes = buildNodes(quotes);
  const fromNode = nodes.get(from);
  const toNode = nodes.get(to);
  if (!fromNode || !toNode) {
    throw new Error(
      lang === 'fa'
        ? `امکان تبدیل «${from}» به «${to}» وجود ندارد`
        : `Cannot convert "${from}" to "${to}"`
    );
  }

  // Path selection: prefer a shared currency hub.
  const path = findPath(fromNode, toNode);

  if (!path) {
    throw new Error(
      lang === 'fa'
        ? `نرخ تبدیل ${from} به ${to} در دسترس نیست`
        : `No conversion rate available for ${from} to ${to}`
    );
  }

  const result = amt.mul(path.rate);
  const sources = [...new Map([...fromNode.sources, ...toNode.sources].map((s) => [s.symbol, s])).values()];

  return {
    from,
    to,
    amount: amt.toString(),
    result: result.toDecimalPlaces(8).toString(),
    rate: path.rate.toDecimalPlaces(8).toString(),
    formula: path.formula,
    direct: path.direct,
    sourceAssets: sources,
    timestamp: new Date().toISOString(),
  };
}

interface Path {
  rate: Decimal;
  direct: boolean;
  formula: string;
}

function findPath(from: ValueNode, to: ValueNode): Path | null {
  // Same symbol
  if (from.symbol === to.symbol) {
    return { rate: new Decimal(1), direct: true, formula: '1:1' };
  }

  // Priority 1: both sides have a DIRECT USD value (e.g. BTC -> USD).
  if (from.usdDirect && from.usd && to.usdDirect && to.usd) {
    return {
      rate: from.usd.div(to.usd),
      direct: true,
      formula: `(${from.symbol} → دلار) ÷ (${to.symbol} → دلار)`,
    };
  }

  // Priority 2: both sides have a DIRECT Toman value (e.g. EUR -> TOMAN).
  if (from.tomanDirect && from.toman && to.tomanDirect && to.toman) {
    return {
      rate: from.toman.div(to.toman),
      direct: true,
      formula: `(${from.symbol} → تومان) ÷ (${to.symbol} → تومان)`,
    };
  }

  // Priority 3: both have USD values -> route through USD (derived).
  if (from.usd && to.usd) {
    return {
      rate: from.usd.div(to.usd),
      direct: false,
      formula: derivedFormula(from, to, 'دلار'),
    };
  }

  // Priority 4: both have Toman values -> route through Toman (derived).
  if (from.toman && to.toman) {
    return {
      rate: from.toman.div(to.toman),
      direct: false,
      formula: derivedFormula(from, to, 'تومان'),
    };
  }

  // Mixed: one side only in USD, other only in Toman -> bridge via USD-in-Toman.
  if (from.usd && to.toman) {
    const usdInToman = findUsdInTomanNode(from) ?? findUsdInTomanNode(to);
    if (!usdInToman) return null;
    const rate = from.usd.mul(usdInToman.value).div(to.toman);
    return { rate, direct: false, formula: `${from.symbol}→دلار × دلار→تومان ÷ ${to.symbol}→تومان` };
  }
  if (from.toman && to.usd) {
    const usdInToman = findUsdInTomanNode(from) ?? findUsdInTomanNode(to);
    if (!usdInToman) return null;
    const rate = from.toman.div(to.usd.mul(usdInToman.value));
    return { rate, direct: false, formula: `${from.symbol}→تومان ÷ (${to.symbol}→دلار × دلار→تومان)` };
  }
  return null;
}

/**
 * Human formula for derived (multi-hop) paths. When the target node is
 * itself derived directly from the source node (e.g. XAU -> GRAM_24K), the
 * node's own formula is the clearest description.
 */
function derivedFormula(from: ValueNode, to: ValueNode, hub: string): string {
  if (to.sources.length === 1 && to.sources[0]!.symbol === from.symbol) return to.formula;
  if (from.sources.length === 1 && from.sources[0]!.symbol === to.symbol) return `۱ ÷ (${from.formula})`;
  return `(${from.symbol} → ${hub}) ÷ (${to.symbol} → ${hub}) — از طریق ${hub}`;
}

function findUsdInTomanNode(node: ValueNode): { value: Decimal } | null {
  // Search the sources for a USD-in-Toman direct quote (symbol USD with toman value).
  for (const s of node.sources) {
    if (s.symbol === 'USD' && s.price) {
      return { value: new Decimal(s.price) };
    }
  }
  return null;
}

function buildNodes(quotes: Record<string, ConverterAssetInput>): Map<string, ValueNode> {
  const nodes = new Map<string, ValueNode>();
  const q = quotes;

  const add = (node: ValueNode) => nodes.set(node.symbol, node);

  // Pseudo-assets
  add({
    symbol: 'TOMAN',
    usd: null,
    toman: new Decimal(1),
    usdDirect: false,
    tomanDirect: true,
    formula: '1 تومان = ۱ تومان',
    sources: [],
  });
  add({
    symbol: 'RIAL',
    usd: null,
    toman: new Decimal('0.1'),
    usdDirect: false,
    tomanDirect: true,
    formula: '۱ ریال = ۰٫۱ تومان',
    sources: [],
  });

  // USD price in Toman (Iranian free market quote) — the bridge.
  const usdQuote = q['USD'];
  const usdInToman = usdQuote ? new Decimal(usdQuote.price) : null;

  // Real assets
  for (const asset of Object.values(q)) {
    const price = new Decimal(asset.price);
    if (price.isZero()) continue;
    const sources = [
      {
        symbol: asset.symbol,
        nameFa: asset.nameFa,
        price: asset.price,
        providerCode: asset.providerCode,
        freshness: asset.freshness,
      },
    ];
    if (asset.quoteCurrency === 'TOMAN') {
      add({
        symbol: asset.symbol,
        usd: usdInToman ? price.div(usdInToman) : null,
        toman: price,
        // The USD asset itself is the USD hub: its USD value is definitionally direct.
        usdDirect: asset.symbol === 'USD',
        tomanDirect: true,
        formula: `${asset.symbol} قیمت مستقیم بازار آزاد (تومان)`,
        sources,
      });
    } else if (asset.quoteCurrency === 'USD') {
      add({
        symbol: asset.symbol,
        usd: price,
        toman: usdInToman ? price.mul(usdInToman) : null,
        usdDirect: true,
        tomanDirect: false,
        formula: `${asset.symbol} قیمت مستقیم (دلار)`,
        sources,
      });
    } else if (asset.quoteCurrency === 'EUR') {
      // EUR-quoted asset: value in USD needs EUR/USD rate from FX_EUR quote.
      const eurUsd = q['FX_EUR'] ? new Decimal(q['FX_EUR'].price) : null;
      if (!eurUsd) continue;
      const usdValue = price.mul(eurUsd);
      add({
        symbol: asset.symbol,
        usd: usdValue,
        toman: usdInToman ? usdValue.mul(usdInToman) : null,
        usdDirect: false,
        tomanDirect: false,
        formula: `${asset.symbol} (یورو) × نرخ یورو به دلار`,
        sources: [...sources, { symbol: 'FX_EUR', nameFa: 'یورو (جهانی)', price: q['FX_EUR'].price, providerCode: q['FX_EUR'].providerCode, freshness: q['FX_EUR'].freshness }],
      });
    }
  }

  // Derived gold units from XAU (ounce, USD)
  const xau = q['XAU'];
  if (xau && new Decimal(xau.price).gt(0)) {
    const xauUsd = new Decimal(xau.price);
    const gram24 = xauUsd.div(GRAMS_PER_TROY_OUNCE);
    const gram18 = gram24.mul(KARAT_18_FINENESS).div(KARAT_24_FINENESS);
    const xauSource = {
      symbol: 'XAU',
      nameFa: xau.nameFa,
      price: xau.price,
      providerCode: xau.providerCode,
      freshness: xau.freshness,
    };
    add({
      symbol: 'GRAM_24K',
      usd: gram24,
      toman: usdInToman ? gram24.mul(usdInToman) : null,
      usdDirect: false,
      tomanDirect: false,
      formula: 'قیمت اونس طلا ÷ ۳۱٫۱۰۳۴۷۶۸ (گرم طلای ۲۴ عیار)',
      sources: [xauSource],
    });
    add({
      symbol: 'GRAM_18K',
      usd: gram18,
      toman: usdInToman ? gram18.mul(usdInToman) : null,
      usdDirect: false,
      tomanDirect: false,
      formula: 'قیمت گرم ۲۴ عیار × (۰٫۷۵ ÷ ۰٫۹۹۹) — تبدیل تئوریک عیار',
      sources: [xauSource],
    });
  }

  return nodes;
}

export { faNum };
