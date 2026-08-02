import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { normalizeLang } from '@sarmaye/shared';
import { getCategoryAssets } from '@/lib/server-data';
import { CategoryClient } from '@/components/CategoryClient';
import { Icon } from '@/components/Icon';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const cookieStore = await cookies();
  const lang = normalizeLang(cookieStore.get('sarmaye_lang')?.value);
  const result = await getCategoryAssets(slug);
  if (!result) return { title: 'Not found' };
  return {
    title: lang === 'fa' ? result.category.titleFa : result.category.titleEn,
    description: lang === 'fa' ? result.category.descriptionFa : result.category.descriptionEn,
    alternates: { canonical: `/category/${slug}` },
  };
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;
  const cookieStore = await cookies();
  const lang = normalizeLang(cookieStore.get('sarmaye_lang')?.value);
  const result = await getCategoryAssets(slug);
  if (!result) notFound();
  const { category, assets } = result;
  return (
    <CategoryClient
      title={lang === 'fa' ? category.titleFa : category.titleEn}
      description={lang === 'fa' ? category.descriptionFa : category.descriptionEn}
      icon={<Icon name={category.icon} size={24} />}
      assets={assets}
    />
  );
}
