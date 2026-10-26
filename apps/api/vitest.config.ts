import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: process.env.DATABASE_URL ?? 'postgresql://mawid:mawid@localhost:5432/mawid_test',
      JWT_SECRET: process.env.JWT_SECRET ?? 'test-secret-test-secret-test-secret!',
    },
  },
});
