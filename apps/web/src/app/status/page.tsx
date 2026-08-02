import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { normalizeLang, getDictionary } from '@sarmaye/shared';
import { getProviderStatuses, getStaleAssetSymbols } from '@/lib/server-data';
import { StatusClient } from '@/components/StatusClient';

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  const lang = normalizeLang(cookieStore.get('sarmaye_lang')?.value);
  const dict = getDictionary(lang);
  return { title: dict.statusTitle, description: dict.statusSubtitle, alternates: { canonical: '/status' } };
}

export default async function StatusPage() {
  const cookieStore = await cookies();
  const lang = normalizeLang(cookieStore.get('sarmaye_lang')?.value);
  const [providers, staleAssets] = await Promise.all([getProviderStatuses(), getStaleAssetSymbols()]);
  return <StatusClient providers={providers} staleAssets={staleAssets} lang={lang} />;
}
