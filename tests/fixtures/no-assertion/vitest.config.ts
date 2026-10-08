import { defineConfig } from 'vitest/config';

// Fixture config: same assertion rule as the real one, but it only sees *.fixture.ts files.
export default defineConfig({
  test: { include: ['*.fixture.ts'], expect: { requireAssertions: true } },
});
