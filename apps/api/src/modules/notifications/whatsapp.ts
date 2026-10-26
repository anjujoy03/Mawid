import { formatInTimeZone } from 'date-fns-tz';
import { config } from '../../config';
import { logger } from '../../lib/logger';

const GRAPH_URL = 'https://graph.facebook.com/v20.0';

type TemplateName = 'booking_confirmed' | 'booking_reminder';

/**
 * Sends an approved WhatsApp Cloud API template. Business-initiated messages
 * have to be templates, so the wording itself lives in Meta's dashboard.
 * Without credentials we just log, which keeps local dev and tests quiet.
 */
export async function sendTemplate(to: string, template: TemplateName, lang: 'ar' | 'en', params: string[]) {
  if (!config.whatsappEnabled) {
    logger.info('whatsapp dry-run', { to, template, lang, params });
    return;
  }

  const res = await fetch(`${GRAPH_URL}/${config.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.WHATSAPP_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: {
        name: template,
        language: { code: lang },
        components: [{ type: 'body', parameters: params.map((text) => ({ type: 'text', text })) }],
      },
    }),
  });

  if (!res.ok) {
    // Don't throw — a failed notification should never fail a paid booking.
    logger.error('whatsapp send failed', { to, template, status: res.status, body: await res.text() });
  }
}

interface BookingForMessage {
  customerName: string;
  customerPhone: string;
  locale: string;
  startsAt: Date;
  service: { nameAr: string; nameEn: string };
}

function describe(booking: BookingForMessage) {
  const lang = booking.locale === 'en' ? 'en' : 'ar';
  const service = lang === 'ar' ? booking.service.nameAr : booking.service.nameEn;
  const when = formatInTimeZone(booking.startsAt, config.BUSINESS_TIMEZONE, 'yyyy-MM-dd HH:mm');
  return { lang, params: [booking.customerName, service, when] } as const;
}

export function sendBookingConfirmation(booking: BookingForMessage) {
  const { lang, params } = describe(booking);
  return sendTemplate(booking.customerPhone, 'booking_confirmed', lang, params);
}

export function sendBookingReminder(booking: BookingForMessage) {
  const { lang, params } = describe(booking);
  return sendTemplate(booking.customerPhone, 'booking_reminder', lang, params);
}
