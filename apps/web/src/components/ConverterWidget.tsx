'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { ConversionResult } from '@sarmaye/shared';
import { CONVERTER_PRESETS } from '@sarmaye/shared';
import { useI18n } from '@/lib/i18n';
import { apiFetch } from '@/lib/api';
import { Icon } from './Icon';
import { Badge, Card, CardBody, CardHeader, CardTitle, Skeleton } from './ui/primitives';
import { formatNumber } from '@sarmaye/market-core';
import { cn } from '@/lib/utils';

const ASSET_OPTIONS = [
  { value: 'USD', labelFa: 'دلار آمریکا', labelEn: 'US Dollar' },
  { value: 'EUR', labelFa: 'یورو', labelEn: 'Euro' },
  { value: 'AED', labelFa: 'درهم امارات', labelEn: 'UAE Dirham' },
  { value: 'GBP', labelFa: 'پوند', labelEn: 'Pound' },
  { value: 'TRY', labelFa: 'لیر ترکیه', labelEn: 'Turkish Lira' },
  { value: 'TOMAN', labelFa: 'تومان', labelEn: 'Toman' },
  { value: 'RIAL', labelFa: 'ریال', labelEn: 'Rial' },
  { value: 'XAU', labelFa: 'انس طلا', labelEn: 'Gold ounce' },
  { value: 'GRAM_24K', labelFa: 'گرم طلای ۲۴ عیار', labelEn: '1g gold 24k' },
  { value: 'GRAM_18K', labelFa: 'گرم طلای ۱۸ عیار', labelEn: '1g gold 18k' },
  { value: 'BTC', labelFa: 'بیت‌کوین', labelEn: 'Bitcoin' },
  { value: 'ETH', labelFa: 'اتریوم', labelEn: 'Ethereum' },
  { value: 'USDT', labelFa: 'تتر', labelEn: 'Tether' },
  { value: 'SOL', labelFa: 'سولانا', labelEn: 'Solana' },
  { value: 'XRP', labelFa: 'ریپل', labelEn: 'XRP' },
  { value: 'FX_EUR', labelFa: 'یورو (جهانی)', labelEn: 'Euro (global)' },
  { value: 'FX_GBP', labelFa: 'پوند (جهانی)', labelEn: 'Pound (global)' },
];

export function ConverterWidget({ initialFrom, initialTo }: { initialFrom?: string; initialTo?: string }) {
  const { t, lang } = useI18n();
  const [from, setFrom] = useState(initialFrom ?? 'USD');
  const [to, setTo] = useState(initialTo ?? 'TOMAN');
  const [amount, setAmount] = useState('100');

  const { data, isFetching, isError } = useQuery({
    queryKey: ['convert', from, to, amount, lang],
    queryFn: () => apiFetch<ConversionResult>(`/api/converter?from=${from}&to=${to}&amount=${amount || '1'}&lang=${lang}`),
    enabled: amount !== '' && Number(amount) >= 0,
    staleTime: 30_000,
  });

  const optLabel = (v: string) => {
    const o = ASSET_OPTIONS.find((x) => x.value === v);
    return o ? (lang === 'fa' ? o.labelFa : o.labelEn) : v;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('converterTitle')}</CardTitle>
        <Icon name="calc" size={18} className="text-text-muted" />
      </CardHeader>
      <CardBody>
        <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
          <div>
            <label htmlFor="conv-from" className="label">{t('from')}</label>
            <select id="conv-from" className="input" value={from} onChange={(e) => setFrom(e.target.value)}>
              {ASSET_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {lang === 'fa' ? o.labelFa : o.labelEn}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            className="btn btn-secondary self-end"
            aria-label={t('swap')}
            title={t('swap')}
            onClick={() => {
              setFrom(to);
              setTo(from);
            }}
          >
            <Icon name="swap" size={16} />
          </button>
          <div>
            <label htmlFor="conv-to" className="label">{t('to')}</label>
            <select id="conv-to" className="input" value={to} onChange={(e) => setTo(e.target.value)}>
              {ASSET_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {lang === 'fa' ? o.labelFa : o.labelEn}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-3">
          <label htmlFor="conv-amount" className="label">{t('amount')}</label>
          <input
            id="conv-amount"
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            className="input tabular"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            dir="ltr"
          />
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {CONVERTER_PRESETS.map((p) => (
            <button
              key={`${p.from}-${p.to}`}
              type="button"
              onClick={() => {
                setFrom(p.from);
                setTo(p.to);
              }}
              className={cn(
                'rounded-md border border-border px-2 py-1 text-[11px] transition-colors hover:border-border-strong',
                from === p.from && to === p.to ? 'bg-primary-soft text-primary' : 'text-text-secondary'
              )}
            >
              {lang === 'fa' ? p.labelFa : p.labelEn}
            </button>
          ))}
        </div>

        <div className="mt-4 rounded-lg border border-border bg-surface-2 p-3">
          {isFetching && !data ? (
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-32" /> <Skeleton className="h-4 w-20" />
            </div>
          ) : isError ? (
            <p className="text-sm text-down">{t('noData')}</p>
          ) : data ? (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-text-secondary">
                  {formatNumber(data.amount, { lang: lang as 'fa' | 'en' })} {optLabel(data.from)}
                </span>
                <Icon name="chevronLeft" size={14} className="text-text-muted" />
                <span className="text-lg font-bold text-text tabular">
                  {formatNumber(data.result, { lang: lang as 'fa' | 'en', maxFractionDigits: 4 })}{' '}
                  {optLabel(data.to)}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-text-muted">
                <Badge tone={data.direct ? 'up' : 'warning'}>{data.direct ? t('directResult') : t('derivedResult')}</Badge>
                <span>
                  {t('rate')}: <span className="tabular">{formatNumber(data.rate, { lang: lang as 'fa' | 'en', maxFractionDigits: 8 })}</span>
                </span>
              </div>
              <p className="text-xs text-text-muted">{data.formula}</p>
              {data.sourceAssets.length > 0 ? (
                <p className="text-[11px] text-text-muted">
                  {t('source')}:{' '}
                  {data.sourceAssets.map((s) => `${s.symbol} (${s.providerCode}, ${s.freshness})`).join(' · ')}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </CardBody>
    </Card>
  );
}

export { ASSET_OPTIONS };
