import type { Locale } from './i18n';

export const BUSINESS_TZ = process.env.NEXT_PUBLIC_BUSINESS_TZ ?? 'Asia/Riyadh';

// ar-SA defaults to the Hijri calendar. Customers think in Gregorian for
// appointments, so force it — but keep the Arabic digits.
const intlLocale = (locale: Locale) => (locale === 'ar' ? 'ar-SA-u-ca-gregory' : 'en-GB');

export function formatMoney(halalas: number, locale: Locale) {
  return new Intl.NumberFormat(intlLocale(locale), {
    style: 'currency',
    currency: 'SAR',
    maximumFractionDigits: halalas % 100 === 0 ? 0 : 2,
  }).format(halalas / 100);
}

export function formatNumber(n: number, locale: Locale) {
  return new Intl.NumberFormat(intlLocale(locale)).format(n);
}

export function formatTime(iso: string | Date, locale: Locale) {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: BUSINESS_TZ,
  }).format(new Date(iso));
}

export function formatDateTime(iso: string | Date, locale: Locale) {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: BUSINESS_TZ,
  }).format(new Date(iso));
}

/** Formats a YYYY-MM-DD calendar date without any timezone drift. */
export function formatDay(date: string, locale: Locale, opts: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat(intlLocale(locale), { ...opts, timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`));
}

/** Today's date in the business timezone, as YYYY-MM-DD. en-CA happens to format exactly like that. */
export function businessToday() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: BUSINESS_TZ }).format(new Date());
}

export function nextDays(count: number, from = businessToday()) {
  const start = new Date(`${from}T12:00:00Z`);
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);
    return d.toISOString().slice(0, 10);
  });
}
