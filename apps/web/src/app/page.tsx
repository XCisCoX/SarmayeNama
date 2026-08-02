import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { normalizeLang, getDictionary } from '@sarmaye/shared';
import { getOverview } from '@/lib/server-data';
import { HomeClient } from '@/components/HomeClient';

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  const lang = normalizeLang(cookieStore.get('sarmaye_lang')?.value);
  const dict = getDictionary(lang);
  return {
    title: `${dict.homeTitle} — ${dict.siteName}`,
    description: dict.siteDescription,
    alternates: { canonical: '/' },
  };
}

export default async function HomePage() {
  const cookieStore = await cookies();
  const lang = normalizeLang(cookieStore.get('sarmaye_lang')?.value);
  const overview = await getOverview(lang);
  return <HomeClient initialData={overview} lang={lang} />;
}
