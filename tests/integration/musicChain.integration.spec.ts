import { describe, expect, it } from 'vitest';
import { WAKE_UP_USE_CASE, type WakeUpUseCase } from '../../src/application/index.js';
import {
  CLOCK,
  createUserId,
  HTTP_CLIENT,
  LOG_WRITER,
  type HttpResponse,
  type WakeUpResult,
} from '../../src/domain/index.js';
import { loadConfig } from '../../src/infrastructure/config/index.js';
import { buildContainer } from '../../src/main/container.js';
import { FakeClock } from '../fakes/FakeClock.js';
import { FakeHttpClient } from '../fakes/FakeHttpClient.js';
import { InMemoryLogWriter } from '../fakes/InMemoryLogWriter.js';

const itunesOk: HttpResponse = {
  status: 200,
  body: {
    results: [
      {
        trackName: 'Here Comes the Sun',
        artistName: 'The Beatles',
        trackViewUrl: 'https://apple.test/x',
      },
    ],
  },
};
const brainzOk: HttpResponse = {
  status: 200,
  body: {
    recordings: [{ title: 'Here Comes the Sun', 'artist-credit': [{ name: 'The Beatles' }] }],
  },
};
const down: HttpResponse = { status: 503, body: null };

async function run(replies: HttpResponse[], env: Record<string, string> = {}) {
  const container = buildContainer(loadConfig(env));
  const http = new FakeHttpClient(replies);
  const writer = new InMemoryLogWriter();
  // Only the HttpClient (and the passive log/clock outputs) are replaced: everything else is real.
  container.register(HTTP_CLIENT, { useValue: http });
  container.register(LOG_WRITER, { useValue: writer });
  container.register(CLOCK, { useValue: new FakeClock() });
  const result = await container
    .resolve<WakeUpUseCase>(WAKE_UP_USE_CASE)
    .trigger(createUserId('alice'), 'MONDAY', 'SUNNY');
  return { result, http, writer };
}

function deliveredTrack(result: WakeUpResult): object {
  if (result.status !== 'DELIVERED') throw new Error('expected DELIVERED');
  return JSON.parse(JSON.stringify(result.track)) as object;
}

describe('Music provider chain (real container, fake HTTP)', () => {
  it('iTunes answers -> used first, nothing degraded, one request', async () => {
    const { result, http } = await run([itunesOk]);

    expect(result).toMatchObject({ status: 'DELIVERED', providerName: 'itunes', degraded: false });
    expect(http.requests).toHaveLength(1);
    expect(Object.keys(deliveredTrack(result))).toEqual(['title', 'artist']);
  });

  it('iTunes down -> MusicBrainz takes over, degraded, switch logged in warn', async () => {
    const { result, http, writer } = await run([down, brainzOk]);

    expect(result).toMatchObject({
      providerName: 'musicbrainz',
      degraded: true,
      trackSource: 'WEATHER',
    });
    expect(http.requests[1]?.options.headers?.['User-Agent']).toBeTruthy();
    expect(writer.entries().filter((e) => e['event'] === 'music.provider.skipped')).toEqual([
      expect.objectContaining({ level: 'warn', provider: 'itunes' }),
    ]);
    expect(Object.keys(deliveredTrack(result))).toEqual(['title', 'artist']);
  });

  it('iTunes and MusicBrainz down -> local list answers, LOCAL_FALLBACK and degraded', async () => {
    const { result, writer } = await run([down]);

    expect(result).toMatchObject({
      providerName: 'local',
      trackSource: 'LOCAL_FALLBACK',
      degraded: true,
    });
    expect(writer.entries().filter((e) => e['event'] === 'music.provider.skipped')).toHaveLength(2);
    expect(Object.keys(deliveredTrack(result))).toEqual(['title', 'artist']);
  });

  it('order changed in the configuration -> followed without any code change', async () => {
    const { result, http } = await run([brainzOk], {
      MUSIC_PROVIDER_ORDER: 'musicbrainz,itunes,local',
    });

    expect(result).toMatchObject({ providerName: 'musicbrainz', degraded: false });
    expect(http.requests[0]?.url).toContain('musicbrainz');
  });
});
