import Link from 'next/link';
import { getMessages, type Locale } from '@/lib/i18n';
import { LocaleSwitcher } from './LocaleSwitcher';

export function Header({ locale }: { locale: Locale }) {
  const t = getMessages(locale);
  return (
    <header className="sticky top-0 z-10 border-b border-stone-200/70 bg-sand/85 backdrop-blur">
      <div className="barber-stripe h-1" aria-hidden />
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
        <Link href={`/${locale}`} className="flex items-center gap-2.5 text-ink">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-brass-light">
            <ScissorsIcon className="h-5 w-5" />
          </span>
          <span className="font-display text-xl font-bold">{t.brand}</span>
        </Link>
        <LocaleSwitcher locale={locale} label={t.switchLocale} />
      </div>
    </header>
  );
}

export function ScissorsIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <circle cx="6" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <path d="M20 4 8.12 15.88M14.47 14.48 20 20M8.12 8.12 12 12" />
    </svg>
  );
}
