import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { normalizeLang, getDictionary, tpl, CATEGORIES } from '@sarmaye/shared';
import { getAssetDetail } from '@/lib/server-data';
import { AssetDetailClient } from '@/components/AssetDetailClient';

interface Props {
  params: Promise<{ symbol: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { symbol } = await params;
  const cookieStore = await cookies();
  const lang = normalizeLang(cookieStore.get('sarmaye_lang')?.value);
  const detail = await getAssetDetail(symbol.toUpperCase());
  const origin = process.env.WEB_ORIGIN ?? 'http://localhost:3000';
  if (!detail.asset) {
    return { title: 'Not found' };
  }
  const name = lang === 'fa' ? detail.asset.nameFa : detail.asset.nameEn;
  const dict = getDictionary(lang);
  return {
    title: tpl(dict.assetDetailTitle, { name }),
    description: `${name} — ${dict.siteTagline}`,
    alternates: { canonical: `/assets/${symbol.toUpperCase()}` },
    openGraph: {
      title: name,
      description: `${name} — ${dict.siteDescription}`,
      url: `${origin}/assets/${symbol.toUpperCase()}`,
      type: 'website',
    },
  };
}

export default async function AssetDetailPage({ params }: Props) {
  const { symbol } = await params;
  const cookieStore = await cookies();
  const lang = normalizeLang(cookieStore.get('sarmaye_lang')?.value);
  const detail = await getAssetDetail(symbol.toUpperCase());
  if (!detail.asset) notFound();
  const category = CATEGORIES.find((c) => c.assetClass === detail.asset.assetClass);
  return <AssetDetailClient detail={detail} lang={lang} categoryIcon={category?.icon ?? 'spark'} />;
}
