import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '../..');
const SLOW_TEST_TIMEOUT_MS = 120_000;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? sourceFiles(path) : path.endsWith('.ts') ? [path] : [];
  });
}

describe('Static analysis of src/', () => {
  it('no empty catch block (comments do not count as handling)', () => {
    const offenders = sourceFiles(join(root, 'src')).filter((file) =>
      /catch\s*(\([^)]*\))?\s*\{\s*(\/\/[^\n]*\s*|\/\*[\s\S]*?\*\/\s*)*\}/.test(
        readFileSync(file, 'utf8'),
      ),
    );

    expect(offenders).toEqual([]);
  });

  it(
    'no floating promise and no empty block according to ESLint',
    { timeout: SLOW_TEST_TIMEOUT_MS },
    () => {
      const output = execFileSync(
        join(root, 'node_modules/.bin/eslint'),
        [
          'src',
          '--format',
          'json',
          '--rule',
          '{"no-empty":"error","@typescript-eslint/no-floating-promises":"error"}',
        ],
        { cwd: root, encoding: 'utf8', maxBuffer: 20_000_000 },
      );
      const results = JSON.parse(output) as { messages: { ruleId: string | null }[] }[];
      const hits = results.flatMap((file) =>
        file.messages.filter(
          (m) => m.ruleId === 'no-empty' || m.ruleId === '@typescript-eslint/no-floating-promises',
        ),
      );

      expect(hits).toEqual([]);
    },
  );
});
