import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['__tests__/**/*.test.ts'],
    // Live sandbox tests opt-in via SUMOPOD_API_KEY
    testTimeout: 30_000,
  },
});
