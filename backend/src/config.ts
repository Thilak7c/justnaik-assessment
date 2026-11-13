import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  TEST_DATABASE_URL: z.string().optional(),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
  JWT_EXPIRES_IN: z.string().default('1h'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  MAX_UPLOAD_BYTES: z.coerce.number().int().positive().default(5 * 1024 * 1024),
  MAX_UPLOAD_ROWS: z.coerce.number().int().positive().default(10_000),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  // Fail fast on startup instead of failing later with a confusing error.
  console.error('Invalid environment configuration:', parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`));
  process.exit(1);
}

const env = parsed.data;

export const config = {
  ...env,
  isTest: env.NODE_ENV === 'test',
  // Tests always run against the separate test database so they never touch real data.
  databaseUrl: env.NODE_ENV === 'test' ? env.TEST_DATABASE_URL ?? env.DATABASE_URL : env.DATABASE_URL,
};
