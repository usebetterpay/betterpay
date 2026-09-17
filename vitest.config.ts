import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: ['packages/*'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      // Start as informational; raise once legacy provider copy-paste suites are rewritten.
      thresholds: { lines: 0, functions: 0, branches: 0, statements: 0 },
    },
  },
});
