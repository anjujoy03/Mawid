import type { BookingStatus } from '@/lib/types';

const styles: Record<BookingStatus, string> = {
  PENDING_PAYMENT: 'bg-amber-100 text-amber-800',
  CONFIRMED: 'bg-brand-light text-brand-dark',
  COMPLETED: 'bg-stone-200 text-stone-700',
  CANCELLED: 'bg-red-100 text-red-700',
  NO_SHOW: 'bg-red-100 text-red-700',
};

export function StatusBadge({ status, label }: { status: BookingStatus; label: string }) {
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status]}`}>{label}</span>;
}
