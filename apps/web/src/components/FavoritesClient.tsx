'use client';

import { useQuery } from '@tanstack/react-query';
import type { MarketOverview } from '@sarmaye/shared';
import { useI18n } from '@/lib/i18n';
import { useSettings } from '@/lib/settings';
import { apiFetch } from '@/lib/api';
import { MarketCard } from './MarketCard';
import { Card, CardBody, EmptyState } from './ui/primitives';

/** Favorites page: localStorage-backed watchlist. */
export function FavoritesClient() {
  const { t, lang } = useI18n();
  const { favorites } = useSettings();
  const { data } = useQuery({
    queryKey: ['overview', lang],
    queryFn: () => apiFetch<MarketOverview>(`/api/market/overview?lang=${lang}`),
    staleTime: 30_000,
  });

  const favAssets = data?.assets.filter((a) => favorites.includes(a.assetSymbol)) ?? [];

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-xl font-bold text-text sm:text-2xl">{t('navFavorites')}</h1>
        <p className="mt-0.5 text-sm text-text-secondary">{t('favoritesEmptyHint')}</p>
      </header>
      {favorites.length === 0 || favAssets.length === 0 ? (
        <Card>
          <CardBody>
            <EmptyState title={t('favoritesEmpty')} hint={t('favoritesEmptyHint')} />
          </CardBody>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {favAssets.map((a) => (
            <MarketCard key={a.assetId} asset={a} />
          ))}
        </div>
      )}
    </div>
  );
}
