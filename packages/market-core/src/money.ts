import { Decimal } from 'decimal.js';

// Global decimal configuration: high precision for financial math.
Decimal.set({ precision: 40, rounding: Decimal.ROUND_HALF_UP });

/** Parse any numeric input (number | string | Decimal) into a Decimal. */
export function dec(value: Decimal.Value): Decimal {
  if (value instanceof Decimal) return value;
  return new Decimal(value);
}

/** Convert a string/number to a fixed-point decimal string with `dp` places. */
export function toDecimalString(value: Decimal.Value, dp = 8): string {
  return dec(value).toFixed(dp);
}

export function isPositive(value: Decimal.Value): boolean {
  return dec(value).gt(0);
}

/* ------------------------------------------------------------------ */
/* Rial / Toman                                                        */
/* ------------------------------------------------------------------ */

export const TOMAN_PER_RIAL = new Decimal(0.1);
export const RIAL_PER_TOMAN = new Decimal(10);

export function rialToToman(rial: Decimal.Value): Decimal {
  return dec(rial).mul(TOMAN_PER_RIAL);
}

export function tomanToRial(toman: Decimal.Value): Decimal {
  return dec(toman).mul(RIAL_PER_TOMAN);
}

/* ------------------------------------------------------------------ */
/* Gold units                                                          */
/* ------------------------------------------------------------------ */

/** Troy ounce -> gram (avoirdupois-free, troy system). */
export const GRAMS_PER_TROY_OUNCE = new Decimal('31.1034768');

export function troyOunceToGram(ounces: Decimal.Value): Decimal {
  return dec(ounces).mul(GRAMS_PER_TROY_OUNCE);
}

export function gramToTroyOunce(grams: Decimal.Value): Decimal {
  return dec(grams).div(GRAMS_PER_TROY_OUNCE);
}

/** Gold purity factors (fineness). */
export const KARAT_FINENESS: Record<number, Decimal> = {
  24: new Decimal('0.999'),
  22: new Decimal('0.916'),
  21: new Decimal('0.875'),
  18: new Decimal('0.750'),
  14: new Decimal('0.585'),
  9: new Decimal('0.375'),
};

/**
 * Theoretical conversion between karat grades by pure-gold content.
 * E.g. gram of 24k -> equivalent grams of 18k: value * fineness(24)/fineness(18).
 */
export function karatToKarat(grams: Decimal.Value, fromKarat: number, toKarat: number): Decimal {
  const from = KARAT_FINENESS[fromKarat];
  const to = KARAT_FINENESS[toKarat];
  if (!from || !to) throw new Error(`Unsupported karat: ${fromKarat} or ${toKarat}`);
  return dec(grams).mul(from).div(to);
}

/**
 * Theoretical gold price per gram from an ounce price in the same currency.
 * pricePerGram = ouncePrice / 31.1034768  (24k equivalent).
 */
export function goldPricePerGram(ouncePrice: Decimal.Value): Decimal {
  return dec(ouncePrice).div(GRAMS_PER_TROY_OUNCE);
}

/**
 * Price of 1 gram of 18k gold given the price of 1 gram of 24k gold
 * (theoretical, by pure-gold content): price18 = price24 × fineness(18)/fineness(24).
 */
export function gramPrice24kTo18k(pricePerGram24k: Decimal.Value): Decimal {
  return dec(pricePerGram24k).mul(KARAT_FINENESS[18]!).div(KARAT_FINENESS[24]!);
}

/* ------------------------------------------------------------------ */
/* Change calculations                                                 */
/* ------------------------------------------------------------------ */

export function absoluteChange(current: Decimal.Value, previous: Decimal.Value): Decimal {
  return dec(current).minus(dec(previous));
}

/**
 * Percentage change between previous and current.
 * Returns null when previous is zero (undefined), never Infinity.
 */
