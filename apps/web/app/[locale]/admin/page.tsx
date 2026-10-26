'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { StatusBadge } from '@/components/StatusBadge';
import { api, ApiError, post } from '@/lib/api';
import { businessToday, formatMoney, formatNumber, formatTime } from '@/lib/format';
import { fill, getMessages, type Locale } from '@/lib/i18n';
import type { AdminBooking, BookingStatus, Stats } from '@/lib/types';

export default function AdminPage({ params }: { params: { locale: Locale } }) {
  const { locale } = params;
  const t = getMessages(locale);
  const router = useRouter();

  const [date, setDate] = useState(businessToday);
  const [stats, setStats] = useState<Stats | null>(null);
  const [bookings, setBookings] = useState<AdminBooking[] | null>(null);

  const load = useCallback(async () => {
    try {
      const [s, b] = await Promise.all([
        api<Stats>('/admin/stats'),
        api<{ bookings: AdminBooking[] }>(`/admin/bookings?date=${date}`),
      ]);
      setStats(s);
      setBookings(b.bookings);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) router.replace(`/${locale}/admin/login`);
    }
  }, [date, locale, router]);

  useEffect(() => {
    load();
  }, [load]);

  async function setStatus(id: string, status: BookingStatus) {
    if (status === 'CANCELLED' && !confirm(t.admin.confirmCancel)) return;
    await api(`/admin/bookings/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
    load();
  }

  async function logout() {
    await post('/auth/logout');
    router.replace(`/${locale}/admin/login`);
  }

  const tiles = stats && [
    { label: t.admin.today, value: formatNumber(stats.todayCount, locale) },
    { label: t.admin.upcoming, value: formatNumber(stats.upcoming, locale) },
    { label: t.admin.weekDeposits, value: formatMoney(stats.weekDepositsHalalas, locale) },
    { label: t.admin.weekNoShows, value: formatNumber(stats.weekNoShows, locale) },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t.admin.title}</h1>
        <button onClick={logout} className="text-sm text-stone-500 hover:text-ink">{t.admin.logout}</button>
      </div>

      {tiles && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {tiles.map((tile) => (
            <div key={tile.label} className="card p-4">
              <p className="text-xs text-stone-500">{tile.label}</p>
              <p className="mt-1 text-2xl font-semibold">{tile.value}</p>
            </div>
          ))}
        </div>
      )}

      <input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} className="input w-auto" />

      {bookings?.length === 0 && <p className="text-stone-500">{t.admin.noBookings}</p>}

      <ul className="space-y-3">
        {bookings?.map((b) => (
          <li key={b.id} className="card flex flex-wrap items-center gap-x-6 gap-y-3">
            <div className="w-20 text-lg font-semibold">{formatTime(b.startsAt, locale)}</div>
            <div className="min-w-0 flex-1">
              <p className="font-medium">
                {b.customerName} <span className="ltr-nums text-sm font-normal text-stone-500">+{b.customerPhone}</span>
              </p>
              <p className="text-sm text-stone-600">
                {locale === 'ar' ? b.service.nameAr : b.service.nameEn}
                {b.payment?.status === 'PAID' && ` · ${fill(t.admin.paid, { amount: formatMoney(b.payment.amountHalalas, locale) })}`}
              </p>
              {b.notes && <p className="mt-1 text-sm italic text-stone-500">“{b.notes}”</p>}
            </div>
            <StatusBadge status={b.status} label={t.admin.status[b.status]} />
            {b.status === 'CONFIRMED' && (
              <div className="flex gap-2">
                <button onClick={() => setStatus(b.id, 'COMPLETED')} className="btn-primary px-3 py-1.5 text-sm">{t.admin.markDone}</button>
                <button onClick={() => setStatus(b.id, 'NO_SHOW')} className="btn-ghost px-3 py-1.5 text-sm">{t.admin.markNoShow}</button>
                <button onClick={() => setStatus(b.id, 'CANCELLED')} className="btn-ghost px-3 py-1.5 text-sm text-red-600">{t.admin.cancel}</button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
