import type { RequestHandler, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { HttpError } from '../lib/errors';

export const SESSION_COOKIE = 'mawid_session';
const SESSION_HOURS = 12;

export function setSession(res: Response, adminId: string) {
  const token = jwt.sign({ sub: adminId }, config.JWT_SECRET, { expiresIn: `${SESSION_HOURS}h` });
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.isProd,
    maxAge: SESSION_HOURS * 60 * 60 * 1000,
    path: '/',
  });
}

export function clearSession(res: Response) {
  res.clearCookie(SESSION_COOKIE, { path: '/' });
}

export const requireAdmin: RequestHandler = (req, res, next) => {
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token) throw new HttpError(401, 'Not signed in', 'unauthorized');

  try {
    const payload = jwt.verify(token, config.JWT_SECRET) as jwt.JwtPayload;
    res.locals.adminId = payload.sub;
    next();
  } catch {
    throw new HttpError(401, 'Session expired', 'unauthorized');
  }
};
