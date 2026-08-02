import { describe, expect, it } from 'vitest';
import {
  toPersianDigits,
  toLatinDigits,
  formatNumber,
  formatPrice,
  formatPercent,
  formatDateTime,
  formatRelativeTime,
} from '../src/index.js';

describe('Persian digits & formatting', () => {
  it('converts western digits to Persian', () => {
    expect(toPersianDigits('1234567890')).toBe('۱۲۳۴۵۶۷۸۹۰');
  });
  it('converts Persian digits back to Latin', () => {
    expect(toLatinDigits('۱۲۳۴۵۶۷۸۹۰')).toBe('1234567890');
    expect(toLatinDigits('١٢٣')).toBe('123');
  });
  it('formats numbers with Persian locale and separators', () => {
    const out = formatNumber(81650, { lang: 'fa', maxFractionDigits: 0 });
    expect(out).toContain('۸۱');
  });
  it('formats price in Toman and Rial modes', () => {
    expect(formatPrice(81650, { lang: 'en', mode: 'TOMAN', precision: 0 })).toBe('81,650');
    expect(formatPrice(81650, { lang: 'en', mode: 'RIAL', precision: 0 })).toBe('816,500');
  });
  it('formats percentages with Persian percent sign', () => {
    expect(formatPercent(1.23, 'fa')).toContain('٪');
    expect(formatPercent(-0.5, 'en')).toContain('%');
  });
  it('formats dates in the Jalali calendar for fa', () => {
    const out = formatDateTime('2026-03-21T00:00:00Z', { lang: 'fa', calendar: 'persian' });
    expect(out).toContain('۱۴۰۵'); // Farvardin 1, 1405
  });
  it('formats relative time', () => {
    const now = new Date('2026-07-01T12:00:00Z');
    expect(formatRelativeTime(new Date('2026-07-01T11:58:00Z'), 'fa', now)).toContain('۲');
    expect(formatRelativeTime(new Date('2026-07-01T11:58:00Z'), 'en', now)).toContain('minute');
  });
});
