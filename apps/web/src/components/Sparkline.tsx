'use client';

import { useId } from 'react';
import type { SparklinePoint } from '@sarmaye/shared';

/** Accessible mini sparkline (inline SVG polyline, no external lib). */
export function Sparkline({
  points,
  width = 96,
  height = 32,
  positive,
  label,
}: {
  points: SparklinePoint[];
  width?: number;
  height?: number;
  positive?: boolean;
  label?: string;
}) {
  const id = useId();
  if (points.length < 2) {
    return (
      <svg width={width} height={height} aria-hidden className="opacity-40" role="img">
        <title>{label ?? 'sparkline'}</title>
        <line x1="2" y1={height / 2} x2={width - 2} y2={height / 2} stroke="currentColor" strokeWidth={1.2} strokeDasharray="3 3" />
      </svg>
    );
  }
  const min = Math.min(...points.map((p) => p.v));
  const max = Math.max(...points.map((p) => p.v));
  const span = max - min || 1;
  const stepX = (width - 4) / (points.length - 1);
  const coords = points.map((p, i) => {
    const x = 2 + i * stepX;
    const y = height - 3 - ((p.v - min) / span) * (height - 6);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const trend = points[points.length - 1]!.v >= points[0]!.v;
  const color = positive !== undefined ? (positive ? 'var(--color-up)' : 'var(--color-down)') : trend ? 'var(--color-up)' : 'var(--color-down)';
  const area = `M2,${height - 3} L${coords.join(' L')} L${width - 2},${height - 3} Z`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" className="shrink-0">
      <title>{label ?? 'sparkline'}</title>
      <defs>
        <linearGradient id={`grad-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#grad-${id})`} />
      <polyline points={coords.join(' ')} fill="none" stroke={color} strokeWidth={1.6} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
