'use client';

import { useQuery } from '@tanstack/react-query';
import type { AiSummaryResponse } from '@/lib/server-data';
import { useI18n } from '@/lib/i18n';
import { apiFetch } from '@/lib/api';
import { formatDateTime } from '@sarmaye/market-core';
import { Card, CardBody, CardHeader, CardTitle, Skeleton } from './ui/primitives';
import { Icon } from './Icon';

/**
 * AI market summary (Gemini). Always clearly labeled as AI-generated and
 * never presented as financial advice.
 */
export function AISummaryCard() {
  const { t, lang } = useI18n();
  const { data, isFetching } = useQuery({
    queryKey: ['ai-summary', lang],
    queryFn: () => apiFetch<AiSummaryResponse>(`/api/ai-summary?lang=${lang}`),
    staleTime: 10 * 60_000,
    refetchInterval: 15 * 60_000,
  });

  if (data?.enabled === false) return null; // no key — don't occupy space

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon name="star" className="h-4 w-4 text-primary" />
          {t('aiTitle')}
        </CardTitle>
      </CardHeader>
      <CardBody>
        {isFetching && !data?.text ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ) : data?.text ? (
          <>
            <p className="text-sm leading-7 text-text">{data.text}</p>
            <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-text-secondary">
              <span className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2 py-0.5 font-medium">
                <Icon name="star" className="h-3 w-3" />
                {t('aiDisclaimer')}
              </span>
              {data.generatedAt ? (
                <span>
                  {t('aiGeneratedAt')}: {formatDateTime(data.generatedAt, { lang })}
                </span>
              ) : null}
              <span dir="ltr">· {data.model}</span>
            </p>
          </>
        ) : (
          <p className="text-sm text-text-secondary">{data?.reason === 'error' ? t('aiError') : t('aiNotConfigured')}</p>
        )}
      </CardBody>
    </Card>
  );
}
