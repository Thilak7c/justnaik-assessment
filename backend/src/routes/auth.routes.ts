import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { config } from '../config';
import { currentUserId, requireAuth } from '../middleware/requireAuth';
import { parseOrThrow } from '../middleware/validate';
import { credentialsSchema } from '../schemas/auth.schema';
import * as authService from '../services/auth.service';
import { HttpError } from '../utils/httpError';

export const authRouter = Router();

// Slow down password guessing. Disabled in tests so they can log in many times.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 50,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => config.isTest,
  handler: (_req, _res, next) => next(new HttpError(429, 'TOO_MANY_REQUESTS', 'Too many attempts. Please try again later.')),
});

authRouter.post('/register', authLimiter, async (req, res) => {
  const credentials = parseOrThrow(credentialsSchema, req.body);
  const result = await authService.register(credentials);
  res.status(201).json(result);
});

authRouter.post('/login', authLimiter, async (req, res) => {
  const credentials = parseOrThrow(credentialsSchema, req.body);
  const result = await authService.login(credentials);
  res.json(result);
});

authRouter.get('/me', requireAuth, async (req, res) => {
  const user = await authService.getUserById(currentUserId(req));
  // Token is valid but the account no longer exists -> treat as logged out.
  if (!user) throw HttpError.unauthorized('Account not found. Please log in again.', 'INVALID_TOKEN');
  res.json({ user });
});
