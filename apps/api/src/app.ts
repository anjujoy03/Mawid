import cookieParser from 'cookie-parser';
import express from 'express';
import helmet from 'helmet';
import { errorHandler } from './middleware/error-handler';
import { adminRouter } from './modules/admin/admin.routes';
import { authRouter } from './modules/auth/auth.routes';
import { bookingsRouter } from './modules/bookings/bookings.routes';
import { paymentsRouter } from './modules/payments/payments.routes';
import { servicesRouter } from './modules/services/services.routes';

export function createApp() {
  const app = express();

  // Behind the Next.js rewrite / a load balancer; needed for correct req.ip in rate limits.
  app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());

  app.get('/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.use(servicesRouter);
  app.use(bookingsRouter);
  app.use(paymentsRouter);
  app.use(authRouter);
  app.use(adminRouter);

  app.use((_req, res) => {
    res.status(404).json({ error: 'not_found' });
  });
  app.use(errorHandler);

  return app;
}
