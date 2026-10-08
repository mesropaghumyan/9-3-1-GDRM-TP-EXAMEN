import { describe, expect, it } from 'vitest';

describe('Global test setup', () => {
  it('calling fetch -> throws an explicit error', () => {
    expect(() => fetch('https://example.invalid')).toThrow(/Network access is forbidden/);
  });
});
