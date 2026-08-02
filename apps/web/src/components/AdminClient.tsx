'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useI18n } from '@/lib/i18n';
import { apiFetch } from '@/lib/api';
import { Badge, Card, CardBody, CardHeader, CardTitle, ErrorState, Skeleton } from './ui/primitives';
import { formatDateTime } from '@sarmaye/market-core';

interface AdminData {
  db: 'ok' | 'error';
  providers: {
    code: string;
    displayName: string;
    status: string;
    latencyMs: number | null;
    lastError: string | null;
    usageToday: { requests: number; successes: number; failures: number };
    dailyQuota: number | null;
  }[];
  staleAssets: { symbol: string; ageMinutes: number }[];
  lastRuns: { providerId: string; jobType: string; status: string; startedAt: string; finishedAt: string | null; quotesStored: number; errorMessage: string | null }[];
  dbRows: { providers: number; assets: number; snapshots: number; candles: number; latestQuotes: number };
}

/** Internal diagnostics page, protected by ADMIN_SECRET (query param). */
export function AdminClient() {
  const { t } = useI18n();
  const [secret, setSecret] = useState('');
  const [entered, setEntered] = useState(false);

  const { data, isFetching, isError } = useQuery({
    queryKey: ['admin', entered, secret],
    queryFn: () => apiFetch<AdminData>(`/api/admin?secret=${encodeURIComponent(secret)}`),
    enabled: entered && secret.length > 0,
    retry: false,
  });

  if (!entered) {
    return (
      <div className="mx-auto max-w-sm space-y-3">
        <h1 className="text-xl font-bold text-text">{t('adminTitle')}</h1>
        <p className="text-sm text-text-secondary">{t('adminSubtitle')}</p>
        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            setEntered(true);
          }}
        >
          <label htmlFor="admin-secret" className="label">
            {t('adminSecretLabel')}
          </label>
          <input id="admin-secret" type="password" className="input" value={secret} onChange={(e) => setSecret(e.target.value)} />
          <button type="submit" className="btn btn-primary w-full">
            {t('adminEnter')}
          </button>
        </form>
      </div>
    );
  }

  if (isFetching && !data) return <Skeleton className="h-40 rounded-xl" />;
  if (isError || !data)
    return (
      <ErrorState
        title={t('error')}
        hint={t('adminSecretLabel')}
        onRetry={() => setEntered(false)}
      />
    );

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-text">{t('adminTitle')}</h1>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { label: t('adminDbHealth'), value: data.db, tone: data.db === 'ok' ? 'up' : 'down' },
          { label: 'Providers', value: data.dbRows.providers, tone: 'neutral' },
          { label: 'Assets', value: data.dbRows.assets, tone: 'neutral' },
          { label: 'Snapshots', value: data.dbRows.snapshots, tone: 'neutral' },
          { label: 'Candles', value: data.dbRows.candles, tone: 'neutral' },
        ].map((s) => (
          <Card key={s.label}>
            <CardBody>
              <p className="text-xs text-text-muted">{s.label}</p>
              <p className="tabular text-lg font-bold text-text">{String(s.value)}</p>
            </CardBody>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('adminProviderHealth')}</CardTitle>
        </CardHeader>
        <CardBody className="space-y-1.5">
          {data.providers.map((p) => (
            <div key={p.code} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-surface-2 px-3 py-2 text-xs">
              <span className="font-medium text-text">
                {p.displayName} <span className="text-text-muted" dir="ltr">({p.code})</span>
              </span>
              <span className="flex items-center gap-2">
                <Badge tone={p.status === 'ok' ? 'up' : p.status === 'down' || p.status === 'circuit_open' ? 'down' : 'warning'}>
                  {p.status}
                </Badge>
                <span className="tabular text-text-muted">{p.latencyMs != null ? `${p.latencyMs}ms` : '—'}</span>
                <span className="tabular text-text-muted">
                  {p.usageToday.requests}/{p.dailyQuota ?? '∞'}
                </span>
              </span>
              {p.lastError ? <span className="w-full truncate text-down">{p.lastError}</span> : null}
            </div>
          ))}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('adminLastRuns')}</CardTitle>
        </CardHeader>
        <CardBody className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border text-left text-text-muted">
                <th className="px-2 py-1.5 font-medium">provider</th>
                <th className="px-2 py-1.5 font-medium">job</th>
                <th className="px-2 py-1.5 font-medium">status</th>
                <th className="px-2 py-1.5 font-medium">quotes</th>
                <th className="px-2 py-1.5 font-medium">started</th>
              </tr>
            </thead>
            <tbody>
              {data.lastRuns.map((r) => (
                <tr key={`${r.startedAt}-${r.jobType}`} className="border-b border-border last:border-0">
                  <td className="px-2 py-1.5 text-text-secondary" dir="ltr">{r.providerId}</td>
                  <td className="px-2 py-1.5">{r.jobType}</td>
                  <td className="px-2 py-1.5">
                    <Badge tone={r.status === 'success' ? 'up' : r.status === 'failed' ? 'down' : 'warning'}>{r.status}</Badge>
                  </td>
                  <td className="px-2 py-1.5 tabular">{r.quotesStored}</td>
                  <td className="px-2 py-1.5 text-text-muted">{formatDateTime(r.startedAt, { lang: 'en', calendar: 'gregorian' })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>
    </div>
  );
}
