'use client';

import type { Quote } from '@sarmaye/shared';
import { useI18n } from '@/lib/i18n';
import { AssetTable } from './AssetTable';
import { Card, CardBody, EmptyState } from './ui/primitives';

export function CategoryClient({
  title,
  description,
  icon,
  assets,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  assets: Quote[];
}) {
  const { t } = useI18n();
  return (
    <div className="space-y-4">
      <header className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-surface-2 text-text-secondary">{icon}</span>
        <div>
          <h1 className="text-xl font-bold text-text">{title}</h1>
          <p className="text-sm text-text-secondary">{description}</p>
        </div>
      </header>
      {assets.length > 0 ? (
        <AssetTable quotes={assets} />
      ) : (
        <Card>
          <CardBody>
            <EmptyState title={t('noData')} hint={t('noDataHint')} />
          </CardBody>
        </Card>
      )}
    </div>
  );
}
