'use client';

import { useMemo } from 'react';
import { useI18n } from '@/lib/i18n';
import { useSettings } from '@/lib/settings';
import { cn } from '@/lib/utils';
import { formatNumber, formatPercent, formatPrice, type CurrencyMode, type Lang } from '@sarmaye/market-core';
import { Icon } from './Icon';

export type CurrencyModeLike = CurrencyMode | 'TOMAN' | 'RIAL';

/** The settings store provides the user's currency display mode. */
export function useDisplayMode(): CurrencyModeLike {
  const { mode } = useSettings();
  return mode;
}

/** Locale + mode aware price formatting for a quote. */
export function usePriceFormatter() {
  const { lang } = useI18n();
  const mode = useDisplayMode();
  return (price: string | number | null | undefined, precision?: number) =>
    price == null ? '—' : formatPrice(price, { lang: lang as Lang, mode: mode as CurrencyMode, precision });
}

/** Price text with a subtle flash animation when the value changes. */
export function PriceText({
  value,
  precision,
  unit,
  className,
  mode,
  lang,
}: {
  value: string | number | null | undefined;
  precision?: number;
  unit?: string;
  className?: string;
  mode?: CurrencyModeLike;
  lang?: Lang;
}) {
  const { lang: ctxLang } = useI18n();
  const ctxMode = useDisplayMode();
  const l = lang ?? (ctxLang as Lang);
  const m = mode ?? (ctxMode as CurrencyMode);
  const formatted = useMemo(
    () => (value == null ? '—' : formatPrice(value, { lang: l, mode: m, precision })),
    [value, l, m, precision]
  );
  return (
    <span className={cn('tabular', className)}>
      {formatted}
      {unit && value != null ? <span className="ms-1 text-xs text-text-muted">{unit}</span> : null}
    </span>
  );
}

/** Signed change with up/down coloring (green/red used sparingly, accessible). */
export function ChangeBadge({
  change,
  changePercent,
  lang,
  className,
}: {
  change?: string | number | null;
  changePercent?: string | number | null;
  lang?: Lang;
  className?: string;
}) {
  const { lang: ctxLang, t } = useI18n();
  const l = lang ?? (ctxLang as Lang);
  const pct = changePercent != null ? Number(changePercent) : null;
  const abs = change != null ? Number(change) : null;
  const up = (pct ?? abs ?? 0) > 0;
  const down = (pct ?? abs ?? 0) < 0;
  const flat = !up && !down;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 text-xs font-medium tabular',
        up && 'text-up',
        down && 'text-down',
        flat && 'text-text-muted',
        className
      )}
      aria-label={`${t('change')}: ${pct ?? abs ?? 0}`}
    >
      {up ? <Icon name="arrowUp" size={12} /> : down ? <Icon name="arrowDown" size={12} /> : null}
      {pct != null ? formatPercent(pct, l) : abs != null ? formatNumber(abs, { lang: l, maxFractionDigits: 0 }) : '—'}
    </span>
  );
}
