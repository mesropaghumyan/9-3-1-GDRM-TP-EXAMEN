import { describe, expect, it } from 'vitest';
import {
  CircuitBreaker,
  RateLimiter,
  TtlCache,
} from '../../../src/infrastructure/resilience/index.js';
import { FakeClock } from '../../fakes/FakeClock.js';

describe('TtlCache', () => {
  it('read before the TTL -> served, after the TTL -> expired', () => {
    const clock = new FakeClock();
    const cache = new TtlCache<string | null>(clock, 1000);

    cache.set('k', 'v');
    clock.advance(999);
    expect(cache.get('k')).toBe('v');
    clock.advance(1);
    expect(cache.get('k')).toBeUndefined();
  });

  it('cached null -> distinguishable from a miss', () => {
    const cache = new TtlCache<string | null>(new FakeClock(), 1000);

    cache.set('k', null);

    expect(cache.get('k')).toBeNull();
    expect(cache.get('other')).toBeUndefined();
  });
});

describe('RateLimiter', () => {
  it('quota reached -> refused, then window frees with time', () => {
    const clock = new FakeClock();
    const limiter = new RateLimiter(clock, 2, 1000);

    expect([limiter.tryAcquire(), limiter.tryAcquire(), limiter.tryAcquire()]).toEqual([
      true,
      true,
      false,
    ]);
    clock.advance(1000);
    expect(limiter.tryAcquire()).toBe(true);
  });
});

describe('CircuitBreaker', () => {
  const make = () => {
    const clock = new FakeClock();
    return { clock, breaker: new CircuitBreaker(clock, 3, 30_000) };
  };

  it('below the threshold -> stays closed, a success resets the count', () => {
    const { breaker } = make();

    breaker.recordFailure();
    breaker.recordFailure();
    breaker.recordSuccess();
    breaker.recordFailure();
    breaker.recordFailure();

    expect(breaker.canCall()).toBe(true);
  });

  it('N consecutive failures -> open, half-open after the delay, closed on first success', () => {
    const { clock, breaker } = make();
    for (let i = 0; i < 3; i += 1) breaker.recordFailure();

    expect(breaker.canCall()).toBe(false);
    clock.advance(30_000);
    expect(breaker.canCall()).toBe(true);
    expect(breaker.canCall()).toBe(false); // only one trial call in flight
    breaker.recordSuccess();
    expect(breaker.canCall()).toBe(true);
  });

  it('failure during the trial -> open again for a full delay', () => {
    const { clock, breaker } = make();
    for (let i = 0; i < 3; i += 1) breaker.recordFailure();
    clock.advance(30_000);
    breaker.canCall();

    breaker.recordFailure();

    expect(breaker.canCall()).toBe(false);
    clock.advance(29_999);
    expect(breaker.canCall()).toBe(false);
    clock.advance(1);
    expect(breaker.canCall()).toBe(true);
  });
});
