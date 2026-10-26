import { BookingStatusView } from '@/components/BookingStatusView';
import type { Locale } from '@/lib/i18n';

export default function BookingPage({
  params,
  searchParams,
}: {
  params: { locale: Locale; id: string };
  searchParams: { mock?: string };
}) {
  return <BookingStatusView id={params.id} locale={params.locale} mock={searchParams.mock === '1'} />;
}
