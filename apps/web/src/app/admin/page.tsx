import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { normalizeLang, getDictionary } from '@sarmaye/shared';
import { AdminClient } from '@/components/AdminClient';

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  const lang = normalizeLang(cookieStore.get('sarmaye_lang')?.value);
  const dict = getDictionary(lang);
  return {
    title: dict.adminTitle,
    robots: { index: false, follow: false },
  };
}

export default function AdminPage() {
  return <AdminClient />;
}
