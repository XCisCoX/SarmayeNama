'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { getDictionary, normalizeLang, tpl, type Dictionary, type Lang } from '@sarmaye/shared';

interface I18nContextValue {
  lang: Lang;
  dir: 'rtl' | 'ltr';
  dict: Dictionary;
  setLang: (lang: Lang) => void;
  toggle: () => void;
  t: (key: keyof Dictionary, values?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

const LANG_COOKIE = 'sarmaye_lang';

export function getLangCookie(): Lang | null {
  if (typeof document === 'undefined') return null;
  const m = document.cookie.match(/(?:^|;\s*)sarmaye_lang=([^;]*)/);
  return normalizeLang(m?.[1] ?? null, 'fa') as Lang;
}

export function I18nProvider({
  children,
  initialLang,
}: {
  children: ReactNode;
  initialLang: Lang;
}) {
  const [lang, setLangState] = useState<Lang>(initialLang);
  const router = useRouter();

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'fa' ? 'rtl' : 'ltr';
  }, [lang]);

  const setLang = useCallback(
    (next: Lang) => {
      setLangState(next);
      document.cookie = `${LANG_COOKIE}=${next}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
      document.documentElement.lang = next;
      document.documentElement.dir = next === 'fa' ? 'rtl' : 'ltr';
      // Re-render server components so metadata and SSR content follow the cookie.
      router.refresh();
    },
    [router]
  );

  const toggle = useCallback(() => {
    setLangState((prev) => {
      const next = prev === 'fa' ? 'en' : 'fa';
      document.cookie = `${LANG_COOKIE}=${next}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
      return next;
    });
    router.refresh();
  }, [router]);

  const dict = useMemo(() => getDictionary(lang), [lang]);
  const dir: 'rtl' | 'ltr' = lang === 'fa' ? 'rtl' : 'ltr';

  const t = useCallback(
    (key: keyof Dictionary, values?: Record<string, string | number>) => {
      const template = dict[key] ?? String(key);
      return values ? tpl(template, values) : template;
    },
    [dict]
  );

  const value = useMemo(() => ({ lang, dir, dict, setLang, toggle, t }), [lang, dir, dict, setLang, toggle, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}
