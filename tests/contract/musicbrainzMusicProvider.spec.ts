import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { Track } from '../../src/domain/index.js';
import { HttpTransportError } from '../../src/infrastructure/http/index.js';
import { MusicBrainzMusicProvider } from '../../src/infrastructure/music/musicbrainz/index.js';
import {
  CircuitBreaker,
  RateLimiter,
  TtlCache,
} from '../../src/infrastructure/resilience/index.js';
import { FakeClock } from '../fakes/FakeClock.js';
import { FakeHttpClient } from '../fakes/FakeHttpClient.js';
import { musicProviderContract } from './musicProvider.contract.js';

const fixture = JSON.parse(
  readFileSync(resolve(import.meta.dirname, '../fixtures/musicbrainz-recording.json'), 'utf8'),
) as unknown;
const ok = { status: 200, body: fixture };
const config = {
  baseUrl: 'https://musicbrainz.test/ws/2/recording',
  userAgent: 'TestApp/1.0 ( test@example.org )',
  timeoutMs: 3000,
  ttlMs: 86_400_000,
  maxRequests: 1,
  windowMs: 1000,
};
const query = { title: 'Here Comes the Sun' };

function build(
  replies: ConstructorParameters<typeof FakeHttpClient>[0],
  overrides: Partial<typeof config> = {},
) {
  const clock = new FakeClock();
  const http = new FakeHttpClient(replies);
  const settings = { ...config, ...overrides };
  const provider = new MusicBrainzMusicProvider(
    http,
    settings,
    new TtlCache<Track | null>(clock, settings.ttlMs),
    new RateLimiter(clock, settings.maxRequests, settings.windowMs),
    new CircuitBreaker(clock, 3, 30_000),
  );
  return { provider, http, clock };
}

musicProviderContract('MusicBrainzMusicProvider', () => build([ok]).provider, query, [
  () => build([{ status: 200, body: { recordings: [] } }]).provider,
  () => build([{ status: 429, body: null }]).provider,
  () => build([{ status: 503, body: null }]).provider,
  () => build([new HttpTransportError('timeout')]).provider,
  () => build([{ status: 200, body: null }]).provider,
  () => build([{ status: 200, body: { recordings: {} } }]).provider,
  () => build([ok], { maxRequests: 0 }).provider,
]);

describe('MusicBrainzMusicProvider', () => {
  it('reference answer -> title and artist from artist-credit, which does not leak', async () => {
    const track = await build([ok]).provider.find(query);

    expect(track).toEqual({ title: 'Here Comes the Sun', artist: 'The Beatles' });
    expect(JSON.stringify(track)).not.toContain('artist-credit');
  });

  it('several credited artists -> names joined', async () => {
    const { provider } = build([
      {
        status: 200,
        body: {
          recordings: [
            {
              title: 'Under Pressure',
              'artist-credit': [{ name: 'Queen' }, { name: 'David Bowie' }],
            },
          ],
        },
      },
    ]);

    expect((await provider.find({ title: 'Under Pressure' }))?.artist).toBe('Queen, David Bowie');
  });

  it('every request -> non-empty User-Agent taken from the configuration', async () => {
    const { provider, http } = build([ok]);

    await provider.find(query);

    expect(http.requests[0]?.options.headers?.['User-Agent']).toBe(config.userAgent);
    expect(http.requests[0]?.options.headers?.['User-Agent']).not.toBe('');
    expect(http.requests[0]?.url).toBe(
      'https://musicbrainz.test/ws/2/recording?query=here+comes+the+sun&fmt=json',
    );
  });

  it('second identical call -> cache, zero extra request', async () => {
    const { provider, http } = build([ok]);

    await provider.find(query);
    await provider.find({ title: 'HERE comes the sun' });

    expect(http.requests).toHaveLength(1);
  });

  it('two distinct calls within a second -> second refused without request, allowed after 1 s', async () => {
    const { provider, http, clock } = build([ok]);

    await provider.find({ title: 'one' });
    await expect(provider.find({ title: 'two' })).rejects.toThrow(/pacing/);
    clock.advance(1000);
    await provider.find({ title: 'two' });

    expect(http.requests).toHaveLength(2);
  });

  it('only credit-less recordings -> null', async () => {
    const { provider } = build([
      { status: 200, body: { recordings: [{ title: 'x' }, { title: 'y', 'artist-credit': [] }] } },
    ]);

    expect(await provider.find(query)).toBeNull();
  });

  it('3 consecutive failures -> circuit opens without further request', async () => {
    const { provider, http, clock } = build([{ status: 503, body: null }], { maxRequests: 10 });
    for (const title of ['a', 'b', 'c']) {
      await expect(provider.find({ title })).rejects.toThrow();
      clock.advance(1000);
    }

    await expect(provider.find({ title: 'd' })).rejects.toThrow(/circuit/);
    expect(http.requests).toHaveLength(3);
  });

  it('caller cancellation -> propagated untouched', async () => {
    const controller = new AbortController();
    controller.abort();
    const abort = new DOMException('aborted', 'AbortError');

    await expect(build([abort]).provider.find(query, controller.signal)).rejects.toBe(abort);
  });
});
