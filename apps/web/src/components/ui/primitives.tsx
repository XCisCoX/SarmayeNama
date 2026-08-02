import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('card', className)} {...props} />;
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex items-center justify-between gap-2 border-b border-border px-4 py-3', className)} {...props} />;
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn('text-sm font-semibold text-text', className)} {...props} />;
}

export function CardBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-4', className)} {...props} />;
}

export function Badge({
  children,
  tone = 'neutral',
  className,
}: {
  children: ReactNode;
  tone?: 'neutral' | 'up' | 'down' | 'warning' | 'primary' | 'muted';
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium',
        tone === 'neutral' && 'bg-surface-2 text-text-secondary',
        tone === 'up' && 'bg-up-soft text-up',
        tone === 'down' && 'bg-down-soft text-down',
        tone === 'warning' && 'bg-warning-soft text-warning',
        tone === 'primary' && 'bg-primary-soft text-primary',
        tone === 'muted' && 'bg-surface-3 text-text-muted',
        className
      )}
    >
      {children}
    </span>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton', className)} />;
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-center" role="status">
      <span className="text-text-muted" aria-hidden>
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.2} strokeLinecap="round">
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 8v5M12 16h.01" />
        </svg>
      </span>
      <p className="text-sm font-medium text-text-secondary">{title}</p>
      {hint ? <p className="max-w-sm text-xs text-text-muted">{hint}</p> : null}
    </div>
  );
}

export function ErrorState({ title, hint, onRetry }: { title: string; hint?: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-down/30 bg-down-soft/40 py-8 text-center" role="alert">
      <span className="text-down" aria-hidden>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round">
          <path d="M12 3L2.5 20h19z" />
          <path d="M12 10v4M12 16.5h.01" />
        </svg>
      </span>
      <p className="text-sm font-medium text-text">{title}</p>
      {hint ? <p className="max-w-sm text-xs text-text-muted">{hint}</p> : null}
      {onRetry ? (
        <button type="button" onClick={onRetry} className="btn btn-secondary mt-2 text-xs">
          Retry
        </button>
      ) : null}
    </div>
  );
}
