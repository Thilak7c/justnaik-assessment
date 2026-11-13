import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { HttpError } from '../utils/httpError';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** Set by requireAuth. The ONLY trusted source of "who is calling". */
      userId?: number;
    }
  }
}

/**
 * Verifies the `Authorization: Bearer <jwt>` header.
 * - missing/garbled/tampered token -> 401 INVALID_TOKEN
 * - expired token                  -> 401 TOKEN_EXPIRED (frontend logs the user out with a message)
 */
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization ?? '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return next(HttpError.unauthorized('Please log in to continue', 'INVALID_TOKEN'));
  }

  try {
    const payload = jwt.verify(token, config.JWT_SECRET, { algorithms: ['HS256'] });
    const userId = Number(typeof payload === 'object' ? payload.sub : NaN);
    if (!Number.isInteger(userId) || userId <= 0) throw new Error('Bad subject');
    req.userId = userId;
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      return next(HttpError.unauthorized('Your session has expired. Please log in again.', 'TOKEN_EXPIRED'));
    }
    next(HttpError.unauthorized('Invalid session. Please log in again.', 'INVALID_TOKEN'));
  }
}

/** Use inside handlers that run after requireAuth. */
export function currentUserId(req: Request): number {
  if (!req.userId) throw HttpError.unauthorized();
  return req.userId;
}
