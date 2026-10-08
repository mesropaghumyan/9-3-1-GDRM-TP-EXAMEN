import { describe, expect, it } from 'vitest';
import {
  ChannelDelivery,
  ChannelResolver,
  FallbackMusicProvider,
  PreferencesResolver,
  TrackSelectionPolicy,
  WakeUpService,
} from '../../../src/application/index.js';
import {
  createTrack,
  createUserId,
  MusicProviderUnavailableError,
  PreferencesUnavailableError,
  UserNotFoundError,
  type ChannelKind,
  type UserPreferences,
  type UserPreferencesProvider,
} from '../../../src/domain/index.js';
import { FakeMusicProvider } from '../../fakes/FakeMusicProvider.js';
import { FakeNotificationChannel } from '../../fakes/FakeNotificationChannel.js';
import { RecordingLogger } from '../../fakes/RecordingLogger.js';

const preferences: UserPreferences = {
  trackByWeather: new Map([['SUNNY', { title: 'Sun' }]]),
  fallbackTrack: { title: 'Fallback' },
  preferredChannel: 'SMS',
};
const KINDS: readonly ChannelKind[] = ['EMAIL', 'SMS', 'PUSH'];
const PREFERENCES_STATES = ['ok', 'unknown-user', 'unavailable'] as const;
const FAILURES = ['up', 'down'] as const;

function* scenarios() {
  for (const prefs of PREFERENCES_STATES)
    for (const itunes of FAILURES)
      for (const musicbrainz of FAILURES)
        for (const email of FAILURES)
          for (const sms of FAILURES)
            for (const push of FAILURES)
              for (const cancelled of [false, true])
                yield {
                  prefs,
                  itunes,
                  musicbrainz,
                  channels: { EMAIL: email, SMS: sms, PUSH: push },
                  cancelled,
                };
}

function providerFor(state: (typeof PREFERENCES_STATES)[number]): UserPreferencesProvider {
  return {
    get: () => {
      if (state === 'unknown-user') return Promise.reject(new UserNotFoundError('ghost'));
      if (state === 'unavailable') return Promise.reject(new PreferencesUnavailableError('down'));
      return Promise.resolve(preferences);
    },
  };
}

describe('Anti-silence invariant', () => {
  const all = [...scenarios()];

  it('covers every combination of failures', () => {
    expect(all).toHaveLength(3 * 2 * 2 * 2 * 2 * 2 * 2);
  });

  it.each(all.map((scenario) => [JSON.stringify(scenario), scenario] as const))(
    '%s -> DELIVERED, or FAILED with an explicit reason and a warn/error log',
    async (_name, scenario) => {
      const logger = new RecordingLogger();
      const down = new MusicProviderUnavailableError('down');
      const chain = new FallbackMusicProvider(
        [
          new FakeMusicProvider('itunes', scenario.itunes === 'up' ? createTrack('A', 'B') : down),
          new FakeMusicProvider(
            'musicbrainz',
            scenario.musicbrainz === 'up' ? createTrack('C', 'D') : down,
          ),
          new FakeMusicProvider('local', createTrack('L', 'M')),
        ],
        logger,
      );
      const channels = KINDS.map(
        (kind) => new FakeNotificationChannel(kind, scenario.channels[kind] === 'down'),
      );
      const service = new WakeUpService(
        new PreferencesResolver(providerFor(scenario.prefs), preferences, logger),
        new TrackSelectionPolicy(),
        chain,
        new ChannelDelivery(new ChannelResolver(channels, KINDS, logger), logger, 1000),
        logger,
      );
      const controller = new AbortController();
      if (scenario.cancelled) controller.abort();

      const result = await service.trigger(
        createUserId('alice'),
        'MONDAY',
        'SUNNY',
        controller.signal,
      );

      if (result.status === 'DELIVERED') {
        expect(result.attempts.at(-1)?.succeeded).toBe(true);
        expect(scenario.cancelled).toBe(false);
        expect(scenario.prefs).not.toBe('unknown-user');
      } else {
        expect(['USER_NOT_FOUND', 'ALL_CHANNELS_FAILED', 'CANCELLED']).toContain(result.reason);
        expect(logger.events('error').length + logger.events('warn').length).toBeGreaterThan(0);
        if (result.reason === 'ALL_CHANNELS_FAILED')
          expect(logger.events('error')).toContain('wakeup.failed');
      }
    },
  );

  it('chain exhausted (misconfiguration) -> FAILED NO_TRACK_AVAILABLE logged in error, no exception', async () => {
    const logger = new RecordingLogger();
    const service = new WakeUpService(
      new PreferencesResolver({ get: () => Promise.resolve(preferences) }, preferences, logger),
      new TrackSelectionPolicy(),
      new FallbackMusicProvider([new FakeMusicProvider('itunes', null)], logger),
      new ChannelDelivery(new ChannelResolver([], KINDS, logger), logger, 1000),
      logger,
    );

    const result = await service.trigger(createUserId('alice'), 'MONDAY', 'SUNNY');

    expect(result).toMatchObject({ status: 'FAILED', reason: 'NO_TRACK_AVAILABLE' });
    expect(logger.events('error')).toContain('wakeup.failed');
  });

  it('unexpected programming error -> propagated loudly, never swallowed', async () => {
    const logger = new RecordingLogger();
    const service = new WakeUpService(
      new PreferencesResolver({ get: () => Promise.resolve(preferences) }, preferences, logger),
      new TrackSelectionPolicy(),
      { resolve: () => Promise.reject(new TypeError('bug')) },
      new ChannelDelivery(new ChannelResolver([], KINDS, logger), logger, 1000),
      logger,
    );

    await expect(service.trigger(createUserId('alice'), 'MONDAY', 'SUNNY')).rejects.toThrow('bug');
  });
});
