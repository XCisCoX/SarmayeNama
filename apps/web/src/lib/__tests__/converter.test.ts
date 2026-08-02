import { describe, expect, it } from 'vitest';
import { convert, type ConverterAssetInput } from '../converter';

function quote(symbol: string, nameFa: string, quoteCurrency: string, price: string, providerCode = 'brsapi'): ConverterAssetInput {
  return { symbol, nameFa, quoteCurrency, price, providerCode, freshness: 'live' };
}

const quotes: Record<string, ConverterAssetInput> = {
  USD: quote('USD', 'دلار آمریکا', 'TOMAN', '81650'),
  EUR: quote('EUR', 'یورو', 'TOMAN', '91150'),
  AED: quote('AED', 'درهم امارات', 'TOMAN', '22328'),
  XAU: quote('XAU', 'انس طلا', 'USD', '3200', 'metalsdev'),
  BTC: quote('BTC', 'بیت‌کوین', 'USD', '63431', 'coingecko'),
  FX_EUR: quote('FX_EUR', 'یورو (جهانی)', 'USD', '1.1485012', 'frankfurter'),
  FX_GBP: quote('FX_GBP', 'پوند (جهانی)', 'USD', '1.3421354', 'frankfurter'),
};

describe('Converter', () => {
  it('converts USD to Toman directly (direct rate)', () => {
    const r = convert({ from: 'USD', to: 'TOMAN', amount: '100', quotes });
    expect(r.direct).toBe(true);
    expect(Number(r.result)).toBeCloseTo(8_165_000, 0);
    expect(r.sourceAssets.some((s) => s.symbol === 'USD')).toBe(true);
  });

  it('converts EUR to Toman directly using the Iranian EUR quote', () => {
    const r = convert({ from: 'EUR', to: 'TOMAN', amount: '1', quotes });
    expect(r.direct).toBe(true);
    expect(Number(r.result)).toBeCloseTo(91_150, 0);
  });

  it('converts Toman to USD (inverse)', () => {
    const r = convert({ from: 'TOMAN', to: 'USD', amount: '81650', quotes });
    expect(Number(r.result)).toBeCloseTo(1, 4);
  });

  it('converts XAU ounce to grams (derived, 24k)', () => {
    const r = convert({ from: 'XAU', to: 'GRAM_24K', amount: '1', quotes });
    expect(r.direct).toBe(false);
    // 1 troy ounce = 31.1034768 grams of 24k gold
    expect(Number(r.result)).toBeCloseTo(31.1034768, 6);
    expect(r.formula).toContain('۳۱٫۱۰۳۴۷۶۸');
    expect(r.sourceAssets.some((s) => s.symbol === 'XAU')).toBe(true);
  });

  it('converts 24k gram to 18k gram equivalent (theoretical)', () => {
    const r = convert({ from: 'GRAM_24K', to: 'GRAM_18K', amount: '1', quotes });
    expect(r.direct).toBe(false);
    // 1g 24k = 1g 18k × (0.999/0.75)
    expect(Number(r.result)).toBeCloseTo(1.332, 3);
  });

  it('converts BTC to USD directly', () => {
    const r = convert({ from: 'BTC', to: 'USD', amount: '1', quotes });
    expect(r.direct).toBe(true);
    expect(Number(r.result)).toBeCloseTo(63_431, 0);
  });

  it('converts BTC to Toman via USD (derived)', () => {
    const r = convert({ from: 'BTC', to: 'TOMAN', amount: '1', quotes });
    expect(r.direct).toBe(false);
    expect(Number(r.result)).toBeCloseTo(63_431 * 81_650, 0);
  });

  it('converts global EUR to GBP via the USD hub (both direct USD quotes)', () => {
    const r = convert({ from: 'FX_EUR', to: 'FX_GBP', amount: '1', quotes });
    // Both inputs are direct USD-quoted rates, so the cross is direct math.
    expect(r.direct).toBe(true);
    const expected = 1.1485012 / 1.3421354;
    expect(Number(r.result)).toBeCloseTo(expected, 4);
  });

  it('handles Rial as 0.1 Toman', () => {
    const r = convert({ from: 'RIAL', to: 'TOMAN', amount: '10', quotes });
    expect(r.direct).toBe(true);
    expect(Number(r.result)).toBeCloseTo(1, 6);
  });

  it('throws for unknown asset pairs', () => {
    expect(() => convert({ from: 'USD', to: 'NOPE', amount: '1', quotes })).toThrow();
  });

  it('keeps source assets with provider and freshness', () => {
    const r = convert({ from: 'BTC', to: 'TOMAN', amount: '1', quotes });
    const sources = r.sourceAssets;
    expect(sources.some((s) => s.providerCode === 'coingecko')).toBe(true);
    expect(sources.every((s) => s.freshness === 'live')).toBe(true);
  });
});
