import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '../../..');
const fixtureDir = resolve(root, 'tests/fixtures/no-assertion');
const SLOW_TEST_TIMEOUT_MS = 60_000;

describe('Assertion requirement', () => {
  it(
    'a test without any assertion -> the run fails',
    () => {
      const run = spawnSync(
        resolve(root, 'node_modules/.bin/vitest'),
        ['run', '--root', fixtureDir, '--config', resolve(fixtureDir, 'vitest.config.ts')],
        { cwd: root, encoding: 'utf8' },
      );

      expect(run.status).not.toBe(0);
      expect(`${run.stdout}${run.stderr}`).toMatch(/but got none/);
    },
    SLOW_TEST_TIMEOUT_MS,
  );
});
