import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.spec.ts'],
    setupFiles: ['tests/setup.ts'],
    environment: 'node',
    // Why: a test without any assertion proves nothing and must fail (CLAUDE.md §6.6).
    expect: { requireAssertions: true },
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      reporter: ['text', 'lcov'],
      // Why: seuils bloquants de CLAUDE.md §6.6, globs par périmètre.
      thresholds: {
        lines: 85,
        branches: 80,
        'src/domain/**': { lines: 90, branches: 85 },
        'src/application/**': { lines: 90, branches: 85 },
        'src/infrastructure/**': { lines: 85, branches: 75 },
      },
    },
  },
});
