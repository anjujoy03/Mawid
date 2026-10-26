import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BookingForm } from '@/components/BookingForm';
import { api, ApiError } from '@/lib/api';
import { formatMoney, formatNumber } from '@/lib/format';
import { fill, getMessages, type Locale } from '@/lib/i18n';
import type { Service } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function BookPage({ params }: { params: { locale: Locale; serviceId: string } }) {
  const { locale } = params;
  const t = getMessages(locale);

  const service = await api<Service>(`/services/${params.serviceId}`).catch((err) => {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  });

  return (
    <>
      <Link href={`/${locale}`} className="text-sm text-stone-500 hover:text-ink">
        {locale === 'ar' ? '→' : '←'} {t.book.back}
      </Link>
      <div className="pattern-lattice mt-3 rounded-2xl bg-brand px-5 py-5 text-sand shadow-md">
        <h1 className="font-display text-3xl font-bold">{locale === 'ar' ? service.nameAr : service.nameEn}</h1>
        <p className="mt-2 flex flex-wrap gap-2 text-sm">
          <span className="rounded-full bg-brass px-3 py-1 font-semibold text-white">{formatMoney(service.priceHalalas, locale)}</span>
          <span className="rounded-full bg-white/10 px-3 py-1">⏱ {fill(t.home.minutes, { n: formatNumber(service.durationMinutes, locale) })}</span>
        </p>
      </div>
      <BookingForm service={service} locale={locale} />
    </>
  );
}
