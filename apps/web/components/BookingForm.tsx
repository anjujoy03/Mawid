'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { api, ApiError, post } from '@/lib/api';
import { formatDay, formatMoney, formatNumber, formatTime, nextDays } from '@/lib/format';
import { fill, getMessages, type Locale } from '@/lib/i18n';
import type { Service } from '@/lib/types';

const DAYS_AHEAD = 14;
const SAVED_KEY = 'mawid:customer';

export function BookingForm({ service, locale }: { service: Service; locale: Locale }) {
  const t = getMessages(locale);
  const router = useRouter();
  const [days] = useState(() => nextDays(DAYS_AHEAD));

  const [day, setDay] = useState(days[0]);
  const [slots, setSlots] = useState<string[] | null>(null);
  const [slot, setSlot] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Returning customers shouldn't have to type their number every time.
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(SAVED_KEY) ?? 'null');
      if (saved) {
        setName(saved.name ?? '');
        setPhone(saved.phone ?? '');
      }
    } catch {
      /* private mode etc. — not important */
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    setSlots(null);
    setSlot(null);
    api<{ slots: string[] }>(`/services/${service.id}/availability?date=${day}`)
      .then((res) => !cancelled && setSlots(res.slots))
      .catch(() => !cancelled && setSlots([]));
    return () => {
      cancelled = true;
    };
  }, [service.id, day, reloadKey]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!slot) return;
    setSubmitting(true);
    setError(null);
    setPhoneError(null);

    try {
      const res = await post<{ id: string; paymentUrl: string | null }>('/bookings', {
        serviceId: service.id,
        startsAt: slot,
        customerName: name,
        phone,
        notes: notes || undefined,
        locale,
      });
      try {
        localStorage.setItem(SAVED_KEY, JSON.stringify({ name, phone }));
      } catch {}

      if (res.paymentUrl) window.location.href = res.paymentUrl;
      else router.push(`/${locale}/booking/${res.id}`);
    } catch (err) {
      setSubmitting(false);
      if (err instanceof ApiError && err.code === 'slot_unavailable') {
        setError(t.book.taken);
        setReloadKey((k) => k + 1);
      } else if (err instanceof ApiError && err.issues?.phone) {
        setPhoneError(err.issues.phone[0]);
      } else {
        setError(t.book.genericError);
      }
    }
  }

  const dayLabel = (d: string, i: number) =>
    i === 0 ? t.book.today : i === 1 ? t.book.tomorrow : formatDay(d, locale, { weekday: 'short' });

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-8">
      <section>
        <h2 className="section-title"><span className="step">{formatNumber(1, locale)}</span>{t.book.chooseDay}</h2>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2">
          {days.map((d, i) => (
            <button
              key={d}
              type="button"
              onClick={() => setDay(d)}
              aria-pressed={d === day}
              className={`flex min-w-[4.5rem] flex-col items-center rounded-xl border px-3 py-2.5 text-sm transition ${
                d === day ? 'border-brand bg-brand text-sand shadow-md ring-2 ring-brass' : 'border-stone-200 bg-white hover:border-brass'
              }`}
            >
              <span>{dayLabel(d, i)}</span>
              <span className="font-display text-xl font-semibold">{formatDay(d, locale, { day: 'numeric' })}</span>
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2 className="section-title"><span className="step">{formatNumber(2, locale)}</span>{t.book.chooseTime}</h2>
        {slots === null && (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5" aria-label={t.book.loading}>
            {Array.from({ length: 10 }, (_, i) => (
              <div key={i} className="h-10 animate-pulse rounded-lg bg-stone-200/70" />
            ))}
          </div>
        )}
        {slots?.length === 0 && <p className="rounded-xl border border-dashed border-stone-300 p-4 text-center text-stone-500">{t.book.noSlots}</p>}
        {!!slots?.length && (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {slots.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSlot(s)}
                aria-pressed={s === slot}
                className={`rounded-lg border py-2.5 text-sm font-medium transition ${
                  s === slot ? 'border-brand bg-brand text-sand shadow-md ring-2 ring-brass' : 'border-stone-200 bg-white hover:border-brass'
                }`}
              >
                {formatTime(s, locale)}
              </button>
            ))}
          </div>
        )}
      </section>

      {slot && (
        <section className="card space-y-4">
          <h2 className="section-title mb-0"><span className="step">{formatNumber(3, locale)}</span>{t.book.yourDetails}</h2>
          <div>
            <label htmlFor="name" className="label">{t.book.name}</label>
            <input id="name" className="input" required minLength={2} maxLength={80} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
          </div>
          <div>
            <label htmlFor="phone" className="label">{t.book.phone}</label>
            <input
              id="phone"
              className="input ltr-nums text-start"
              required
              inputMode="tel"
              autoComplete="tel"
              placeholder="05xxxxxxxx"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              aria-invalid={!!phoneError}
            />
            <p className={`mt-1 text-sm ${phoneError ? 'text-red-600' : 'text-stone-500'}`}>{phoneError ?? t.book.phoneHint}</p>
          </div>
          <div>
            <label htmlFor="notes" className="label">{t.book.notes}</label>
            <textarea id="notes" className="input" rows={2} maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

          <button type="submit" className="btn-brass w-full py-3 text-base" disabled={submitting}>
            {submitting
              ? t.book.submitting
              : service.depositHalalas > 0
                ? fill(t.book.submitPay, { amount: formatMoney(service.depositHalalas, locale) })
                : t.book.submit}
          </button>
        </section>
      )}
    </form>
  );
}
