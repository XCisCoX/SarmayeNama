'use client';

import Link from 'next/link';
import type { Quote } from '@sarmaye/shared';
import { useI18n } from '@/lib/i18n';
import { formatRelativeTime } from '@sarmaye/market-core';
import { Icon } from './Icon';
import { ChangeBadge, PriceText } from './Price';
import { FreshnessBadge } from './Freshness';
import { FavoriteButton } from './FavoriteButton';
import { CopyButton } from './CopyButton';

/** Responsive asset table (cards on mobile, table on desktop). */
export function AssetTable({ quotes }: { quotes: Quote[] }) {
  const { lang, t } = useI18n();
  const name = (q: Quote) => (lang === 'fa' ? q.assetNameFa : q.assetNameEn);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface">
      <table className="w-full text-sm">
        <caption className="sr-only">{t('categoryAssets')}</caption>
        <thead>
          <tr className="border-b border-border bg-surface-2 text-left text-xs text-text-muted">
            <th scope="col" className="px-3 py-2.5 font-medium">{t('price')}</th>
            <th scope="col" className="px-3 py-2.5 font-medium">{t('change')}</th>
            <th scope="col" className="hidden px-3 py-2.5 font-medium sm:table-cell">{t('unit')}</th>
            <th scope="col" className="hidden px-3 py-2.5 font-medium md:table-cell">{t('lastUpdate')}</th>
            <th scope="col" className="hidden px-3 py-2.5 font-medium lg:table-cell">{t('freshness')}</th>
            <th scope="col" className="px-3 py-2.5" />
          </tr>
        </thead>
        <tbody>
          {quotes.map((q) => (
            <tr key={q.assetId} className="border-b border-border last:border-0 hover:bg-surface-2/60">
              <td className="px-3 py-2.5">
                <Link href={`/assets/${q.assetSymbol}`} className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-text-secondary">
                    <Icon name={q.icon ?? 'spark'} size={16} />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-text">{name(q)}</span>
                    <span className="block text-[11px] text-text-muted" dir="ltr">
                      {q.assetSymbol}
                    </span>
                  </span>
                </Link>
              </td>
              <td className="px-3 py-2.5">
                <div className="flex items-center gap-1.5">
                  <PriceText value={q.price} precision={q.precision} className="font-semibold text-text" />
                  <CopyButton value={q.price} />
                </div>
              </td>
              <td className="hidden px-3 py-2.5 sm:table-cell">
                <ChangeBadge change={q.changeAbsolute} changePercent={q.changePercent} />
              </td>
              <td className="hidden px-3 py-2.5 text-xs text-text-muted md:table-cell">
                {q.receivedAt ? formatRelativeTime(q.receivedAt, lang as 'fa' | 'en') : '—'}
              </td>
              <td className="hidden px-3 py-2.5 lg:table-cell">
                <FreshnessBadge
                  freshness={q.freshness}
                  providerName={q.providerDisplayName}
                  delayLabel={q.delayLabel}
                  marketTime={q.marketTimestamp ? formatRelativeTime(q.marketTimestamp, lang as 'fa' | 'en') : null}
                  receivedAt={q.receivedAt ? formatRelativeTime(q.receivedAt, lang as 'fa' | 'en') : null}
                />
              </td>
              <td className="px-3 py-2.5 text-end">
                <FavoriteButton symbol={q.assetSymbol} size={16} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {quotes.length === 0 ? (
        <div className="px-4 py-8 text-center text-sm text-text-muted">{t('noData')}</div>
      ) : null}
    </div>
  );
}
