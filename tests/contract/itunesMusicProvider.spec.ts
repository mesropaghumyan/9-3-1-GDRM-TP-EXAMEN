import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { Track } from '../../src/domain/index.js';
import { HttpTransportError } from '../../src/infrastructure/http/index.js';
import { ITunesMusicProvider } from '../../src/infrastructure/music/itunes/index.js';
import {
  CircuitBreaker,
  RateLimiter,
  TtlCache,
} from '../../src/infrastructure/resilience/index.js';
import { FakeClock } from '../fakes/FakeClock.js';
import { FakeHttpClient } from '../fakes/FakeHttpClient.js';
import { musicProviderContract } from './musicProvider.contract.js';

const fixture = JSON.parse(
  readFileSync(resolve(import.meta.dirname, '../fixtures/itunes-search.json'), 'utf8'),
) as unknown;
const ok = { status: 200, body: fixture };
const config = {
  baseUrl: 'https://itunes.test/search',
  timeoutMs: 3000,
  ttlMs: 3_600_000,
  maxRequests: 20,
  windowMs: 60_000,
};
const query = { title: 'Here Comes the Sun' };

function build(
  replies: ConstructorParameters<typeof FakeHttpClient>[0],
  overrides: Partial<typeof config> = {},
) {
  const clock = new FakeClock();
  const http = new FakeHttpClient(replies);
  const settings = { ...config, ...overrides };
  const provider = new ITunesMusicProvider(
    http,
    settings,
    new TtlCache<Track | null>(clock, settings.ttlMs),
    new RateLimiter(clock, settings.maxRequests, settings.windowMs),
    new CircuitBreaker(clock, 3, 30_000),
  );
  return { provider, http, clock };
}

musicProviderContract('ITunesMusicProvider', () => build([ok]).provider, query, [
  () => build([{ status: 200, body: { resultCount: 0, results: [] } }]).provider,
  () => build([{ status: 429, body: null }]).provider,
  () => build([{ status: 503, body: null }]).provider,
  () => build([new HttpTransportError('timeout')]).provider,
  () => build([{ status: 200, body: null }]).provider,
  () => build([{ status: 200, body: { results: 'nope' } }]).provider,
  () => build([ok], { maxRequests: 0 }).provider,
]);

describe('ITunesMusicProvider', () => {
  it('reference answer -> title and artist only, trackViewUrl ignored', async () => {
    const track = await build([ok]).provider.find(query);

    expect(track).toEqual({ title: 'Here Comes the Sun', artist: 'The Beatles' });
    expect(JSON.stringify(track)).not.toContain('apple.com');
  });

  it('second identical call -> served by the cache, zero extra request', async () => {
    const { provider, http } = build([ok]);

    await provider.find(query);
    await provider.find({ title: '  here   COMES the sun ' });

    expect(http.requests).toHaveLength(1);
  });

  it('cache entry past its TTL -> requested again', async () => {
    const { provider, http, clock } = build([ok]);

    await provider.find(query);
    clock.advance(config.ttlMs);
    await provider.find(query);

    expect(http.requests).toHaveLength(2);
  });

  it('term -> normalized and URL-encoded from the configured base URL', async () => {
    const { provider, http } = build([ok]);

    await provider.find({ title: 'Café & Co', artist: 'Étoile' });

    expect(http.requests[0]?.url).toBe(
      'https://itunes.test/search?term=cafe+%26+co+etoile&media=music&limit=5',
    );
    expect(http.requests[0]?.options.timeoutMs).toBe(3000);
  });

  it('empty result -> null, and cached', async () => {
    const { provider, http } = build([{ status: 200, body: { results: [] } }]);

    expect(await provider.find(query)).toBeNull();
    expect(await provider.find(query)).toBeNull();
    expect(http.requests).toHaveLength(1);
  });

  it('results without usable names -> null', async () => {
    const { provider } = build([
      { status: 200, body: { results: [{ trackName: '', artistName: 'x' }, 42] } },
    ]);

    expect(await provider.find(query)).toBeNull();
  });

  it('quota reached -> unavailable without any network call', async () => {
    const { provider, http } = build([ok], { maxRequests: 1 });

    await provider.find({ title: 'one' });
    await expect(provider.find({ title: 'two' })).rejects.toThrow(/quota/);
    expect(http.requests).toHaveLength(1);
  });

  it('3 consecutive failures -> circuit opens, next call makes no request', async () => {
    const { provider, http } = build([{ status: 503, body: null }]);
    for (const title of ['a', 'b', 'c']) {
      await expect(provider.find({ title })).rejects.toThrow();
    }

    await expect(provider.find({ title: 'd' })).rejects.toThrow(/circuit/);
    expect(http.requests).toHaveLength(3);
  });

  it('caller cancellation -> propagated untouched and not counted as a failure', async () => {
    const controller = new AbortController();
    controller.abort();
    const abort = new DOMException('aborted', 'AbortError');
    const { provider } = build([abort]);

    await expect(provider.find(query, controller.signal)).rejects.toBe(abort);
  });
});
