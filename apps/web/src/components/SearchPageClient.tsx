'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import type { SearchResultItem } from '@sarmaye/shared';
import { useI18n } from '@/lib/i18n';
import { apiFetch } from '@/lib/api';
import { SearchBox } from './SearchBox';
import { Icon } from './Icon';
import { ChangeBadge } from './Price';
import { Card, CardBody, EmptyState, Skeleton } from './ui/primitives';

function SearchResults() {
  const { t, lang } = useI18n();
  const params = useSearchParams();
  const q = params.get('q') ?? '';

  const { data, isFetching, isError } = useQuery({
    queryKey: ['search-page', q, lang],
    queryFn: () => apiFetch<SearchResultItem[]>(`/api/search?q=${encodeURIComponent(q)}&limit=30`),
    enabled: q.trim().length >= 1,
  });

  return (
    <div className="space-y-4">
      <SearchBox autoFocus className="mx-auto max-w-xl" />
      <h2 className="text-sm font-semibold text-text-secondary">{t('searchResults', { q })}</h2>
      {isFetching && !data ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-xl" />
          ))}
        </div>
      ) : isError ? (
        <Card>
          <CardBody>
            <EmptyState title={t('error')} hint={t('searchNoResults')} />
          </CardBody>
        </Card>
      ) : data && data.length === 0 ? (
        <Card>
          <CardBody>
            <EmptyState title={t('searchNoResults')} hint={t('searchHint')} />
          </CardBody>
        </Card>
      ) : (
        <ul className="space-y-1.5">
          {(data ?? []).map((r) => (
            <li key={r.symbol}>
              <Link
                href={`/assets/${r.symbol}`}
                className="card card-hover flex items-center justify-between gap-3 px-3.5 py-2.5"
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-text-secondary">
                    <Icon name={r.icon ?? 'spark'} size={16} />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-text">
                      {lang === 'fa' ? r.nameFa : r.nameEn}
                    </span>
                    <span className="block text-[11px] text-text-muted" dir="ltr">
                      {r.symbol}
                      {r.matchedAlias ? ` · ${r.matchedAlias}` : ''}
                    </span>
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-2 text-sm">
                  {r.price ? <span className="tabular text-text-secondary">{r.price}</span> : <span className="text-xs text-text-muted">{t('unavailable')}</span>}
                  <ChangeBadge changePercent={r.changePercent} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function SearchPageClient() {
  const { t } = useI18n();
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <header>
        <h1 className="text-xl font-bold text-text sm:text-2xl">{t('searchTitle')}</h1>
        <p className="mt-0.5 text-sm text-text-secondary">{t('searchPageSubtitle')}</p>
      </header>
      <Suspense fallback={<Skeleton className="h-12 rounded-xl" />}>
        <SearchResults />
      </Suspense>
    </div>
  );
}
