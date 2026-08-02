'use client';

import Link from 'next/link';
import type { OverviewAsset } from '@sarmaye/shared';
import { useI18n } from '@/lib/i18n';
import { formatRelativeTime } from '@sarmaye/market-core';
import { Icon } from './Icon';
import { ChangeBadge, PriceText } from './Price';
import { FreshnessBadge } from './Freshness';
import { Sparkline } from './Sparkline';
import { FavoriteButton } from './FavoriteButton';

/** Compact market card: name, symbol, price, change, sparkline, freshness. */
export function MarketCard({ asset, href }: { asset: OverviewAsset; href?: string }) {
  const { lang, t } = useI18n();
  const name = lang === 'fa' ? asset.assetNameFa : asset.assetNameEn;
  const link = href ?? `/assets/${asset.assetSymbol}`;
  const up = (asset.changePercent ? Number(asset.changePercent) : 0) >= 0;

  return (
    <Link
      href={link}
      className="card card-hover group flex flex-col gap-2 p-3.5 focus-visible:outline-2"
      aria-label={`${name} — ${asset.price ?? t('unavailable')}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-2 text-text-secondary">
            <Icon name={asset.icon ?? 'spark'} size={18} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-text">{name}</p>
            <p className="text-[11px] text-text-muted" dir="ltr">
              {asset.assetSymbol} · {asset.unit}
            </p>
          </div>
        </div>
        <FavoriteButton symbol={asset.assetSymbol} size={16} className="text-text-muted" />
      </div>

      <div className="flex items-end justify-between gap-2">
        <div className="min-w-0">
          <PriceText value={asset.price} precision={asset.precision} className="block text-lg font-bold text-text" />
          <div className="mt-0.5 flex items-center gap-2">
            <ChangeBadge change={asset.changeAbsolute} changePercent={asset.changePercent} />
            <span className="text-[10px] text-text-muted">
              {asset.receivedAt ? formatRelativeTime(asset.receivedAt, lang as 'fa' | 'en') : ''}
            </span>
          </div>
        </div>
        <Sparkline points={asset.sparkline} positive={up} label={`${name} sparkline`} />
      </div>

      <div className="flex items-center justify-between border-t border-border pt-2">
        <FreshnessBadge
          freshness={asset.freshness}
          providerName={asset.providerDisplayName}
          delayLabel={asset.delayLabel}
          marketTime={asset.marketTimestamp ? formatRelativeTime(asset.marketTimestamp, lang as 'fa' | 'en') : null}
          receivedAt={asset.receivedAt ? formatRelativeTime(asset.receivedAt, lang as 'fa' | 'en') : null}
        />
      </div>
    </Link>
  );
}
