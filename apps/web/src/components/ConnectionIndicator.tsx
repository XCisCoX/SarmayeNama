'use client';

import { useEffect, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

/** Connection status indicator (online/offline). */
export function ConnectionIndicator() {
  const { t } = useI18n();
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium',
        online ? 'bg-up-soft text-up' : 'bg-down-soft text-down'
      )}
      role="status"
      aria-live="polite"
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', online ? 'bg-up' : 'bg-down')} />
      {online ? t('online') : t('offline')}
    </span>
  );
}
