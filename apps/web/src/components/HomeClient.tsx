'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import type { MarketOverview, ProviderStatus } from '@sarmaye/shared';
import { useI18n } from '@/lib/i18n';
import { NewsSection } from './NewsSection';
import { AISummaryCard } from './AISummaryCard';
import { apiFetch } from '@/lib/api';
import { MarketCard } from './MarketCard';
import { ConnectionIndicator } from './ConnectionIndicator';
import { Icon } from './Icon';
import { Badge, Card, CardBody, CardHeader, CardTitle, Skeleton } from './ui/primitives';
import { formatRelativeTime } from '@sarmaye/market-core';

/** Home page client shell: SSR initial data + 60s polling refresh. */
export function HomeClient({ initialData, lang }: { initialData: MarketOverview; lang: 'fa' | 'en' }) {
  const { t } = useI18n();
  const { data } = useQuery({
    queryKey: ['overview', lang],
    queryFn: () => apiFetch<MarketOverview>(`/api/market/overview?lang=${lang}`),
    initialData,
    staleTime: 0, // always refresh on mount so fresh server data replaces SSR payloads
    refetchInterval: 60_000,
  });

  const statusTone = (s: ProviderStatus['status']) =>
    s === 'ok' ? 'up' : s === 'quota_exhausted' || s === 'not_configured' ? 'warning' : s === 'down' || s === 'circuit_open' ? 'down' : 'neutral';

  return (
    <div className="space-y-6">
      {/* Hero strip */}
      <section aria-labelledby="home-title">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 id="home-title" className="text-xl font-bold text-text sm:text-2xl">
              {t('homeTitle')}
            </h1>
            <p className="mt-0.5 text-sm text-text-secondary">{t('homeSubtitle')}</p>
          </div>
          <div className="flex items-center gap-2">
            <ConnectionIndicator />
            <span className="text-xs text-text-muted">
              {t('lastUpdate')}: {data ? formatRelativeTime(data.generatedAt, lang) : '—'}
            </span>
          </div>
        </div>
        {data && data.staleCount > 0 ? (
          <div role="alert" className="mt-3 flex items-center gap-2 rounded-lg border border-warning/40 bg-warning-soft px-3 py-2 text-xs text-warning">
            <Icon name="warning" size={15} />
            {t('statusStaleAssets')}: {data.staleCount} — {t('staleBanner')}
          </div>
        ) : null}
      </section>

      {/* Market sessions */}
      <section aria-label={t('marketSessionIran')} className="flex flex-wrap gap-2">
        {data?.marketSessions.map((s) => (
          <Badge key={s.market} tone={s.isOpen ? 'up' : 'neutral'}>
            <span className={s.isOpen ? 'text-up' : ''}>{s.isOpen ? '●' : '○'}</span>
            {lang === 'fa' ? s.labelFa : s.labelEn}
          </Badge>
        ))}
      </section>

      {/* Main market cards */}
      <section aria-labelledby="market-cards">
        <h2 id="market-cards" className="mb-3 text-sm font-semibold text-text-secondary">
          {t('marketCardsTitle')}
        </h2>
        {data ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {data.assets.map((a) => (
              <MarketCard key={a.assetId} asset={a} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
        )}
      </section>

      {/* Gainers / losers / categories */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5 text-up">
              <Icon name="arrowUp" size={15} /> {t('gainers')}
            </CardTitle>
          </CardHeader>
          <CardBody className="space-y-2">
            {data?.gainers.map((g) => (
              <Link key={g.assetId} href={`/assets/${g.assetSymbol}`} className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-surface-2">
                <span className="flex items-center gap-2 text-sm text-text">
                  <Icon name={g.icon ?? 'spark'} size={16} className="text-text-muted" />
                  <span className="truncate">{lang === 'fa' ? g.assetNameFa : g.assetNameEn}</span>
                </span>
                <span className="text-xs font-medium text-up tabular">
                  {g.changePercent != null ? `${Number(g.changePercent) >= 0 ? '+' : ''}${Number(g.changePercent).toFixed(2)}٪` : '—'}
                </span>
              </Link>
            ))}
            {data?.gainers.length === 0 ? <p className="px-2 text-xs text-text-muted">{t('noData')}</p> : null}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5 text-down">
              <Icon name="arrowDown" size={15} /> {t('losers')}
            </CardTitle>
          </CardHeader>
          <CardBody className="space-y-2">
            {data?.losers.map((g) => (
              <Link key={g.assetId} href={`/assets/${g.assetSymbol}`} className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-surface-2">
                <span className="flex items-center gap-2 text-sm text-text">
                  <Icon name={g.icon ?? 'spark'} size={16} className="text-text-muted" />
                  <span className="truncate">{lang === 'fa' ? g.assetNameFa : g.assetNameEn}</span>
                </span>
                <span className="text-xs font-medium text-down tabular">
                  {g.changePercent != null ? `${Number(g.changePercent) >= 0 ? '+' : ''}${Number(g.changePercent).toFixed(2)}٪` : '—'}
                </span>
              </Link>
            ))}
            {data?.losers.length === 0 ? <p className="px-2 text-xs text-text-muted">{t('noData')}</p> : null}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5">
              <Icon name="grid" size={15} /> {t('navCategories')}
            </CardTitle>
          </CardHeader>
          <CardBody className="grid grid-cols-2 gap-1.5">
            {data?.categories.map((c) => (
              <Link
                key={c.slug}
                href={`/category/${c.slug}`}
                className="flex items-center gap-2 rounded-lg border border-border px-2.5 py-2 text-xs text-text-secondary transition-colors hover:border-border-strong hover:text-text"
              >
                <Icon name={c.icon} size={14} className="text-text-muted" />
                <span className="truncate">{lang === 'fa' ? c.titleFa : c.titleEn}</span>
              </Link>
            ))}
          </CardBody>
        </Card>
      </div>

      {/* Provider status summary */}
      <section aria-labelledby="provider-status">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="provider-status" className="text-sm font-semibold text-text-secondary">
            {t('providerStatus')}
          </h2>
          <Link href="/status" className="text-xs font-medium text-primary hover:underline">
            {t('viewAll')}
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {data?.providerStatuses.map((p) => (
            <Link
              key={p.code}
              href="/status"
              className="card card-hover flex items-center justify-between gap-2 px-3 py-2.5"
              aria-label={`${p.displayName}: ${p.status}`}
            >
              <span className="flex min-w-0 items-center gap-2">
                <Icon name="server" size={15} className="shrink-0 text-text-muted" />
                <span className="truncate text-xs font-medium text-text">{p.displayName}</span>
              </span>
              <Badge tone={statusTone(p.status)}>{p.status === 'ok' ? t('statusOk') : p.status === 'not_configured' ? t('statusNotConfigured') : p.status === 'down' ? t('statusDown') : p.status === 'quota_exhausted' ? t('quotaExhausted') : p.status === 'disabled' ? t('statusDisabled') : t('statusDegraded')}</Badge>
            </Link>
          ))}
        </div>
      </section>

      {/* News + AI summary */}
      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <NewsSection />
        <AISummaryCard />
      </section>
    </div>
  );
}
