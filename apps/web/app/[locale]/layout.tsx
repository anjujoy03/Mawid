import type { Metadata } from 'next';
import { El_Messiri, IBM_Plex_Sans_Arabic } from 'next/font/google';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { Header } from '@/components/Header';
import { dirOf, getMessages, isLocale, locales } from '@/lib/i18n';
import '../globals.css';

// One font that looks right in both scripts, instead of mixing two families.
const font = IBM_Plex_Sans_Arabic({
  subsets: ['arabic', 'latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

// Headings only: a calligraphic display face that also has Latin glyphs.
const display = El_Messiri({
  subsets: ['arabic', 'latin'],
  weight: ['500', '600', '700'],
  display: 'swap',
  variable: '--font-display',
});

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export function generateMetadata({ params }: { params: { locale: string } }): Metadata {
  if (!isLocale(params.locale)) return {};
  const t = getMessages(params.locale);
  return { title: t.brand, description: t.home.subtitle };
}

export default function LocaleLayout({ children, params }: { children: ReactNode; params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  const t = getMessages(params.locale);

  return (
    <html lang={params.locale} dir={dirOf(params.locale)}>
      <body className={`${font.className} ${display.variable} flex min-h-screen flex-col bg-sand text-ink antialiased`}>
        <Header locale={params.locale} />
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">{children}</main>
        <footer className="border-t border-stone-200 py-6 text-center text-sm text-stone-500">
          <p className="font-display text-base text-ink">{t.brand}</p>
          <p className="mt-1">{t.footer.tagline}</p>
        </footer>
      </body>
    </html>
  );
}
