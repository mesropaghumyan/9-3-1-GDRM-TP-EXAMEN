import type { Clock } from '../../domain/index.js';

/** Time-to-live cache whose clock is injected, so expiry is testable. */
export class TtlCache<V> {
  private readonly entries = new Map<string, { value: V; expiresAt: number }>();

  constructor(
    private readonly clock: Clock,
    private readonly ttlMs: number,
  ) {}

  get(key: string): V | undefined {
    const entry = this.entries.get(key);
    if (entry === undefined) {
      return undefined;
    }
    if (this.clock.now().getTime() >= entry.expiresAt) {
      this.entries.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: V): void {
    this.entries.set(key, { value, expiresAt: this.clock.now().getTime() + this.ttlMs });
  }
}
