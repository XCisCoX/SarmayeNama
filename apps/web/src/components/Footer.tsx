'use client';

import Link from 'next/link';
import { useI18n } from '@/lib/i18n';
import { CATEGORIES } from '@sarmaye/shared';

export function Footer() {
  const { t, lang } = useI18n();
  return (
    <footer className="mt-10 border-t border-border bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="grid gap-6 sm:grid-cols-3">
          <div>
            <p className="flex items-center gap-2 text-sm font-bold text-text">
              <span className="text-primary">◆</span> {t('siteName')}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-text-muted">{t('siteTagline')}</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-text">{t('navCategories')}</p>
            <ul className="mt-2 grid grid-cols-2 gap-1">
              {CATEGORIES.slice(0, 8).map((c) => (
                <li key={c.slug}>
                  <Link href={`/category/${c.slug}`} className="text-xs text-text-secondary hover:text-primary">
                    {lang === 'fa' ? c.titleFa : c.titleEn}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold text-text">{t('providers')}</p>
            <ul className="mt-2 space-y-1">
              <li>
                <Link href="/status" className="text-xs text-text-secondary hover:text-primary">
                  {t('statusTitle')}
                </Link>
              </li>
              <li>
                <Link href="/converter" className="text-xs text-text-secondary hover:text-primary">
                  {t('converterTitle')}
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <p className="mt-6 border-t border-border pt-4 text-xs leading-relaxed text-text-muted">
          {t('footerDisclaimer')}
          <br />
          {/* TradingView Lightweight Charts™ license attribution (required) */}
          <a
            href="https://www.tradingview.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-primary"
          >
            Charts by TradingView Lightweight Charts™ — tradingview.com
          </a>
        </p>
        <div className="mt-6 space-y-1 border-t border-border pt-4 text-[11px] leading-relaxed text-text-muted">
          <p>{t('footerRights')}</p>
          <p>{t('footerDisclaimer')}</p>
        </div>
      </div>
    </footer>
  );
}
