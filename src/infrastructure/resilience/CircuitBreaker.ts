import type { Clock } from '../../domain/index.js';

type State = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

/** Opens after N consecutive failures, lets one trial through after a delay, closes on success. */
export class CircuitBreaker {
  private state: State = 'CLOSED';
  private failures = 0;
  private openedAt = 0;

  constructor(
    private readonly clock: Clock,
    private readonly failureThreshold: number,
    private readonly halfOpenAfterMs: number,
  ) {}

  canCall(): boolean {
    if (this.state === 'CLOSED') {
      return true;
    }
    if (
      this.state === 'OPEN' &&
      this.clock.now().getTime() - this.openedAt >= this.halfOpenAfterMs
    ) {
      this.state = 'HALF_OPEN';
      return true;
    }
    // Open, or a trial call is already in flight.
    return false;
  }

  recordSuccess(): void {
    this.state = 'CLOSED';
    this.failures = 0;
  }

  recordFailure(): void {
    this.failures += 1;
    if (this.state === 'HALF_OPEN' || this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
      this.openedAt = this.clock.now().getTime();
    }
  }
}
