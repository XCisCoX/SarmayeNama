import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { normalizeLang, getDictionary } from '@sarmaye/shared';
import { FavoritesClient } from '@/components/FavoritesClient';

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  const lang = normalizeLang(cookieStore.get('sarmaye_lang')?.value);
  const dict = getDictionary(lang);
  return { title: dict.navFavorites };
}

export default function FavoritesPage() {
  return <FavoritesClient />;
}
