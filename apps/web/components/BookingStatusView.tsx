'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { api, post } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { getMessages, type Locale } from '@/lib/i18n';
import type { PublicBooking } from '@/lib/types';

const POLL_MS = 3000;
const MAX_POLLS = 20;

export function BookingStatusView({ id, locale, mock }: { id: string; locale: Locale; mock: boolean }) {
  const t = getMessages(locale);
  const [booking, setBooking] = useState<PublicBooking | null>(null);
  const [failed, setFailed] = useState(false);
  const [paying, setPaying] = useState(false);

  // Coming back from checkout: ask the API to check with Moyasar right away,
  // then keep polling a little in case the webhook is the one that lands first.
  useEffect(() => {
    let polls = 0;
    let timer: ReturnType<typeof setTimeout>;
    let stopped = false;

    const tick = async (sync: boolean) => {
      try {
        const b = sync ? await post<PublicBooking>(`/bookings/${id}/sync-payment`) : await api<PublicBooking>(`/bookings/${id}`);
        if (stopped) return;
        setBooking(b);
        if (b.status === 'PENDING_PAYMENT' && !mock && ++polls < MAX_POLLS) {
          timer = setTimeout(() => tick(false), POLL_MS);
        }
      } catch {
        if (!stopped) setFailed(true);
      }
    };
    tick(true);

    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [id, mock]);

  const simulatePayment = useCallback(async () => {
    setPaying(true);
    await post(`/payments/mock/${id}/pay`);
    setBooking(await api<PublicBooking>(`/bookings/${id}`));
    setPaying(false);
  }, [id]);

  if (failed) return <p className="card text-red-700">{t.book.genericError}</p>;
  if (!booking) return <p className="text-stone-500">{t.booking.checking}</p>;

  const confirmed = booking.status === 'CONFIRMED';

  return (
    <div className="card mx-auto max-w-md text-center">
      <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full text-2xl ${confirmed ? 'bg-brass text-white' : 'bg-amber-100'}`}>
        {confirmed ? '✓' : '…'}
      </div>
      <h1 className="mt-4 font-display text-3xl font-bold">{t.booking[booking.status]}</h1>

      <dl className="mt-6 space-y-2 rounded-xl bg-sand p-4 text-start">
        <div className="flex justify-between gap-4">
          <dt className="text-stone-500">{t.booking.service}</dt>
          <dd className="font-medium">{locale === 'ar' ? booking.service.nameAr : booking.service.nameEn}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-stone-500">{t.booking.when}</dt>
          <dd className="font-medium">{formatDateTime(booking.startsAt, locale)}</dd>
        </div>
      </dl>

      {confirmed && <p className="mt-6 text-sm text-stone-600">{t.booking.whatsappNote}</p>}
      {booking.status === 'PENDING_PAYMENT' && <p className="mt-6 text-sm text-stone-600">{t.booking.holdNote}</p>}

      {mock && booking.status === 'PENDING_PAYMENT' && (
        <button onClick={simulatePayment} disabled={paying} className="btn-ghost mt-4 w-full border-dashed">
          {t.booking.mockPay}
        </button>
      )}

      <Link href={`/${locale}`} className="btn-ghost mt-6 w-full">
        {t.booking.bookAnother}
      </Link>
    </div>
  );
}
