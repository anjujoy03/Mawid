import { BookingStatus } from '@prisma/client';
import { Router } from 'express';
import { addDays, startOfWeek } from 'date-fns';
import { formatInTimeZone, fromZonedTime, toZonedTime } from 'date-fns-tz';
import { z } from 'zod';
import { config } from '../../config';
import { notFound } from '../../lib/errors';
import { prisma } from '../../lib/prisma';
import { requireAdmin } from '../../middleware/auth';

export const adminRouter = Router();
adminRouter.use('/admin', requireAdmin);

const tz = () => config.BUSINESS_TIMEZONE;
const today = () => formatInTimeZone(new Date(), tz(), 'yyyy-MM-dd');

adminRouter.get('/admin/bookings', async (req, res) => {
  const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).default(today()).parse(req.query.date);
  const from = fromZonedTime(`${date}T00:00:00`, tz());

  const bookings = await prisma.booking.findMany({
    where: {
      startsAt: { gte: from, lt: addDays(from, 1) },
      // Abandoned checkouts are noise for the owner.
      NOT: { status: BookingStatus.PENDING_PAYMENT, holdExpiresAt: { lt: new Date() } },
    },
    orderBy: { startsAt: 'asc' },
    include: { service: { select: { nameAr: true, nameEn: true } }, payment: { select: { status: true, amountHalalas: true } } },
  });
  res.json({ date, bookings });
});

const statusSchema = z.object({
  status: z.enum([BookingStatus.CONFIRMED, BookingStatus.CANCELLED, BookingStatus.COMPLETED, BookingStatus.NO_SHOW]),
});

adminRouter.patch('/admin/bookings/:id', async (req, res) => {
  const { status } = statusSchema.parse(req.body);
  const existing = await prisma.booking.findUnique({ where: { id: req.params.id } });
  if (!existing) throw notFound('Booking');

  const booking = await prisma.booking.update({ where: { id: existing.id }, data: { status } });
  res.json(booking);
});

adminRouter.get('/admin/stats', async (_req, res) => {
  const now = new Date();
  const dayStart = fromZonedTime(`${today()}T00:00:00`, tz());
  // Saudi work week starts Sunday
  const weekStart = fromZonedTime(startOfWeek(toZonedTime(now, tz()), { weekStartsOn: 0 }), tz());

  const [todayCount, upcoming, weekPaid, noShows] = await Promise.all([
    prisma.booking.count({
      where: { startsAt: { gte: dayStart, lt: addDays(dayStart, 1) }, status: { in: ['CONFIRMED', 'COMPLETED'] } },
    }),
    prisma.booking.count({ where: { startsAt: { gte: now }, status: 'CONFIRMED' } }),
    prisma.payment.aggregate({ where: { status: 'PAID', paidAt: { gte: weekStart } }, _sum: { amountHalalas: true } }),
    prisma.booking.count({ where: { startsAt: { gte: weekStart, lt: now }, status: 'NO_SHOW' } }),
  ]);

  res.json({
    todayCount,
    upcoming,
    weekDepositsHalalas: weekPaid._sum.amountHalalas ?? 0,
    weekNoShows: noShows,
  });
});

const serviceSchema = z.object({
  nameEn: z.string().trim().min(1).max(80),
  nameAr: z.string().trim().min(1).max(80),
  descriptionEn: z.string().trim().max(300).nullish(),
  descriptionAr: z.string().trim().max(300).nullish(),
  durationMinutes: z.number().int().min(5).max(480),
  priceHalalas: z.number().int().min(0),
  depositHalalas: z.number().int().min(0),
  active: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

adminRouter.get('/admin/services', async (_req, res) => {
  res.json(await prisma.service.findMany({ orderBy: { sortOrder: 'asc' } }));
});

adminRouter.post('/admin/services', async (req, res) => {
  const data = serviceSchema.parse(req.body);
  res.status(201).json(await prisma.service.create({ data }));
});

adminRouter.patch('/admin/services/:id', async (req, res) => {
  const data = serviceSchema.partial().parse(req.body);
  const existing = await prisma.service.findUnique({ where: { id: req.params.id } });
  if (!existing) throw notFound('Service');
  // Services are never hard-deleted — old bookings still point at them. Use active: false.
  res.json(await prisma.service.update({ where: { id: existing.id }, data }));
});
