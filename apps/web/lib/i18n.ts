import ar from '@/messages/ar.json';
import en from '@/messages/en.json';

export const locales = ['ar', 'en'] as const;
export type Locale = (typeof locales)[number];
export type Messages = typeof en;

const all: Record<Locale, Messages> = { ar, en };

export const isLocale = (value: string): value is Locale => (locales as readonly string[]).includes(value);
export const getMessages = (locale: Locale) => all[locale];
export const dirOf = (locale: Locale) => (locale === 'ar' ? 'rtl' : 'ltr');

/** "Deposit {amount}" + { amount: '20 SAR' } */
export function fill(template: string, vars: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(vars[key] ?? `{${key}}`));
}
