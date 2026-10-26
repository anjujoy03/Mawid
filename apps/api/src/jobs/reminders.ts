import { addHours } from 'date-fns';
import { logger } from '../lib/logger';
import { prisma } from '../lib/prisma';
import { sendBookingReminder } from '../modules/notifications/whatsapp';

const EVERY_MS = 5 * 60 * 1000;

export async function sendDueReminders(now = new Date()) {
  const due = await prisma.booking.findMany({
    where: {
      status: 'CONFIRMED',
      reminderSentAt: null,
      startsAt: { gt: now, lte: addHours(now, 24) },
    },
    include: { service: true },
    take: 50,
  });

  for (const booking of due) {
    // Claim first, so two API instances can't both send the same reminder.
    const { count } = await prisma.booking.updateMany({
      where: { id: booking.id, reminderSentAt: null },
      data: { reminderSentAt: now },
    });
    if (count === 1) await sendBookingReminder(booking);
  }
  return due.length;
}

export function startReminderJob() {
  const tick = () =>
    sendDueReminders().catch((err) => logger.error('reminder job failed', { err: String(err) }));
  tick();
  return setInterval(tick, EVERY_MS);
}
