'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import type { Asset, ChartRange, Quote } from '@sarmaye/shared';
import { useI18n } from '@/lib/i18n';
import { apiFetch } from '@/lib/api';
import { Icon } from './Icon';
import { ChangeBadge, PriceText } from './Price';
import { FreshnessBadge, StaleBanner } from './Freshness';
import { ChartView } from './ChartView';
import { ConverterWidget } from './ConverterWidget';
import { CopyButton, ShareButton } from './CopyButton';
import { FavoriteButton } from './FavoriteButton';
import { AssetTable } from './AssetTable';
import { Badge, Card, CardBody, CardHeader, CardTitle } from './ui/primitives';
import { formatDateTime, formatNumber, formatRelativeTime } from '@sarmaye/market-core';

interface DetailData {
  asset: Asset;
  quote: Quote | null;
  related: Quote[];
  availableRanges: ChartRange[];
}

/** Asset detail page client shell with 30s quote polling. */
export function AssetDetailClient({ detail, lang, categoryIcon }: { detail: DetailData; lang: 'fa' | 'en'; categoryIcon: string }) {
  const { t } = useI18n();
  const { data } = useQuery({
    queryKey: ['asset', detail.asset.symbol, lang],
    queryFn: () => apiFetch<Quote>(`/api/assets/${detail.asset.symbol}`),
    initialData: detail.quote ?? undefined,
    refetchInterval: 30_000,
    enabled: Boolean(detail.quote),
  });
  const quote = data ?? detail.quote;
  const name = lang === 'fa' ? detail.asset.nameFa : detail.asset.nameEn;
  const historyNote = lang === 'fa' ? detail.asset.historyNoteFa : detail.asset.historyNoteEn;

  return (
    <div className="space-y-5">
      {/* Header */}
      <section aria-label={name}>
        <nav className="mb-2 text-xs text-text-muted" aria-label="breadcrumb">
          <Link href="/" className="hover:text-primary">
            {t('navHome')}
          </Link>
          <span className="mx-1">/</span>
          <Link href={`/category/${categorySlug(detail.asset.assetClass)}`} className="hover:text-primary">
            {categoryTitle(detail.asset.assetClass, lang)}
          </Link>
        </nav>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-2 text-text-secondary">
              <Icon name={detail.asset.icon ?? categoryIcon} size={26} />
            </span>
            <div>
              <h1 className="text-xl font-bold text-text sm:text-2xl">{name}</h1>
              <p className="text-xs text-text-muted" dir="ltr">
                {detail.asset.symbol} · {detail.asset.unit}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <FavoriteButton symbol={detail.asset.symbol} size={20} />
            <CopyButton value={quote?.price} />
            <ShareButton url={`/assets/${detail.asset.symbol}`} title={name} />
          </div>
        </div>
        {detail.asset.isDerived ? (
          <p className="mt-2 rounded-lg border border-border bg-surface-2 px-3 py-2 text-xs text-text-secondary">
            {t('derivedNotice')} {detail.asset.derivedFrom ? `(${detail.asset.derivedFrom.assetSymbols.join(', ')})` : ''}
          </p>
        ) : null}
      </section>

      {/* Quote summary */}
      <section aria-label={t('price')}>
        <Card>
          <CardBody>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="label">{t('price')}</p>
                <PriceText value={quote?.price} precision={detail.asset.precision} className="text-3xl font-bold text-text" />
                {quote?.price && quote.quoteCurrency !== 'TOMAN' && quote.quoteCurrency !== 'RIAL' ? (
                  <span className="text-xs text-text-muted">{quote.quoteCurrency}</span>
                ) : null}
              </div>
              <div>
                <p className="label">{t('change')}</p>
                <ChangeBadge change={quote?.changeAbsolute} changePercent={quote?.changePercent} className="text-lg" />
              </div>
              <div>
                <p className="label">{t('high')} / {t('low')}</p>
                <p className="text-sm text-text">
                  <span className="text-up tabular">{quote?.high ? formatNumber(quote.high, { lang: lang as 'fa' | 'en' }) : '—'}</span>
                  <span className="mx-1.5 text-text-muted">/</span>
                  <span className="text-down tabular">{quote?.low ? formatNumber(quote.low, { lang: lang as 'fa' | 'en' }) : '—'}</span>
                </p>
              </div>
              <div>
                <p className="label">{t('lastUpdate')}</p>
                <p className="text-sm text-text-secondary">
                  {quote?.receivedAt ? formatRelativeTime(quote.receivedAt, lang) : '—'}
                </p>
                {quote?.marketTimestamp ? (
                  <p className="text-xs text-text-muted">
                    {t('marketTime')}: {formatRelativeTime(quote.marketTimestamp, lang)}
                  </p>
                ) : null}
              </div>
            </div>
            {quote ? (
              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
                <FreshnessBadge
                  freshness={quote.freshness}
                  providerName={quote.providerDisplayName}
                  delayLabel={quote.delayLabel}
                  marketTime={quote.marketTimestamp ? formatDateTime(quote.marketTimestamp, { lang: lang as 'fa' | 'en' }) : null}
                  receivedAt={quote.receivedAt ? formatDateTime(quote.receivedAt, { lang: lang as 'fa' | 'en' }) : null}
                />
                <Badge tone="neutral">{quote.providerDisplayName}</Badge>
                {quote.quoteCurrency === 'TOMAN' ? <Badge tone="muted">{t('toman')}</Badge> : null}
              </div>
            ) : null}
            {quote?.freshness === 'stale' ? <StaleBanner className="mt-3" /> : null}
            {!quote ? (
              <p className="mt-3 text-xs text-text-muted">{t('missingKeyHint', { key: 'BRSAPI_API_KEY / METALSDEV_API_KEY / …' })}</p>
            ) : null}
          </CardBody>
        </Card>
      </section>

      {/* Chart */}
      <section aria-label={t('chartDescription', { name, range: '' })}>
        <Card>
          <CardHeader>
            <CardTitle>{t('assetDetailTitle', { name })}</CardTitle>
            {historyNote ? <span className="text-xs text-text-muted">{historyNote}</span> : null}
          </CardHeader>
          <CardBody>
            <ChartView symbol={detail.asset.symbol} initialRanges={detail.availableRanges} initialRange={detail.availableRanges[0]} />
          </CardBody>
        </Card>
      </section>

      {/* OHLC info */}
      {quote ? (
        <section aria-label={t('ohlcTitle')}>
          <Card>
            <CardHeader>
              <CardTitle>{t('ohlcTitle')}</CardTitle>
            </CardHeader>
            <CardBody className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              {[
                { label: t('open'), value: quote.open },
                { label: t('high'), value: quote.high },
                { label: t('low'), value: quote.low },
                { label: t('previousClose'), value: quote.previousClose },
              ].map((item) => (
                <div key={item.label} className="rounded-lg bg-surface-2 p-2.5">
                  <p className="text-xs text-text-muted">{item.label}</p>
                  <p className="tabular font-medium text-text">{item.value ? formatNumber(item.value, { lang: lang as 'fa' | 'en' }) : '—'}</p>
                </div>
              ))}
              {quote.marketCap ? (
                <div className="rounded-lg bg-surface-2 p-2.5">
                  <p className="text-xs text-text-muted">{t('marketCap')}</p>
                  <p className="tabular font-medium text-text">{formatNumber(quote.marketCap, { lang: lang as 'fa' | 'en', compact: true })}</p>
                </div>
              ) : null}
              {quote.volume ? (
                <div className="rounded-lg bg-surface-2 p-2.5">
                  <p className="text-xs text-text-muted">{t('volume')}</p>
                  <p className="tabular font-medium text-text">{formatNumber(quote.volume, { lang: lang as 'fa' | 'en', compact: true })}</p>
                </div>
              ) : null}
            </CardBody>
          </Card>
        </section>
      ) : null}

      {/* Converter */}
      <section aria-label={t('converterOnAsset')}>
        <ConverterWidget initialFrom={detail.asset.symbol === 'XAU' ? 'XAU' : detail.asset.symbol} initialTo="TOMAN" />
      </section>

      {/* Related */}
      {detail.related.length > 0 ? (
        <section aria-label={t('relatedAssets')}>
          <h2 className="mb-3 text-sm font-semibold text-text-secondary">{t('relatedAssets')}</h2>
          <AssetTable quotes={detail.related} />
        </section>
      ) : null}
    </div>
  );
}

