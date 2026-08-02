'use client';

import { useDeferredValue, useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { SearchResultItem } from '@sarmaye/shared';
import { useI18n } from '@/lib/i18n';
import { apiFetch } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Icon } from './Icon';
import { ChangeBadge } from './Price';

/** Fuzzy search box with debounce and keyboard navigation. */
export function SearchBox({ autoFocus = false, className }: { autoFocus?: boolean; className?: string }) {
  const { t, lang } = useI18n();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const deferred = useDeferredValue(query);
  const boxRef = useRef<HTMLDivElement>(null);

  const { data, isFetching } = useQuery({
    queryKey: ['search', deferred, lang],
    queryFn: () => apiFetch<SearchResultItem[]>(`/api/search?q=${encodeURIComponent(deferred)}&limit=8`),
    enabled: deferred.trim().length >= 2,
    staleTime: 30_000,
  });

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const results = data ?? [];

  const submit = () => {
    const q = query.trim();
    if (q) router.push(`/search?q=${encodeURIComponent(q)}`);
    setOpen(false);
  };

  return (
    <div ref={boxRef} className={cn('relative', className)} role="search">
      <div className="relative">
        <span className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-text-muted">
          <Icon name="search" size={16} />
        </span>
        <input
          type="search"
          value={query}
          autoFocus={autoFocus}
          placeholder={t('searchPlaceholder')}
          className="input ps-9"
          aria-label={t('navSearch')}
          aria-controls="search-results"
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit();
            if (e.key === 'Escape') setOpen(false);
            if (e.key === 'ArrowDown' && results.length > 0) {
              e.preventDefault();
              setActive((a) => Math.min(a + 1, results.length - 1));
            }
            if (e.key === 'ArrowUp' && results.length > 0) {
              e.preventDefault();
              setActive((a) => Math.max(a - 1, 0));
            }
          }}
        />
        {isFetching ? (
          <span className="absolute end-3 top-1/2 -translate-y-1/2 animate-pulse text-text-muted">
            <Icon name="refresh" size={14} />
          </span>
        ) : null}
      </div>

      {open && query.trim().length >= 2 ? (
        <div
          id="search-results"
          className="absolute z-30 mt-1.5 w-full overflow-hidden rounded-lg border border-border bg-surface shadow-lg"
        >
          {results.length === 0 && !isFetching ? (
            <p className="px-3 py-2.5 text-xs text-text-muted">{t('searchNoResults')}</p>
          ) : null}
          <ul className="max-h-80 overflow-y-auto">
            {results.map((r, i) => (
              <li key={r.symbol}>
                <Link
                  href={`/assets/${r.symbol}`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setOpen(false)}
                  className={`flex items-center justify-between gap-2 px-3 py-2 text-sm transition-colors hover:bg-surface-2 ${
                    i === active ? 'bg-surface-2' : ''
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-md bg-surface-2 text-text-secondary">
                      <Icon name={r.icon ?? 'spark'} size={14} />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-text">{lang === 'fa' ? r.nameFa : r.nameEn}</span>
                      <span className="block text-[11px] text-text-muted" dir="ltr">
                        {r.symbol}
                        {r.matchedAlias ? ` · ${r.matchedAlias}` : ''}
                      </span>
                    </span>
                  </span>
                  <span className="flex items-center gap-2 text-xs">
                    {r.price ? <span className="tabular text-text-secondary">{r.price}</span> : null}
                    <ChangeBadge changePercent={r.changePercent} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={submit}
            className="block w-full border-t border-border px-3 py-2 text-left text-xs font-medium text-primary hover:bg-surface-2"
          >
            {t('searchResults', { q: query })}
          </button>
        </div>
      ) : null}
    </div>
  );
}
