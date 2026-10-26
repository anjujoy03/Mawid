import { BookingStatus, Prisma } from '@prisma/client';
import { addDays, addMinutes } from 'date-fns';
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';
import { config } from '../../config';
import { HttpError, notFound } from '../../lib/errors';
import { logger } from '../../lib/logger';
import { prisma } from '../../lib/prisma';
import { sendBookingConfirmation } from '../notifications/whatsapp';
import { createInvoice, fetchInvoice } from '../payments/moyasar';
import { generateSlots, weekdayOf, type Interval } from './slots';

const HOLD_MINUTES = 15;
const tz = () => config.BUSINESS_TIMEZONE;

type Db = Prisma.TransactionClient | typeof prisma;

/** Confirmed bookings plus unpaid ones whose hold hasn't run out yet. */
async function busyIntervals(db: Db, from: Date, to: Date, now: Date): Promise<Interval[]> {
  const rows = await db.booking.findMany({
    where: {
      startsAt: { lt: to },
      endsAt: { gt: from },
      OR: [
        { status: BookingStatus.CONFIRMED },
        { status: BookingStatus.PENDING_PAYMENT, holdExpiresAt: { gt: now } },
      ],
    },
    select: { startsAt: true, endsAt: true },
  });
  return rows.map((r) => ({ start: r.startsAt, end: r.endsAt }));
}

export async function getAvailability(serviceId: string, date: string, now = new Date()) {
  const service = await prisma.service.findFirst({ where: { id: serviceId, active: true } });
  if (!service) throw notFound('Service');

  const hours = await prisma.workingHours.findUnique({ where: { weekday: weekdayOf(date) } });
  if (!hours) return [];

  const dayStart = fromZonedTime(`${date}T00:00:00`, tz());
  const busy = await busyIntervals(prisma, dayStart, addDays(dayStart, 1), now);

  return generateSlots({
    date,
    timezone: tz(),
    openMinute: hours.openMinute,
    closeMinute: hours.closeMinute,
    durationMinutes: service.durationMinutes,
    busy,
    now,
  });
}

export interface CreateBookingInput {
  serviceId: string;
  startsAt: Date;
  customerName: string;
  customerPhone: string;
  locale: 'ar' | 'en';
  notes?: string;
}

export async function createBooking(input: CreateBookingInput) {
  const now = new Date();
  const service = await prisma.service.findFirst({ where: { id: input.serviceId, active: true } });
  if (!service) throw notFound('Service');

  // Re-run the same slot logic the UI used, so nobody can POST 03:07 on a Friday.
  const date = formatInTimeZone(input.startsAt, tz(), 'yyyy-MM-dd');
  const available = await getAvailability(service.id, date, now);
  if (!available.some((s) => s.getTime() === input.startsAt.getTime())) {
    throw new HttpError(409, 'That time is no longer available', 'slot_unavailable');
  }

  const endsAt = addMinutes(input.startsAt, service.durationMinutes);
  const needsPayment = service.depositHalalas > 0;

  let booking;
  try {
    // Serializable so two people grabbing the same slot can't both win.
    // Postgres aborts one of them with a serialization failure (Prisma P2034).
    booking = await prisma.$transaction(
      async (tx) => {
        const clash = await busyIntervals(tx, input.startsAt, endsAt, now);
        if (clash.length) throw new HttpError(409, 'That time is no longer available', 'slot_unavailable');

        return tx.booking.create({
          data: {
            serviceId: service.id,
            customerName: input.customerName,
            customerPhone: input.customerPhone,
            locale: input.locale,
            notes: input.notes,
            startsAt: input.startsAt,
            endsAt,
            status: needsPayment ? BookingStatus.PENDING_PAYMENT : BookingStatus.CONFIRMED,
            holdExpiresAt: needsPayment ? addMinutes(now, HOLD_MINUTES) : null,
          },
          include: { service: true },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2034') {
      throw new HttpError(409, 'That time is no longer available', 'slot_unavailable');
    }
    throw err;
  }

  if (!needsPayment) {
    await sendBookingConfirmation(booking);
    return { booking, paymentUrl: null };
  }

  const returnUrl = `${config.APP_URL}/${input.locale}/booking/${booking.id}`;

  if (!config.moyasarEnabled) {
    // Local dev without Moyasar keys: the booking page shows a "simulate payment" button.
    await prisma.payment.create({
      data: { bookingId: booking.id, provider: 'mock', providerRef: `mock_${booking.id}`, amountHalalas: service.depositHalalas },
    });
    return { booking, paymentUrl: `${returnUrl}?mock=1` };
  }

  const invoice = await createInvoice({
    amountHalalas: service.depositHalalas,
    description: `${service.nameEn} – ${date}`,
    bookingId: booking.id,
    returnUrl,
  });
  await prisma.payment.create({
    data: { bookingId: booking.id, providerRef: invoice.id, amountHalalas: invoice.amount },
  });

  return { booking, paymentUrl: invoice.url };
}

/**
 * Called from the webhook, the "I'm back from checkout" check, and the mock.
 * Safe to call any number of times — only the first call flips the status.
 */
export async function markPaid(paymentRef: string) {
  const payment = await prisma.payment.findUnique({ where: { providerRef: paymentRef } });
  if (!payment) throw notFound('Payment');

  const confirmed = await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: payment.id },
      data: { status: 'PAID', paidAt: payment.paidAt ?? new Date() },
    });
    const { count } = await tx.booking.updateMany({
      where: { id: payment.bookingId, status: BookingStatus.PENDING_PAYMENT },
      data: { status: BookingStatus.CONFIRMED, holdExpiresAt: null },
    });
    return count === 1;
  });

  if (confirmed) {
    const booking = await prisma.booking.findUniqueOrThrow({ where: { id: payment.bookingId }, include: { service: true } });

    // If the customer sat on the checkout page past the hold, someone else may
    // have taken the slot. Rare, but the owner needs to know to call them.
    const clash = await busyIntervals(prisma, booking.startsAt, booking.endsAt, new Date());
    if (clash.length > 1) logger.warn('paid booking overlaps another booking', { bookingId: booking.id });

    await sendBookingConfirmation(booking);
  }
}

/** Customer came back from Moyasar — ask Moyasar directly instead of waiting on the webhook. */
export async function syncPaymentStatus(bookingId: string) {
  const payment = await prisma.payment.findUnique({ where: { bookingId } });
  if (!payment || payment.status === 'PAID' || payment.provider !== 'moyasar') return;

  const invoice = await fetchInvoice(payment.providerRef);
  if (invoice.status === 'paid') await markPaid(invoice.id);
}

export async function getPublicBooking(id: string) {
  const booking = await prisma.booking.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      startsAt: true,
      endsAt: true,
      customerName: true,
      holdExpiresAt: true,
      service: { select: { nameAr: true, nameEn: true, priceHalalas: true, depositHalalas: true } },
      payment: { select: { provider: true, status: true } },
    },
  });
  if (!booking) throw notFound('Booking');
  return booking;
}
