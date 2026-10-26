import { Router } from 'express';
import { config } from '../../config';
import { HttpError } from '../../lib/errors';
import { logger } from '../../lib/logger';
import { markPaid } from '../bookings/bookings.service';
import { fetchInvoice, isValidWebhookToken } from './moyasar';

export const paymentsRouter = Router();

paymentsRouter.post('/payments/moyasar/webhook', async (req, res) => {
  const { type, secret_token, data } = req.body ?? {};

  if (!isValidWebhookToken(secret_token, config.MOYASAR_WEBHOOK_SECRET)) {
    logger.warn('moyasar webhook with bad token', { ip: req.ip });
    res.sendStatus(401);
    return;
  }

  if (type === 'payment_paid' && data?.invoice_id) {
    // Don't trust the payload's status blindly — confirm with Moyasar.
    const invoice = await fetchInvoice(String(data.invoice_id));
    if (invoice.status === 'paid') await markPaid(invoice.id);
  }

  res.sendStatus(200);
});

paymentsRouter.post('/payments/mock/:bookingId/pay', async (req, res) => {
  if (config.isProd || config.moyasarEnabled) throw new HttpError(404, 'Not found', 'not_found');
  await markPaid(`mock_${req.params.bookingId}`);
  res.sendStatus(204);
});
