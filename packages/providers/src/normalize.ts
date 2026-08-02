import { createHash } from 'node:crypto';

/**
 * Build a deterministic checksum for a normalized quote so duplicate
 * snapshots for the same asset+provider+timestamp can be detected.
 */
export function quoteChecksum(symbol: string, price: string, marketTimestamp: string | null, providerId: string): string {
  return createHash('sha1')
    .update([providerId, symbol, price, marketTimestamp ?? ''].join('|'))
    .digest('hex')
    .slice(0, 24);
}

/** Normalize a numeric value that may be number, string, or nullish -> decimal string or null. */
export function toDecimalString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return null;
    // Expand scientific notation for tiny prices (e.g. SHIB 1.5e-8).
    if (Math.abs(value) < 1e-6 || Math.abs(value) >= 1e21) {
      return value.toLocaleString('en-US', { maximumFractionDigits: 20, useGrouping: false });
    }
    return String(value);
  }
  if (typeof value === 'string') {
    const cleaned = value.replace(/[,\s]/g, '').replace(/[+٬]/g, '');
    if (cleaned === '' || cleaned === '.' || cleaned === '-') return null;
    if (/^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(cleaned)) {
      const n = Number(cleaned);
      if (!Number.isFinite(n)) return null;
      return toDecimalString(n);
    }
    return null;
  }
  return null;
}

/** Parse a unix timestamp (seconds or ms) or ISO string into an ISO datetime string. */
export function toIsoTimestamp(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return null;
    const ms = Math.abs(value) < 1e12 ? value * 1000 : value; // seconds vs ms heuristic
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') return null;
    // "1404/02/28 16:29" (Jalali) — convert via Intl
    const jalaliMatch = trimmed.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
    if (jalaliMatch) {
      const [, y, m, d, hh = '0', mm = '0', ss = '0'] = jalaliMatch;
      return jalaliToIso(Number(y), Number(m), Number(d), Number(hh), Number(mm), Number(ss));
    }
    const d = new Date(trimmed);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  return null;
}

/**
 * Convert a Jalali (Persian calendar) date to an ISO datetime string.
 * Uses the Nowruz anchor (Jalali day 1 ≈ March 20/21 of gy = jy+621) and
 * verifies the result with Intl, adjusting ±2 days. Fast: at most 5 Intl
 * calls per date (vs. thousands for a naive search).
 */
export function jalaliToIso(jy: number, jm: number, jd: number, hh = 0, mm = 0, ss = 0): string | null {
  try {
    if (jy < 1200 || jy > 1500 || jm < 1 || jm > 12 || jd < 1 || jd > 31) return null;
    const daysBeforeMonth =
      jm <= 6 ? (jm - 1) * 31 : jm <= 11 ? 6 * 31 + (jm - 7) * 30 : 336;
    const dayOfYear = daysBeforeMonth + jd; // 1-based
    const gy = jy + 621;
    // Nowruz anchor: March 19 UTC of gy; day 1 of Jalali year lands on Mar 20/21.
    const anchor = Date.UTC(gy, 2, 19) + (dayOfYear - 1) * 86_400_000;
    for (let off = -2; off <= 2; off += 1) {
      const d = new Date(anchor + off * 86_400_000);
      const parts = new Intl.DateTimeFormat('en-US-u-ca-persian', {
        timeZone: 'UTC',
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
      }).formatToParts(d);
      const py = Number(parts.find((p) => p.type === 'year')?.value);
      const pm = Number(parts.find((p) => p.type === 'month')?.value);
      const pd = Number(parts.find((p) => p.type === 'day')?.value);
      if (py === jy && pm === jm && pd === jd) {
        return new Date(
          Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), hh, mm, ss)
        ).toISOString();
      }
    }
  } catch {
    return null;
  }
  return null;
}
