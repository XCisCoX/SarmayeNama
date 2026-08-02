'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createChart, CandlestickSeries, LineSeries, type IChartApi, type ISeriesApi, type UTCTimestamp } from 'lightweight-charts';
import type { AssetHistoryResponse, ChartRange } from '@sarmaye/shared';
import { ALL_CHART_RANGES, RANGE_SPECS } from '@sarmaye/shared';
import { useI18n } from '@/lib/i18n';
import { apiFetch } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Skeleton } from './ui/primitives';


/**
 * Interactive OHLC chart with range selector.
 * Ranges without data are hidden (never faked); 5m/15m candles render as
 * a line when sparse, otherwise as candlesticks.
 */
export function ChartView({ symbol, initialRanges, initialRange }: { symbol: string; initialRanges: ChartRange[]; initialRange?: ChartRange }) {
  const { t, lang } = useI18n();
  const [range, setRange] = useState<ChartRange>(initialRange ?? (initialRanges.includes('7D') ? '7D' : initialRanges[0] ?? '7D'));
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick' | 'Line'> | null>(null);

  const { data, isFetching, isError } = useQuery({
    queryKey: ['history', symbol, range, lang],
    queryFn: () => apiFetch<AssetHistoryResponse>(`/api/assets/${encodeURIComponent(symbol)}/history?range=${range}`),
    staleTime: 60_000,
  });

  const rangeLabel = useMemo(() => {
    const r = RANGE_SPECS[range];
    return lang === 'fa' ? r.labelFa : r.labelEn;
  }, [range, lang]);

  useEffect(() => {
    if (!containerRef.current) return;
    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: 340,
      layout: {
        background: { color: 'transparent' },
        textColor: 'var(--color-text-secondary)',
        fontFamily: 'Vazirmatn, system-ui, sans-serif',
      },
      grid: {
        vertLines: { color: 'var(--color-border)' },
        horzLines: { color: 'var(--color-border)' },
      },
      rightPriceScale: { borderColor: 'var(--color-border)' },
      timeScale: { borderColor: 'var(--color-border)', timeVisible: true, secondsVisible: false },
      crosshair: {
        vertLine: { color: 'var(--color-border-strong)' },
        horzLine: { color: 'var(--color-border-strong)' },
      },
    });
    chartRef.current = chart;

    const resize = () => {
      if (containerRef.current) chart.applyOptions({ width: containerRef.current.clientWidth });
    };
    const observer = new ResizeObserver(resize);
    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, []);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !data) return;
    // Remove the previous series (if any) without destroying the chart.
    if (seriesRef.current) {
      chart.removeSeries(seriesRef.current);
      seriesRef.current = null;
    }
    const candles = data.candles;
    const isCandleInterval = data.interval !== '5m' && data.interval !== '15m';
    if (candles.length === 0) return;

    if (isCandleInterval) {
      const series = chart.addSeries(CandlestickSeries, {
        upColor: 'var(--color-up)',
        downColor: 'var(--color-down)',
        borderVisible: false,
        wickUpColor: 'var(--color-up)',
        wickDownColor: 'var(--color-down)',
      });
      series.setData(
        candles.map((c) => ({
          time: Math.floor(new Date(c.startTime).getTime() / 1000) as UTCTimestamp,
          open: Number(c.open),
          high: Number(c.high),
          low: Number(c.low),
          close: Number(c.close),
        }))
      );
      seriesRef.current = series;
    } else {
      const series = chart.addSeries(LineSeries, {
        color: 'var(--color-primary)',
        lineWidth: 2,
        priceLineVisible: true,
        lastValueVisible: true,
      });
      series.setData(
        candles.map((c) => ({
          time: Math.floor(new Date(c.startTime).getTime() / 1000) as UTCTimestamp,
          value: Number(c.close),
        }))
      );
      seriesRef.current = series;
    }
    chart.timeScale().fitContent();
  }, [data]);

  const availableRanges = data?.availableRanges ?? initialRanges;
  const visibleRanges = ALL_CHART_RANGES.filter((r) => availableRanges.includes(r));

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div role="group" aria-label="Chart range" className="flex flex-wrap gap-1">
          {visibleRanges.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              aria-pressed={range === r}
              className={cn(
                'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                range === r ? 'bg-primary text-white' : 'bg-surface-2 text-text-secondary hover:bg-surface-3'
              )}
            >
              {lang === 'fa' ? RANGE_SPECS[r].labelFa : RANGE_SPECS[r].labelEn}
            </button>
          ))}
        </div>
        <span className="text-xs text-text-muted">{t('chartRangeHidden')}</span>
      </div>

      <div
        ref={containerRef}
        className="h-[340px] w-full overflow-hidden rounded-lg border border-border bg-surface"
        role="img"
        aria-label={t('chartDescription', { name: symbol, range: rangeLabel })}
      />
      {isFetching && !data ? (
        <div className="mt-2 flex items-center gap-2 text-xs text-text-muted">
          <Skeleton className="h-3 w-24" /> {t('loading')}
        </div>
      ) : null}
      {isError ? (
        <p className="mt-2 text-xs text-down" role="alert">
          {t('chartNoData')}
        </p>
      ) : null}
      {data && data.candles.length === 0 ? (
        <p className="mt-2 text-xs text-text-muted">{t('chartNoData')}</p>
      ) : null}
      {data?.historySource === 'local_snapshots' || data?.historySource === 'mixed' ? (
        <p className="mt-2 text-xs text-text-muted">
          {data.historyNoteFa && lang === 'fa'
            ? data.historyNoteFa
            : data.historyNoteEn ?? t('historyCollectedSince', { date: '—' })}
        </p>
      ) : null}
    </div>
  );
}
