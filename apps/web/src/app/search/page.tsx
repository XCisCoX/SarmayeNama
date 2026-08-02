import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { normalizeLang, getDictionary } from '@sarmaye/shared';
import { SearchPageClient } from '@/components/SearchPageClient';

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  const lang = normalizeLang(cookieStore.get('sarmaye_lang')?.value);
  const dict = getDictionary(lang);
  return { title: dict.searchTitle, description: dict.searchPageSubtitle, alternates: { canonical: '/search' } };
}

export default function SearchPage() {
  return <SearchPageClient />;
}
