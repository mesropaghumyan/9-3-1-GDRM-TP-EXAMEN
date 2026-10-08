import type { Clock } from '../../domain/index.js';

/** Sliding-window limiter: at most `maxRequests` acquisitions in any `windowMs`. */
export class RateLimiter {
  private timestamps: number[] = [];

  constructor(
    private readonly clock: Clock,
    private readonly maxRequests: number,
    private readonly windowMs: number,
  ) {}

  tryAcquire(): boolean {
    const now = this.clock.now().getTime();
    this.timestamps = this.timestamps.filter((at) => now - at < this.windowMs);
    if (this.timestamps.length >= this.maxRequests) {
      return false;
    }
    this.timestamps.push(now);
    return true;
  }
}
