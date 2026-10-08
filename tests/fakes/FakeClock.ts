import type { Clock } from '../../src/domain/index.js';

export class FakeClock implements Clock {
  constructor(private current: number = Date.UTC(2026, 0, 1)) {}

  now(): Date {
    // Why: a fake Clock must build a Date; it is a test double, not business logic.
    // eslint-disable-next-line no-restricted-syntax
    return new Date(this.current);
  }

  advance(ms: number): void {
    this.current += ms;
  }
}
