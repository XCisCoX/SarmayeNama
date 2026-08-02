'use client';

import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Badge } from './ui/primitives';

const TONE: Record<string, 'up' | 'down' | 'warning' | 'neutral' | 'primary' | 'muted'> = {
  live: 'up',
  delayed: 'warning',
  daily_reference: 'primary',
  derived: 'muted',
  cached: 'muted',
  stale: 'down',
};

/** Freshness badge with a source tooltip: shows live/delayed/daily-reference/stale. */
export function FreshnessBadge({
  freshness,
  providerName,
  delayLabel,
  marketTime,
  receivedAt,
  className,
}: {
  freshness: string;
  providerName?: string;
  delayLabel?: string;
  marketTime?: string | null;
  receivedAt?: string | null;
  className?: string;
}) {
  const { t } = useI18n();
  const labelKey =
    freshness === 'live'
      ? t('freshnessLive')
      : freshness === 'delayed'
        ? t('freshnessDelayed')
        : freshness === 'daily_reference'
          ? t('freshnessDailyReference')
          : freshness === 'derived'
            ? t('freshnessDerived')
            : freshness === 'cached'
              ? t('freshnessCached')
              : t('freshnessStale');

  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <Badge tone={TONE[freshness] ?? 'neutral'}>{labelKey}</Badge>
      <span className="group relative inline-flex">
        <button
          type="button"
          className="text-text-muted transition-colors hover:text-text-secondary"
          aria-label={providerName ? `Source: ${providerName}` : 'Source information'}
          tabIndex={0}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
            <circle cx="12" cy="12" r="8.5" />
            <path d="M12 11v5M12 7.5h.01" />
          </svg>
        </button>
        <span
          role="tooltip"
          className="pointer-events-none absolute bottom-full z-20 mb-1.5 hidden w-56 rounded-lg border border-border bg-surface p-2.5 text-xs text-text-secondary shadow-lg group-focus-within:block group-hover:block"
        >
          <span className="block font-medium text-text">{providerName ?? t('provider')}</span>
          {delayLabel ? <span className="mt-0.5 block">{delayLabel}</span> : null}
          {marketTime ? (
            <span className="mt-0.5 block">
              {t('marketTime')}: {marketTime}
            </span>
          ) : null}
          {receivedAt ? (
            <span className="mt-0.5 block">
              {t('receivedAt')}: {receivedAt}
            </span>
          ) : null}
        </span>
      </span>
    </span>
  );
}

/** Visible stale-data warning banner. */
export function StaleBanner({ className }: { className?: string }) {
  const { t } = useI18n();
  return (
    <div
      role="alert"
      className={cn(
        'flex items-start gap-2 rounded-lg border border-warning/40 bg-warning-soft px-3 py-2 text-xs text-warning',
        className
      )}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" className="mt-0.5 shrink-0">
        <path d="M12 3L2.5 20h19z" />
        <path d="M12 10v4M12 16.5h.01" />
      </svg>
      <span>{t('staleBanner')}</span>
    </div>
  );
}
