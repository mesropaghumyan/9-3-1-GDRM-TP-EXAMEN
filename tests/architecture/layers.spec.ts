import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '../..');
const config = resolve(root, '.dependency-cruiser.cjs');
const depcruise = resolve(root, 'node_modules/.bin/depcruise');

function cruise(cwd: string): { status: number; output: string } {
  try {
    const output = execFileSync(depcruise, ['src', '--config', config], {
      cwd,
      encoding: 'utf8',
      stdio: 'pipe',
    });
    return { status: 0, output };
  } catch (error) {
    const failure = error as { status?: number; stdout?: string };
    return { status: failure.status ?? 1, output: failure.stdout ?? '' };
  }
}

// Why: dependency-cruiser runs as a child process and is slow when the whole suite runs in parallel.
const SLOW_TEST_TIMEOUT_MS = 60_000;

describe('Layer rules (AD-1)', { timeout: SLOW_TEST_TIMEOUT_MS }, () => {
  it('real source tree -> no violation', () => {
    expect(cruise(root).status).toBe(0);
  });

  it('domain importing application -> rule violation reported', () => {
    const result = cruise(resolve(root, 'tests/fixtures/arch-violation'));

    expect(result.status).not.toBe(0);
    expect(result.output).toContain('domain-no-forbidden-layer');
  });
});
