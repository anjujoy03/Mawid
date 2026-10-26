'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Locale } from '@/lib/i18n';

export function LocaleSwitcher({ locale, label }: { locale: Locale; label: string }) {
  const pathname = usePathname();
  const other = locale === 'ar' ? 'en' : 'ar';
  const href = pathname.replace(/^\/(ar|en)/, `/${other}`);

  return (
    <Link href={href} className="rounded-full border border-stone-300 px-3 py-1 text-sm text-stone-700 transition hover:border-brass hover:text-ink" hrefLang={other}>
      {label}
    </Link>
  );
}
