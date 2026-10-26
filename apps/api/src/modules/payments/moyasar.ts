import { timingSafeEqual } from 'node:crypto';
import { config } from '../../config';
import { HttpError } from '../../lib/errors';

const BASE_URL = 'https://api.moyasar.com/v1';

export interface MoyasarInvoice {
  id: string;
  status: 'initiated' | 'paid' | 'failed' | 'refunded' | 'canceled' | 'on_hold' | 'expired';
  amount: number;
  url: string;
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const auth = Buffer.from(`${config.MOYASAR_SECRET_KEY}:`).toString('base64');
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json', ...init.headers },
  });
  if (!res.ok) {
    throw new HttpError(502, `Moyasar ${path} failed with ${res.status}`, 'payment_provider_error');
  }
  return res.json() as Promise<T>;
}

export function createInvoice(input: { amountHalalas: number; description: string; bookingId: string; returnUrl: string }) {
  return call<MoyasarInvoice>('/invoices', {
    method: 'POST',
    body: JSON.stringify({
      amount: input.amountHalalas,
      currency: 'SAR',
      description: input.description,
      success_url: input.returnUrl,
      back_url: input.returnUrl,
      metadata: { booking_id: input.bookingId },
    }),
  });
}

export function fetchInvoice(id: string) {
  return call<MoyasarInvoice>(`/invoices/${encodeURIComponent(id)}`);
}

/** Moyasar puts the shared secret in the webhook body rather than a header. */
export function isValidWebhookToken(received: unknown, expected: string | undefined) {
  if (!expected || typeof received !== 'string') return false;
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
