import { afterAll, beforeAll, beforeEach } from 'vitest';
import { db } from '../src/db/knex';

// Runs against TEST_DATABASE_URL (see src/config.ts) – never the development database.
beforeAll(async () => {
  await db.migrate.latest();
});

// Every test starts with empty tables so tests cannot affect each other.
beforeEach(async () => {
  await db.raw('TRUNCATE TABLE locations, users RESTART IDENTITY CASCADE');
});

afterAll(async () => {
  await db.destroy();
});
