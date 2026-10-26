import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { HttpError } from '../../lib/errors';
import { prisma } from '../../lib/prisma';
import { clearSession, requireAdmin, setSession } from '../../middleware/auth';

export const authRouter = Router();

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: 'draft-7', legacyHeaders: false });

// Compared against when the email doesn't exist, so response time doesn't leak which emails are real.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10);

authRouter.post('/auth/login', loginLimiter, async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);
  const admin = await prisma.adminUser.findUnique({ where: { email } });

  const ok = await bcrypt.compare(password, admin?.passwordHash ?? DUMMY_HASH);
  if (!admin || !ok) throw new HttpError(401, 'Wrong email or password', 'invalid_credentials');

  setSession(res, admin.id);
  res.json({ id: admin.id, name: admin.name, email: admin.email });
});

authRouter.post('/auth/logout', (_req, res) => {
  clearSession(res);
  res.sendStatus(204);
});

authRouter.get('/auth/me', requireAdmin, async (_req, res) => {
  const admin = await prisma.adminUser.findUnique({
    where: { id: res.locals.adminId },
    select: { id: true, name: true, email: true },
  });
  if (!admin) throw new HttpError(401, 'Not signed in', 'unauthorized');
  res.json(admin);
});
