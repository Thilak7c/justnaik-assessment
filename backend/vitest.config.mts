import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    env: { NODE_ENV: 'test' },
    setupFiles: ['./tests/setup.ts'],
    // Tests share one real PostgreSQL test database, so run files one after another.
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 30000,
  },
});
