import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { addDays } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { config } from '../../config';
import { HttpError } from '../../lib/errors';
import { prisma } from '../../lib/prisma';
import { createBooking, getAvailability } from './bookings.service';
import { weekdayOf } from './slots';

// Hits a real Postgres (mawid_test, see vitest.config.ts): the whole point is
// to check what the database does when several requests land at once.

// Enough that several transactions are open at once even with a small connection pool.
const CUSTOMERS = 20;

// A week out, so "slots in the past" never gets in the way.
const date = formatInTimeZone(addDays(new Date(), 7), config.BUSINESS_TIMEZONE, 'yyyy-MM-dd');
const weekday = weekdayOf(date);

let serviceId: string;
let previousHours: Awaited<ReturnType<typeof prisma.workingHours.findUnique>>;

beforeAll(async () => {
  previousHours = await prisma.workingHours.findUnique({ where: { weekday } });
  await prisma.workingHours.upsert({
    where: { weekday },
    update: { openMinute: 10 * 60, closeMinute: 22 * 60 },
    create: { weekday, openMinute: 10 * 60, closeMinute: 22 * 60 },
  });

  // No deposit, so createBooking confirms straight away and never touches Moyasar.
  const service = await prisma.service.create({
    data: { nameEn: 'Race test', nameAr: 'اختبار', durationMinutes: 30, priceHalalas: 5000 },
  });
  serviceId = service.id;
});

afterAll(async () => {
  await prisma.booking.deleteMany({ where: { serviceId } });
  await prisma.service.delete({ where: { id: serviceId } });
  if (previousHours) await prisma.workingHours.update({ where: { weekday }, data: previousHours });
  else await prisma.workingHours.delete({ where: { weekday } });
  await prisma.$disconnect();
});

describe('createBooking under concurrency', () => {
  it('lets exactly one of several simultaneous customers take the same slot', async () => {
    const [slot] = await getAvailability(serviceId, date);
    expect(slot).toBeDefined();

    // Prisma opens connections lazily. Without this warm-up the first booking
    // often commits before the others have a connection, and nothing races.
    await Promise.all(Array.from({ length: CUSTOMERS }, () => prisma.$executeRaw`SELECT pg_sleep(0.05)`));

    const results = await Promise.allSettled(
      Array.from({ length: CUSTOMERS }, (_, i) =>
        createBooking({
          serviceId,
          startsAt: slot,
          customerName: `Customer ${i}`,
          customerPhone: `96650000000${i}`,
          locale: 'ar',
        }),
      ),
    );

    const won = results.filter((r) => r.status === 'fulfilled');
    const lost = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');

    expect(won).toHaveLength(1);
    // Every loser must get the friendly "someone just took it" error, not a 500.
    for (const r of lost) {
      expect(r.reason).toBeInstanceOf(HttpError);
      expect(r.reason).toMatchObject({ status: 409, code: 'slot_unavailable' });
    }

    const stored = await prisma.booking.count({ where: { serviceId, startsAt: slot } });
    expect(stored).toBe(1);

    // And the slot is gone from what the next customer sees.
    const after = await getAvailability(serviceId, date);
    expect(after.map(Number)).not.toContain(slot.getTime());
  });
});
