'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import type { NewsResponse } from '@/lib/server-data';
import { useI18n } from '@/lib/i18n';
import { apiFetch } from '@/lib/api';
import { formatRelativeTime } from '@sarmaye/market-core';
import { Card, CardBody, CardHeader, CardTitle, Skeleton } from './ui/primitives';
import { Icon } from './Icon';

/** Home-page market news list (NewsAPI / Brave), DB-cached server-side. */
export function NewsSection() {
  const { t, lang } = useI18n();
  const { data, isFetching } = useQuery({
    queryKey: ['news', lang],
    queryFn: () => apiFetch<NewsResponse>(`/api/news?lang=${lang}`),
    staleTime: 5 * 60_000,
    refetchInterval: 10 * 60_000,
  });

  const items = data?.items ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon name="activity" className="h-4 w-4 text-primary" />
          {t('newsTitle')}
        </CardTitle>
      </CardHeader>
      <CardBody>
        {isFetching && items.length === 0 ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
          </div>
        ) : items.length === 0 ? (
          <p className="text-sm text-text-secondary">
            {data?.enabled === false ? t('newsNotConfigured') : t('newsEmpty')}
          </p>
        ) : (
          <>
            <ul className="divide-y divide-border">
              {items.slice(0, 6).map((n) => (
                <li key={n.url} className="py-2.5">
                  <Link
                    href={n.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group block"
                  >
                    <p className="text-sm font-medium leading-snug text-text transition-colors group-hover:text-primary">
                      {n.title}
                    </p>
                    <p className="mt-1 flex items-center gap-2 text-xs text-text-secondary">
                      {n.source ? <span>{n.source}</span> : null}
                      {n.publishedAt ? (
                        <span dir="ltr">{formatRelativeTime(n.publishedAt, lang, new Date())}</span>
                      ) : null}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
            <p className="mt-3 flex items-center gap-1.5 text-xs text-text-secondary">
              <Icon name="star" className="h-3.5 w-3.5" />
              {t('newsPoweredBy')}
              {data?.fetchedAt ? (
                <span>
                  · {t('newsUpdated')}: {formatRelativeTime(data.fetchedAt, lang, new Date())}
                </span>
              ) : null}
            </p>
          </>
        )}
      </CardBody>
    </Card>
  );
}
