import { afterEach, describe, expect, it, vi } from 'vitest';
import { run } from '../../../src/main/run.js';

const env = { MUSIC_PROVIDER_ORDER: 'local' };

function captureStdout(): string[] {
  const lines: string[] = [];
  vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
    lines.push(String(chunk));
    return true;
  });
  return lines;
}

describe('run (command line)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('known user -> exit code 0 and the DELIVERED result printed', async () => {
    const lines = captureStdout();

    const code = await run(['alice', 'LUNDI', 'SOLEIL'], env);

    expect(code).toBe(0);
    expect(lines.join('')).toContain('"status":"DELIVERED"');
  });

  it('unknown user -> exit code 1 and an explicit FAILED result, not an exception', async () => {
    const lines = captureStdout();

    const code = await run(['ghost', 'LUNDI', 'SOLEIL'], env);

    expect(code).toBe(1);
    expect(lines.join('')).toContain('USER_NOT_FOUND');
  });

  it('invalid input -> exit code 2 and INVALID_INPUT printed', async () => {
    const lines = captureStdout();

    const code = await run(['alice', 'FUNDAY', 'SOLEIL'], env);

    expect(code).toBe(2);
    expect(lines.join('')).toContain('INVALID_INPUT');
  });

  it('missing arguments -> treated as invalid input', async () => {
    captureStdout();

    expect(await run([], env)).toBe(2);
  });
});