function categorySlug(assetClass: string): string {
  const map: Record<string, string> = {
    iranian_currency: 'iranian-currencies',
    iranian_gold_coin: 'iranian-gold-coins',
    global_currency: 'global-currencies',
    precious_metal: 'precious-metals',
    cryptocurrency: 'cryptocurrencies',
    iranian_stock: 'iranian-stocks',
    global_market: 'global-markets',
    economic_indicator: 'economic-indicators',
  };
  return map[assetClass] ?? 'iranian-currencies';
}

function categoryTitle(assetClass: string, lang: string): string {
  const map: Record<string, [string, string]> = {
    iranian_currency: ['ارزهای ایرانی', 'Iranian Currencies'],
    iranian_gold_coin: ['طلا و سکه ایرانی', 'Iranian Gold & Coins'],
    global_currency: ['ارزهای جهانی', 'Global Currencies'],
    precious_metal: ['فلزات گران‌بها', 'Precious Metals'],
    cryptocurrency: ['رمزارزها', 'Cryptocurrencies'],
    iranian_stock: ['بورس ایران', 'Iranian Stocks'],
    global_market: ['بازارهای جهانی', 'Global Markets'],
    economic_indicator: ['شاخص‌های اقتصادی', 'Economic Indicators'],
  };
  const entry = map[assetClass];
  return entry ? (lang === 'fa' ? entry[0] : entry[1]) : assetClass;
}
