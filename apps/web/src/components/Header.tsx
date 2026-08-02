'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useI18n } from '@/lib/i18n';
import { useTheme } from '@/lib/theme';
import { useSettings } from '@/lib/settings';
import { Icon } from './Icon';
import { SearchBox } from './SearchBox';
import { cn } from '@/lib/utils';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const { t } = useI18n();
  const dark = theme === 'dark' || (theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  return (
    <button
      type="button"
      className="btn btn-ghost px-2.5 py-2"
      aria-label={t('navTheme')}
      title={t('navTheme')}
      onClick={() => setTheme(dark ? 'light' : 'dark')}
    >
      <Icon name={dark ? 'sun' : 'moon'} size={18} />
    </button>
  );
}

export function LanguageToggle() {
  const { lang, toggle, t } = useI18n();
  return (
    <button
      type="button"
      data-testid="lang-toggle"
      className="btn btn-ghost px-2.5 py-2 text-xs font-semibold"
      aria-label={t('navLanguage')}
      title={t('navLanguage')}
      onClick={toggle}
    >
      {lang === 'fa' ? 'EN' : 'فا'}
    </button>
  );
}

export function CurrencyModeToggle() {
  const { t } = useI18n();
  const { mode, setMode } = useSettings();
  return (
    <div className="flex items-center rounded-lg border border-border bg-surface p-0.5" role="group" aria-label={t('currencyMode')}>
      {(['TOMAN', 'RIAL'] as const).map((m) => (
        <button
          key={m}
          type="button"
          className={cn(
            'rounded-md px-2 py-1 text-xs font-medium transition-colors',
            mode === m ? 'bg-primary text-white' : 'text-text-muted hover:text-text'
          )}
          aria-pressed={mode === m}
          onClick={() => setMode(m)}
        >
          {m === 'TOMAN' ? t('tomanShort') : t('rialShort')}
        </button>
      ))}
    </div>
  );
}

export function Header() {
  const { t } = useI18n();
  const pathname = usePathname();
  const { favorites } = useSettings();

  const navItems = [
    { href: '/', label: t('navHome'), icon: 'home' },
    { href: '/converter', label: t('navConverter'), icon: 'calc' },
    { href: '/status', label: t('navStatus'), icon: 'server' },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-2.5">
        <Link href="/" className="flex items-center gap-2" aria-label={t('siteName')}>
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white">
            <Icon name="trending" size={18} />
          </span>
          <span className="hidden text-base font-bold text-text sm:block">{t('siteName')}</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label={t('navCategories')}>
          {navItems.map((item) => {
            const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                  isActive ? 'bg-primary-soft text-primary' : 'text-text-secondary hover:bg-surface-2 hover:text-text'
                )}
              >
                <Icon name={item.icon} size={15} />
                {item.label}
              </Link>
            );
          })}
          {favorites.length > 0 ? (
            <Link
              href="/favorites"
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-2 hover:text-text"
            >
              <Icon name="star" size={15} />
              {t('navFavorites')}
            </Link>
          ) : null}
        </nav>

        <div className="ms-auto flex flex-1 items-center justify-end gap-1.5 md:max-w-sm">
          <SearchBox className="hidden w-full sm:block" />
          <CurrencyModeToggle />
          <LanguageToggle />
          <ThemeToggle />
        </div>
      </div>
      <div className="border-t border-border px-4 py-1.5 sm:hidden">
        <SearchBox />
      </div>
      <nav className="flex items-center gap-1 overflow-x-auto px-2 pb-1.5 md:hidden" aria-label={t('navCategories')}>
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium',
              pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
                ? 'bg-primary-soft text-primary'
                : 'text-text-secondary'
            )}
          >
            <Icon name={item.icon} size={13} />
            {item.label}
          </Link>
        ))}
        {favorites.length > 0 ? (
          <Link href="/favorites" className="flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-text-secondary">
            <Icon name="star" size={13} />
            {t('navFavorites')}
          </Link>
        ) : null}
      </nav>
    </header>
  );
}