export function percentChange(current: Decimal.Value, previous: Decimal.Value): Decimal | null {
  const prev = dec(previous);
  if (prev.isZero()) return null;
  return dec(current).minus(prev).div(prev).mul(100);
}

/* ------------------------------------------------------------------ */
/* OHLC aggregation                                                    */
/* ------------------------------------------------------------------ */

export interface OhlcInput {
  time: Date | number;
  price: Decimal.Value;
  volume?: Decimal.Value;
}

export interface OhlcBar {
  startTime: Date;
  endTime: Date;
  open: Decimal;
  high: Decimal;
  low: Decimal;
  close: Decimal;
  volume: Decimal;
  sampleCount: number;
}

/**
 * Aggregate raw ticks into fixed-interval OHLC bars.
 * Bucket alignment is epoch-based so bars align across restarts.
 */
export function aggregateOhlc(input: OhlcInput[], intervalMs: number, endTimeOffsetMs = intervalMs): OhlcBar[] {
  const buckets = new Map<number, OhlcBar>();
  const sorted = [...input].sort((a, b) => {
    const ta = typeof a.time === 'number' ? a.time : a.time.getTime();
    const tb = typeof b.time === 'number' ? b.time : b.time.getTime();
    return ta - tb;
  });

  for (const tick of sorted) {
    const t = typeof tick.time === 'number' ? tick.time : tick.time.getTime();
    const bucketStart = Math.floor(t / intervalMs) * intervalMs;
    let bar = buckets.get(bucketStart);
    if (!bar) {
      bar = {
        startTime: new Date(bucketStart),
        endTime: new Date(bucketStart + endTimeOffsetMs),
        open: dec(tick.price),
        high: dec(tick.price),
        low: dec(tick.price),
        close: dec(tick.price),
        volume: dec(tick.volume ?? 0),
        sampleCount: 0,
      };
      buckets.set(bucketStart, bar);
    } else {
      bar.high = Decimal.max(bar.high, dec(tick.price));
      bar.low = Decimal.min(bar.low, dec(tick.price));
      bar.close = dec(tick.price);
      bar.volume = bar.volume.plus(dec(tick.volume ?? 0));
    }
    bar.sampleCount += 1;
  }

  return [...buckets.values()].sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
}

/** Interval label -> milliseconds. */
export const INTERVAL_MS: Record<string, number> = {
  '5m': 5 * 60_000,
  '15m': 15 * 60_000,
  '1h': 60 * 60_000,
  '1d': 24 * 60 * 60_000,
  '1w': 7 * 24 * 60 * 60_000,
  '1mo': 30 * 24 * 60 * 60_000,
};

export function intervalToMs(interval: string): number {
  const ms = INTERVAL_MS[interval];
  if (!ms) throw new Error(`Unknown interval: ${interval}`);
  return ms;
}

/**
 * Resolve which historical ranges are actually available given the data span.
 * Returns empty array when no data at all.
 */
export function resolveAvailableRanges(
  firstDataTime: Date | null,
  now: Date = new Date()
): ('1D' | '7D' | '1M' | '3M' | '6M' | '1Y' | '5Y' | 'MAX')[] {
  if (!firstDataTime) return [];
  const spanMs = now.getTime() - firstDataTime.getTime();
  const DAY = 24 * 3600_000;
  const ranges: ('1D' | '7D' | '1M' | '3M' | '6M' | '1Y' | '5Y' | 'MAX')[] = [];
  // A range is available if we have at least 60% of its span, or the whole span for small ranges.
  const check = (range: (typeof ranges)[number], neededMs: number) => {
    if (spanMs >= neededMs * 0.6) ranges.push(range);
  };
  check('1D', 1 * DAY);
  check('7D', 7 * DAY);
  check('1M', 30 * DAY);
  check('3M', 90 * DAY);
  check('6M', 180 * DAY);
  check('1Y', 365 * DAY);
  check('5Y', 5 * 365 * DAY);
  check('MAX', 10 * 365 * DAY);
  return ranges.length > 0 ? ranges : [];
}
