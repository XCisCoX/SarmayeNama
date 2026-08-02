import { describe, expect, it } from 'vitest';
import {
  rialToToman,
  tomanToRial,
  troyOunceToGram,
  gramToTroyOunce,
  goldPricePerGram,
  gramPrice24kTo18k,
  karatToKarat,
  absoluteChange,
  percentChange,
  aggregateOhlc,
  resolveAvailableRanges,
  intervalToMs,
} from '../src/index.js';

describe('Rial / Toman conversion', () => {
  it('converts rial to toman (divide by 10)', () => {
    expect(rialToToman('816500').toString()).toBe('81650');
  });
  it('converts toman to rial (multiply by 10)', () => {
    expect(tomanToRial('81650').toString()).toBe('816500');
  });
  it('round-trips exactly', () => {
    expect(tomanToRial(rialToToman('123456789')).toString()).toBe('123456789');
  });
});

describe('Gold unit conversion', () => {
  it('converts troy ounce to gram using 31.1034768', () => {
    expect(troyOunceToGram(1).toDecimalPlaces(6).toString()).toBe('31.103477');
  });
  it('converts gram back to ounce', () => {
    expect(gramToTroyOunce('31.1034768').toDecimalPlaces(10).toString()).toBe('1');
  });
  it('computes gold price per gram from ounce price', () => {
    const perGram = goldPricePerGram('3200');
    expect(perGram.toDecimalPlaces(4).toString()).toBe('102.8824');
  });
  it('18k theoretical price is 0.75075 of 24k price', () => {
    const p18 = gramPrice24kTo18k('100');
    expect(p18.toDecimalPlaces(4).toString()).toBe('75.0751');
  });
  it('karat-to-karat weight equivalence', () => {
    // 1 g of 24k has the same gold content as 1.332 g of 18k
    expect(karatToKarat(1, 24, 18).toDecimalPlaces(3).toString()).toBe('1.332');
  });
  it('rejects unknown karat values', () => {
    expect(() => karatToKarat(1, 23, 18)).toThrow();
  });
});

describe('Change calculations', () => {
  it('absolute change', () => {
    expect(absoluteChange('100', '90').toString()).toBe('10');
    expect(absoluteChange('80', '90').toString()).toBe('-10');
  });
  it('percentage change', () => {
    expect(percentChange('110', '100')!.toDecimalPlaces(2).toString()).toBe('10');
    expect(percentChange('90', '100')!.toDecimalPlaces(2).toString()).toBe('-10');
  });
  it('returns null (not Infinity) when previous is zero', () => {
    expect(percentChange('5', '0')).toBeNull();
  });
});

describe('OHLC aggregation', () => {
  const base = Date.UTC(2026, 0, 1, 0, 0, 0);
  it('builds a single bar from ticks', () => {
    const bars = aggregateOhlc(
      [
        { time: base, price: 10 },
        { time: base + 1000, price: 12 },
        { time: base + 2000, price: 9 },
        { time: base + 3000, price: 11 },
      ],
      60_000
    );
    expect(bars).toHaveLength(1);
    expect(bars[0]!.open.toString()).toBe('10');
    expect(bars[0]!.high.toString()).toBe('12');
    expect(bars[0]!.low.toString()).toBe('9');
    expect(bars[0]!.close.toString()).toBe('11');
    expect(bars[0]!.sampleCount).toBe(4);
  });
  it('splits ticks across buckets and sorts ascending', () => {
    const bars = aggregateOhlc(
      [
        { time: base + 70_000, price: 20 },
        { time: base, price: 10 },
      ],
      60_000
    );
    expect(bars).toHaveLength(2);
    expect(bars[0]!.startTime.getTime()).toBe(base);
    expect(bars[1]!.startTime.getTime()).toBe(base + 60_000);
  });
  it('accumulates volume', () => {
    const bars = aggregateOhlc(
      [
        { time: base, price: 10, volume: 5 },
        { time: base + 1000, price: 12, volume: 3 },
      ],
      60_000
    );
    expect(bars[0]!.volume.toString()).toBe('8');
  });
});

describe('Intervals & ranges', () => {
  it('maps interval labels to milliseconds', () => {
    expect(intervalToMs('5m')).toBe(300_000);
    expect(intervalToMs('1h')).toBe(3_600_000);
    expect(intervalToMs('1d')).toBe(86_400_000);
    expect(() => intervalToMs('9x')).toThrow();
  });
  it('resolves available ranges from data span', () => {
    const now = new Date('2026-07-01T00:00:00Z');
    const ranges = resolveAvailableRanges(new Date('2026-01-01T00:00:00Z'), now);
    expect(ranges).toContain('6M');
    // 181 days of data is below the 60% threshold for a full year — 1Y stays hidden.
    expect(ranges).not.toContain('1Y');
    expect(ranges).not.toContain('5Y');
  });
  it('returns empty for no data', () => {
    expect(resolveAvailableRanges(null)).toEqual([]);
  });
});
