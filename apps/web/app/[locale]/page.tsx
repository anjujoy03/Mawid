import Link from 'next/link';
import { ScissorsIcon } from '@/components/Header';
import { api } from '@/lib/api';
import { formatMoney, formatNumber } from '@/lib/format';
import { fill, getMessages, type Locale } from '@/lib/i18n';
import type { Service } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function HomePage({ params }: { params: { locale: Locale } }) {
  const { locale } = params;
  const t = getMessages(locale);
  const services = await api<Service[]>('/services').catch(() => null);

  return (
    <>
      <section className="pattern-lattice relative overflow-hidden rounded-3xl bg-brand px-6 py-10 text-sand shadow-lg sm:px-10 sm:py-14">
        <p className="text-sm font-medium tracking-wide text-brass-light">{t.home.eyebrow}</p>
        <h1 className="mt-2 font-display text-4xl font-bold leading-tight sm:text-5xl">{t.home.title}</h1>
        <p className="mt-3 max-w-md text-stone-300">{t.home.subtitle}</p>
        <a href="#services" className="btn-brass mt-6">
          {t.home.cta}
        </a>
        <ScissorsIcon className="pointer-events-none absolute -bottom-6 end-4 h-40 w-40 rotate-12 text-brass opacity-15" />
      </section>

      <ul className="mt-6 grid gap-3 text-sm sm:grid-cols-3">
        {t.home.perks.map((perk) => (
          <li key={perk} className="flex items-center gap-2 rounded-xl bg-white/70 px-4 py-3 text-stone-700">
            <span className="h-2 w-2 shrink-0 rotate-45 bg-brass" aria-hidden />
            {perk}
          </li>
        ))}
      </ul>

      <h2 id="services" className="mt-12 scroll-mt-24 font-display text-2xl font-bold">
        {t.home.servicesTitle}
      </h2>

      {!services && <p className="card mt-6 text-red-700">{t.home.apiDown}</p>}

      <ul className="mt-6 grid gap-4 sm:grid-cols-2">
        {services?.map((s) => {
          const name = locale === 'ar' ? s.nameAr : s.nameEn;
          const description = locale === 'ar' ? s.descriptionAr : s.descriptionEn;
          return (
            <li key={s.id} className="card group flex flex-col transition hover:-translate-y-0.5 hover:border-brass/60 hover:shadow-md">
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-display text-xl font-semibold">{name}</h3>
                <span className="whitespace-nowrap rounded-full bg-brand-light px-3 py-1 text-sm font-semibold text-brand">
                  {formatMoney(s.priceHalalas, locale)}
                </span>
              </div>
              {description && <p className="mt-1 text-sm text-stone-600">{description}</p>}
              <p className="mt-4 flex flex-wrap gap-x-3 gap-y-1 text-sm text-stone-500">
                <span>⏱ {fill(t.home.minutes, { n: formatNumber(s.durationMinutes, locale) })}</span>
                <span>
                  {s.depositHalalas > 0
                    ? fill(t.home.deposit, { amount: formatMoney(s.depositHalalas, locale) })
                    : t.home.payAtShop}
                </span>
              </p>
              <Link href={`/${locale}/book/${s.id}`} className="btn-primary mt-5 w-full group-hover:bg-brand-dark">
                {t.home.book}
                <span aria-hidden>{locale === 'ar' ? '←' : '→'}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}
