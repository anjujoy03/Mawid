import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET should be at least 32 characters'),
  APP_URL: z.string().url().default('http://localhost:3000'),
  BUSINESS_TIMEZONE: z.string().default('Asia/Riyadh'),
  MOYASAR_SECRET_KEY: z.string().optional(),
  MOYASAR_WEBHOOK_SECRET: z.string().optional(),
  WHATSAPP_TOKEN: z.string().optional(),
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const config = {
  ...parsed.data,
  isProd: parsed.data.NODE_ENV === 'production',
  // Empty strings from .env count as "not set".
  moyasarEnabled: Boolean(parsed.data.MOYASAR_SECRET_KEY),
  whatsappEnabled: Boolean(parsed.data.WHATSAPP_TOKEN && parsed.data.WHATSAPP_PHONE_NUMBER_ID),
};
