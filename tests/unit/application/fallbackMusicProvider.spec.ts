import { describe, expect, it } from 'vitest';
import { FallbackMusicProvider } from '../../../src/application/index.js';
import { createTrack, MusicProviderUnavailableError } from '../../../src/domain/index.js';
import { FakeMusicProvider } from '../../fakes/FakeMusicProvider.js';
import { RecordingLogger } from '../../fakes/RecordingLogger.js';

const query = { title: 'Here Comes the Sun' };
const remote = createTrack('Here Comes the Sun', 'The Beatles');
const local = createTrack('Three Little Birds', 'Bob Marley');

describe('FallbackMusicProvider', () => {
  it('local only -> resolved without fallback flag, nothing skipped', async () => {
    const chain = new FallbackMusicProvider(
      [new FakeMusicProvider('local', local)],
      new RecordingLogger(),
    );

    expect(await chain.resolve(query)).toEqual({
      track: local,
      providerName: 'local',
      skippedProviders: 0,
      isLocalFallback: false,
    });
  });

  it('first provider answers -> later providers untouched', async () => {
    const second = new FakeMusicProvider('local', local);
    const chain = new FallbackMusicProvider(
      [new FakeMusicProvider('itunes', remote), second],
      new RecordingLogger(),
    );

    const resolved = await chain.resolve(query);

    expect(resolved.providerName).toBe('itunes');
    expect(second.queries).toHaveLength(0);
  });

  it('failing provider in front of local -> switch logged as warn, local answers as fallback', async () => {
    const logger = new RecordingLogger();
    const chain = new FallbackMusicProvider(
      [
        new FakeMusicProvider('itunes', new MusicProviderUnavailableError('down')),
        new FakeMusicProvider('local', local),
      ],
      logger,
    );

    const resolved = await chain.resolve(query);

    expect(resolved).toMatchObject({
      providerName: 'local',
      skippedProviders: 1,
      isLocalFallback: true,
    });
    expect(logger.events('warn')).toEqual(['music.provider.skipped']);
    expect(logger.calls[0]?.fields).toMatchObject({ provider: 'itunes' });
  });

  it('empty result then success on second -> skipped counted, not a local fallback', async () => {
    const chain = new FallbackMusicProvider(
      [
        new FakeMusicProvider('itunes', null),
        new FakeMusicProvider('musicbrainz', remote),
        new FakeMusicProvider('local', local),
      ],
      new RecordingLogger(),
    );

    expect(await chain.resolve(query)).toMatchObject({
      providerName: 'musicbrainz',
      skippedProviders: 1,
      isLocalFallback: false,
    });
  });

  it('non-error rejection -> still treated as unavailable', async () => {
    const chain = new FallbackMusicProvider(
      [
        {
          name: 'odd',
          // Why: simulates a misbehaving adapter that rejects with a non-Error value.
          // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
          find: () => Promise.reject('plain string'),
        },
        new FakeMusicProvider('local', local),
      ],
      new RecordingLogger(),
    );

    expect((await chain.resolve(query)).providerName).toBe('local');
  });

  it('every provider failing -> explicit MusicProviderUnavailableError, never a silent null', async () => {
    const chain = new FallbackMusicProvider(
      [new FakeMusicProvider('itunes', null)],
      new RecordingLogger(),
    );

    await expect(chain.resolve(query)).rejects.toBeInstanceOf(MusicProviderUnavailableError);
  });

  it('aborted signal -> cancellation propagated, chain stopped', async () => {
    const controller = new AbortController();
    controller.abort(new Error('cancelled'));
    const chain = new FallbackMusicProvider(
      [new FakeMusicProvider('local', local)],
      new RecordingLogger(),
    );

    await expect(chain.resolve(query, controller.signal)).rejects.toThrow('cancelled');
  });

  it('find -> the resolved track only', async () => {
    const chain = new FallbackMusicProvider(
      [new FakeMusicProvider('local', local)],
      new RecordingLogger(),
    );

    expect(await chain.find(query)).toBe(local);
  });
});
