import { defineConfig } from 'vitest/config';

const isMaven = process.env.TEST_MAVEN === 'true';

export default defineConfig({
  test: {
    environment: 'node',
    include: isMaven ? ['test/maven-compile.test.ts'] : ['test/**/*.test.ts'],
    exclude: isMaven ? [] : ['test/maven-compile.test.ts'],
    testTimeout: 120000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.ts'],
      thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 },
    },
  },
});
