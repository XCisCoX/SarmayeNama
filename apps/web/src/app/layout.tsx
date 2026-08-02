import type { Metadata, Viewport } from 'next';
import { cookies } from 'next/headers';
import localFont from 'next/font/local';
import { getDictionary, normalizeLang } from '@sarmaye/shared';
import { I18nProvider } from '@/lib/i18n';
import { ThemeProvider } from '@/lib/theme';
import { SettingsProvider } from '@/lib/settings';
import { QueryProvider } from '@/lib/query';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { ServiceWorkerRegister } from '@/components/ServiceWorkerRegister';
import './globals.css';

const vazirmatn = localFont({
  src: '../../public/fonts/Vazirmatn.woff2',
  variable: '--font-vazirmatn',
  display: 'swap',
  weight: '100 900',
});

/** Anti-FOUC theme script: applies the stored/system theme before first paint. */
const themeInit = `(function(){try{var c=document.cookie.match(/(?:^|;\\s*)sarmaye_theme=([^;]*)/);var t=c?c[1]:'system';var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(d)document.documentElement.classList.add('dark');document.documentElement.style.colorScheme=d?'dark':'light';}catch(e){}})();`;

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  const lang = normalizeLang(cookieStore.get('sarmaye_lang')?.value);
  const dict = getDictionary(lang);
  const origin = process.env.WEB_ORIGIN ?? 'http://localhost:3000';
  return {
    title: {
      default: `${dict.siteName} — ${dict.siteTagline}`,
      template: `%s | ${dict.siteName}`,
    },
    description: dict.siteDescription,
    metadataBase: new URL(origin),
    alternates: { canonical: '/' },
    openGraph: {
      type: 'website',
      locale: lang === 'fa' ? 'fa_IR' : 'en_US',
      title: dict.siteName,
      description: dict.siteDescription,
      siteName: dict.siteName,
    },
    twitter: {
      card: 'summary',
      title: dict.siteName,
      description: dict.siteDescription,
    },
    robots: { index: true, follow: true },
  };
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f5f6f8' },
    { media: '(prefers-color-scheme: dark)', color: '#0d1117' },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const lang = normalizeLang(cookieStore.get('sarmaye_lang')?.value);
  return (
    <html lang={lang} dir={lang === 'fa' ? 'rtl' : 'ltr'} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body className={`${vazirmatn.variable} font-sans`}>
        <I18nProvider initialLang={lang}>
          <ThemeProvider>
            <SettingsProvider>
              <QueryProvider>
                <ServiceWorkerRegister />
                <a
                  href="#main"
                  className="sr-only focus:not-sr-only focus:absolute focus:start-2 focus:top-2 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-3 focus:py-2 focus:text-white"
                >
                  Skip to content
                </a>
                <div className="flex min-h-screen flex-col">
                  <Header />
                  <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-5">
                    {children}
                  </main>
                  <Footer />
                </div>
              </QueryProvider>
            </SettingsProvider>
          </ThemeProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
