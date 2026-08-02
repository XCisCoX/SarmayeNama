'use client';

import { useI18n } from '@/lib/i18n';
import { useSettings } from '@/lib/settings';
import { Icon } from './Icon';
import { cn } from '@/lib/utils';

/** Favorite toggle (localStorage-backed; auth/cloud sync can be added later). */
export function FavoriteButton({ symbol, size = 18, className }: { symbol: string; size?: number; className?: string }) {
  const { t } = useI18n();
  const { isFavorite, toggleFavorite } = useSettings();
  const active = isFavorite(symbol);
  return (
    <button
      type="button"
      className={cn('rounded-md p-1 transition-colors hover:bg-surface-2', active ? 'text-warning' : 'text-text-muted', className)}
      aria-pressed={active}
      aria-label={active ? t('unfavorite') : t('favorite')}
      title={active ? t('unfavorite') : t('favorite')}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleFavorite(symbol);
      }}
    >
      <Icon name={active ? 'starFilled' : 'star'} size={size} />
    </button>
  );
}
