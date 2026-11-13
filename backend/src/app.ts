import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { config } from './config';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { authRouter } from './routes/auth.routes';
import { locationRouter } from './routes/location.routes';
import { uploadRouter } from './routes/upload.routes';

/** Builds the Express app without starting a server, so tests can use it with supertest. */
export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: config.CORS_ORIGIN.split(',').map((o) => o.trim()) }));
  app.use(express.json({ limit: '100kb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api/auth', authRouter);
  app.use('/api/locations', locationRouter);
  app.use('/api/uploads', uploadRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
