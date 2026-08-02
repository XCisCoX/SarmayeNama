import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { normalizeLang, getDictionary } from '@sarmaye/shared';
import { ConverterWidget } from '@/components/ConverterWidget';

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  const lang = normalizeLang(cookieStore.get('sarmaye_lang')?.value);
  const dict = getDictionary(lang);
  return {
    title: dict.converterTitle,
    description: dict.converterSubtitle,
    alternates: { canonical: '/converter' },
  };
}

export default async function ConverterPage() {
  const cookieStore = await cookies();
  const lang = normalizeLang(cookieStore.get('sarmaye_lang')?.value);
  const dict = getDictionary(lang);
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <header>
        <h1 className="text-xl font-bold text-text sm:text-2xl">{dict.converterTitle}</h1>
        <p className="mt-0.5 text-sm text-text-secondary">{dict.converterSubtitle}</p>
      </header>
      <ConverterWidget initialFrom="USD" initialTo="TOMAN" />
    </div>
  );
}
