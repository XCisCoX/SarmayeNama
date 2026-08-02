'use client';

import type { ProviderStatus } from '@sarmaye/shared';
import { useI18n } from '@/lib/i18n';
import { Badge, Card, CardBody, CardHeader, CardTitle } from './ui/primitives';
import { Icon } from './Icon';
import { formatRelativeTime } from '@sarmaye/market-core';

const STATUS_TONE: Record<string, 'up' | 'down' | 'warning' | 'neutral' | 'primary'> = {
  ok: 'up',
  degraded: 'warning',
  down: 'down',
  circuit_open: 'down',
  quota_exhausted: 'warning',
  disabled: 'neutral',
  not_configured: 'warning',
};

export function StatusClient({
  providers,
  staleAssets,
  lang,
}: {
  providers: ProviderStatus[];
  staleAssets: { symbol: string; nameFa: string; ageMinutes: number }[];
  lang: 'fa' | 'en';
}) {
  const { t } = useI18n();
  const statusLabel = (s: ProviderStatus['status']) =>
    s === 'ok' ? t('statusOk') : s === 'not_configured' ? t('statusNotConfigured') : s === 'down' ? t('statusDown') : s === 'quota_exhausted' ? t('quotaExhausted') : s === 'disabled' ? t('statusDisabled') : t('statusDegraded');

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-xl font-bold text-text sm:text-2xl">{t('statusTitle')}</h1>
        <p className="mt-0.5 text-sm text-text-secondary">{t('statusSubtitle')}</p>
      </header>

      {staleAssets.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5 text-warning">
              <Icon name="warning" size={15} /> {t('statusStaleAssets')} ({staleAssets.length})
            </CardTitle>
          </CardHeader>
          <CardBody>
            <ul className="grid gap-1.5 sm:grid-cols-2">
              {staleAssets.map((a) => (
                <li key={a.symbol} className="flex items-center justify-between rounded-lg bg-warning-soft/50 px-3 py-2 text-xs">
                  <span className="font-medium text-text">
                    {lang === 'fa' ? a.nameFa : a.symbol} <span className="text-text-muted" dir="ltr">({a.symbol})</span>
                  </span>
                  <span className="text-warning">{t('stale')} · {a.ageMinutes} min</span>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      ) : null}

      <section aria-label={t('providers')}>
        <h2 className="mb-3 text-sm font-semibold text-text-secondary">{t('providers')}</h2>
        <div className="space-y-2.5">
          {providers.map((p) => (
            <Card key={p.code}>
              <CardBody>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-text-secondary">
                      <Icon name="server" size={18} />
                    </span>
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-text">
                        {p.displayName}
                        <Badge tone={STATUS_TONE[p.status]}>{statusLabel(p.status)}</Badge>
                        <Badge tone="muted">{p.delayLabel}</Badge>
                      </p>
                      {p.missingConfig.length > 0 ? (
                        <p className="mt-1 text-xs text-warning">
                          {t('missingKeyHint', { key: p.missingConfig.join(', ') })}
                        </p>
                      ) : null}
                      {p.lastError ? <p className="mt-1 max-w-xl truncate text-xs text-down">{p.lastError}</p> : null}
                      {p.attribution ? (
                        <p className="mt-1 text-[11px] text-text-muted">
                          {t('attribution')}: <span dir="ltr">{p.attribution}</span>
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <div className="grid shrink-0 grid-cols-2 gap-x-5 gap-y-1 text-xs text-text-secondary sm:grid-cols-4">
                    <div>
                      <p className="text-text-muted">{t('usageToday')}</p>
                      <p className="tabular">{p.usageToday.requests} {t('requests')}</p>
                    </div>
                    <div>
                      <p className="text-text-muted">{t('successes')}</p>
                      <p className="tabular text-up">{p.usageToday.successes}</p>
                    </div>
                    <div>
                      <p className="text-text-muted">{t('failures')}</p>
                      <p className="tabular text-down">{p.usageToday.failures}</p>
                    </div>
                    <div>
                      <p className="text-text-muted">{t('latency')}</p>
                      <p className="tabular">{p.latencyMs != null ? `${p.latencyMs} ms` : '—'}</p>
                    </div>
                  </div>
                </div>
                <div className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1 border-t border-border pt-2 text-[11px] text-text-muted">
                  <span>
                    {t('lastSuccess')}: {p.lastSuccessAt ? formatRelativeTime(p.lastSuccessAt, lang) : '—'}
                  </span>
                  <span>
                    {t('dailyReference')} {t('requests')}: {p.dailyQuota ?? '∞'}
                  </span>
                  {p.fallbackProvider ? (
                    <span>
                      {t('providers')} fallback: <span dir="ltr">{p.fallbackProvider}</span>
                    </span>
                  ) : null}
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
