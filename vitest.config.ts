import { defineConfig } from 'vitest/config'

// Vitest config files are consumed through a default export.
// eslint-disable-next-line import/no-default-export
export default defineConfig({
  test: {
    coverage: {
      exclude: [
        'build/**',
        'node_modules/**',
        'reports/**',
        '__tests__/**',
        'vitest.config.ts',
      ],
      include: ['src/**/*.ts'],
      provider: 'v8',
      reporter: ['text', 'html', 'lcov', 'json-summary'],
      reportsDirectory: 'reports/coverage',
      thresholds: {
        branches: 70,
        functions: 90,
        lines: 85,
        statements: 85,
      },
    },
    environment: 'node',
    exclude: ['build/**', 'node_modules/**'],
    include: ['__tests__/**/*.test.ts'],
  },
})
