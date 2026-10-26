import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { normalizeSaudiMobile } from '../../lib/phone';
import { createBooking, getAvailability, getPublicBooking, syncPaymentStatus } from './bookings.service';

export const bookingsRouter = Router();

const createSchema = z.object({
  serviceId: z.string().min(1),
  startsAt: z.coerce.date(),
  customerName: z.string().trim().min(2).max(80),
  phone: z
    .string()
    .transform((v) => normalizeSaudiMobile(v))
    .refine((v): v is string => v !== null, 'Enter a Saudi mobile number, e.g. 05xxxxxxxx'),
  locale: z.enum(['ar', 'en']).default('ar'),
  notes: z.string().trim().max(500).optional(),
});

const dateParam = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD');

// Someone hammering this endpoint is either a bot or a bug. Either way, slow down.
const createLimiter = rateLimit({ windowMs: 10 * 60 * 1000, limit: 10, standardHeaders: 'draft-7', legacyHeaders: false });

bookingsRouter.get('/services/:id/availability', async (req, res) => {
  const date = dateParam.parse(req.query.date);
  const slots = await getAvailability(req.params.id, date);
  res.json({ date, slots });
});

bookingsRouter.post('/bookings', createLimiter, async (req, res) => {
  const body = createSchema.parse(req.body);
  const { booking, paymentUrl } = await createBooking({ ...body, customerPhone: body.phone });
  res.status(201).json({ id: booking.id, status: booking.status, paymentUrl });
});

bookingsRouter.get('/bookings/:id', async (req, res) => {
  res.json(await getPublicBooking(req.params.id));
});

bookingsRouter.post('/bookings/:id/sync-payment', async (req, res) => {
  await syncPaymentStatus(req.params.id);
  res.json(await getPublicBooking(req.params.id));
});
