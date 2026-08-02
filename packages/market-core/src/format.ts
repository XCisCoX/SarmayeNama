import { Decimal } from 'decimal.js';
import { dec } from './money.js';

export type Lang = 'fa' | 'en';

const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';

/** Convert Western digits to Persian digits. */
export function toPersianDigits(input: string | number): string {
  return String(input).replace(/\d/g, (d) => FA_DIGITS.charAt(Number(d)));
}

/** Convert Persian/Arabic digits to Western digits. */
export function toLatinDigits(input: string): string {
  return input
    .replace(/[۰-۹]/g, (d) => String(FA_DIGITS.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
}

export interface FormatNumberOptions {
  lang?: Lang;
  /** Max fraction digits. */
  maxFractionDigits?: number;
  /** Min fraction digits. */
  minFractionDigits?: number;
  /** Compact notation for huge numbers (e.g. market caps). */
  compact?: boolean;
}

const compactFormatterFa = new Intl.NumberFormat('fa-IR', {
  notation: 'compact',
  maximumFractionDigits: 2,
});
const compactFormatterEn = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 2,
});

/**
 * Locale-aware number formatting. Persian gets Persian digits and the
 * Persian thousands separator (٬).
 */
export function formatNumber(
  value: Decimal.Value,
  opts: FormatNumberOptions = {}
): string {
  const { lang = 'fa', maxFractionDigits = 2, minFractionDigits = 0, compact = false } = opts;
  if (compact) {
    return lang === 'fa' ? compactFormatterFa.format(dec(value).toNumber()) : compactFormatterEn.format(dec(value).toNumber());
  }
  const locale = lang === 'fa' ? 'fa-IR' : 'en-US';
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: maxFractionDigits,
    minimumFractionDigits: minFractionDigits,
  }).format(dec(value).toNumber());
}

export type CurrencyMode = 'TOMAN' | 'RIAL';

/**
 * Format a price for display.
 * - Toman mode: price as-is (BrsApi prices are already in Toman).
 * - Rial mode: multiply by 10.
 */
export function formatPrice(
  price: Decimal.Value,
  opts: { lang?: Lang; mode?: CurrencyMode; precision?: number } = {}
): string {
  const { lang = 'fa', mode = 'TOMAN', precision = 0 } = opts;
  const value = mode === 'RIAL' ? dec(price).mul(10) : dec(price);
  return formatNumber(value, { lang, maxFractionDigits: precision, minFractionDigits: Math.min(precision, 2) });
}

/** Format a change percent like +۱٫۲٪ or -۰٫۸٪. */
export function formatPercent(value: Decimal.Value, lang: Lang = 'fa'): string {
  const v = dec(value);
  const sign = v.gt(0) ? (lang === 'fa' ? '+' : '+') : '';
  const abs = formatNumber(v.abs(), { lang, maxFractionDigits: 2 });
  return `${sign}${abs}${lang === 'fa' ? '٪' : '%'}`;
}

/** Format a signed absolute change with the currency symbol. */
export function formatSigned(
  value: Decimal.Value,
  lang: Lang = 'fa',
  suffix = ''
): string {
  const v = dec(value);
  const sign = v.gt(0) ? (lang === 'fa' ? '+' : '+') : '';
  return `${sign}${formatNumber(v.abs(), { lang, maxFractionDigits: 0 })}${suffix}`;
}

/* ------------------------------------------------------------------ */
/* Dates                                                               */
/* ------------------------------------------------------------------ */

export type Calendar = 'persian' | 'gregorian';

export function formatDateTime(
  iso: string | Date,
  opts: { lang?: Lang; calendar?: Calendar } = {}
): string {
  const { lang = 'fa', calendar = 'persian' } = opts;
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return '—';
  const locale = lang === 'fa' ? 'fa-IR' : 'en-US';
  const cal = calendar === 'persian' && lang === 'fa' ? 'persian' : 'gregory';
  try {
    return new Intl.DateTimeFormat(locale, {
      calendar: cal,
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(d);
  } catch {
    return d.toISOString();
  }
}

export function formatDate(
  iso: string | Date,
  opts: { lang?: Lang; calendar?: Calendar } = {}
): string {
  const { lang = 'fa', calendar = 'persian' } = opts;
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  const locale = lang === 'fa' ? 'fa-IR' : 'en-US';
  const cal = calendar === 'persian' && lang === 'fa' ? 'persian' : 'gregory';
  try {
    return new Intl.DateTimeFormat(locale, { calendar: cal, dateStyle: 'medium' }).format(d);
  } catch {
    return d.toISOString();
  }
}

/** Short relative time, e.g. "۲ دقیقه پیش". */
export function formatRelativeTime(iso: string | Date, lang: Lang = 'fa', now: Date = new Date()): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  const diffMs = now.getTime() - d.getTime();
  const abs = Math.abs(diffMs);
  const future = diffMs < 0;
  const rtf = new Intl.RelativeTimeFormat(lang === 'fa' ? 'fa-IR' : 'en-US', { numeric: 'auto' });
  let unit: Intl.RelativeTimeFormatUnit;
  let value: number;
  if (abs < 60_000) {
    unit = 'second';
    value = Math.round(abs / 1000);
  } else if (abs < 3600_000) {
    unit = 'minute';
    value = Math.round(abs / 60_000);
  } else if (abs < 86400_000) {
    unit = 'hour';
    value = Math.round(abs / 3600_000);
  } else if (abs < 30 * 86400_000) {
    unit = 'day';
    value = Math.round(abs / 86400_000);
  } else {
    unit = 'month';
    value = Math.round(abs / (30 * 86400_000));
  }
  return rtf.format(future ? value : -value, unit);
}

/** Format a big number like market cap: ۱۲۳٬۴۵۶ میلیون. */
export function formatCompact(value: Decimal.Value, lang: Lang = 'fa'): string {
  return formatNumber(value, { lang, compact: true });
}
