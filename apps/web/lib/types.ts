export interface Service {
  id: string;
  nameEn: string;
  nameAr: string;
  descriptionEn: string | null;
  descriptionAr: string | null;
  durationMinutes: number;
  priceHalalas: number;
  depositHalalas: number;
}

export type BookingStatus = 'PENDING_PAYMENT' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW';

export interface PublicBooking {
  id: string;
  status: BookingStatus;
  startsAt: string;
  endsAt: string;
  customerName: string;
  holdExpiresAt: string | null;
  service: Pick<Service, 'nameAr' | 'nameEn' | 'priceHalalas' | 'depositHalalas'>;
  payment: { provider: string; status: string } | null;
}

export interface AdminBooking {
  id: string;
  status: BookingStatus;
  startsAt: string;
  customerName: string;
  customerPhone: string;
  notes: string | null;
  service: { nameAr: string; nameEn: string };
  payment: { status: string; amountHalalas: number } | null;
}

export interface Stats {
  todayCount: number;
  upcoming: number;
  weekDepositsHalalas: number;
  weekNoShows: number;
}
