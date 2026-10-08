import { describe, expect, it } from 'vitest';
import {
  ChannelDelivery,
  ChannelResolver,
  TrackSelectionPolicy,
  WakeUpService,
} from '../../../src/application/index.js';
import {
  createTrack,
  createUserId,
  type ResolvedTrack,
  type TrackQuery,
  type TrackResolver,
  type UserPreferences,
  type WeatherType,
} from '../../../src/domain/index.js';
import { FakeNotificationChannel } from '../../fakes/FakeNotificationChannel.js';
import { FakeUserPreferencesProvider } from '../../fakes/FakeUserPreferencesProvider.js';
import { RecordingLogger } from '../../fakes/RecordingLogger.js';

const alice = createUserId('alice');
const preferences: UserPreferences = {
  trackByWeather: new Map<WeatherType, TrackQuery>([
    ['SUNNY', { title: 'Sun' }],
    ['RAIN', { title: 'Rain' }],
    ['SNOW', { title: 'Snow' }],
    ['CLOUDY', { title: 'Cloud' }],
  ]),
  fallbackTrack: { title: 'Fallback' },
  preferredChannel: 'SMS',
};

class StubResolver implements TrackResolver {
  readonly queries: TrackQuery[] = [];
  constructor(private readonly skipped = 0) {}

  resolve(query: TrackQuery): Promise<ResolvedTrack> {
    this.queries.push(query);
    return Promise.resolve({
      track: createTrack(query.title, 'Artist'),
      providerName: 'stub',
      skippedProviders: this.skipped,
      isLocalFallback: false,
    });
  }
}

function build(options: { prefs?: UserPreferences; failing?: string[]; skipped?: number } = {}) {
  const logger = new RecordingLogger();
  const channels = (['EMAIL', 'SMS', 'PUSH'] as const).map(
    (kind) => new FakeNotificationChannel(kind, options.failing?.includes(kind) ?? false),
  );
  const resolver = new StubResolver(options.skipped);
  const service = new WakeUpService(
    new FakeUserPreferencesProvider(new Map([['alice', options.prefs ?? preferences]])),
    new TrackSelectionPolicy(),
    resolver,
    new ChannelDelivery(
      new ChannelResolver(channels, ['EMAIL', 'SMS', 'PUSH'], logger),
      logger,
      1000,
    ),
    logger,
  );
  return { service, logger, channels, resolver };
}

describe('WakeUpService.trigger', () => {
  it.each([
    ['SUNNY', 'Sun'],
    ['RAIN', 'Rain'],
    ['SNOW', 'Snow'],
    ['CLOUDY', 'Cloud'],
  ] as const)(
    'weather %s -> DELIVERED with the weather track, non degraded',
    async (weather, title) => {
      const { service } = build();

      const result = await service.trigger(alice, 'MONDAY', weather);

      expect(result).toMatchObject({
        status: 'DELIVERED',
        degraded: false,
        track: { title },
        trackSource: 'WEATHER',
        providerName: 'stub',
        channel: 'SMS',
        attempts: [{ channel: 'SMS', succeeded: true }],
      });
    },
  );

  it('weather not covered -> USER_FALLBACK and not degraded (RG-11)', async () => {
    const { service } = build({ prefs: { ...preferences, trackByWeather: new Map() } });

    const result = await service.trigger(alice, 'MONDAY', 'SNOW');

    expect(result).toMatchObject({ trackSource: 'USER_FALLBACK', degraded: false });
  });

  it('day -> logged at start and never changes the track', async () => {
    const { service, logger } = build();

    const monday = await service.trigger(alice, 'MONDAY', 'SUNNY');
    const sunday = await service.trigger(alice, 'SUNDAY', 'SUNNY');

    expect(logger.calls[0]).toMatchObject({
      event: 'wakeup.started',
      fields: { userId: 'alice', day: 'MONDAY', weather: 'SUNNY' },
    });
    expect(monday).toMatchObject({ track: sunday.status === 'DELIVERED' ? sunday.track : null });
  });

  it('track found by a later provider -> degraded', async () => {
    const { service } = build({ skipped: 1 });

    expect(await service.trigger(alice, 'MONDAY', 'SUNNY')).toMatchObject({ degraded: true });
  });

  it('preferred channel down -> next channel delivers, degraded, switch logged', async () => {
    const { service, logger } = build({ failing: ['SMS'] });

    const result = await service.trigger(alice, 'MONDAY', 'SUNNY');

    expect(result).toMatchObject({ status: 'DELIVERED', degraded: true, channel: 'EMAIL' });
    expect(logger.events('warn')).toContain('wakeup.channel.failed');
  });

  it('every channel down -> explicit FAILED result logged as error', async () => {
    const { service, logger } = build({ failing: ['EMAIL', 'SMS', 'PUSH'] });

    const result = await service.trigger(alice, 'MONDAY', 'SUNNY');

    expect(result).toMatchObject({
      status: 'FAILED',
      reason: 'ALL_CHANNELS_FAILED',
      degraded: true,
    });
    expect(result.attempts).toHaveLength(3);
    expect(logger.events('error')).toEqual(['wakeup.failed']);
  });

  it('channel rejecting with a non-Error value -> still a recorded failed attempt', async () => {
    const { service, channels } = build();
    // Why: simulates a misbehaving adapter that rejects with a non-Error value.
    // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
    Object.assign(channels[1] as FakeNotificationChannel, { send: () => Promise.reject('x') });

    const result = await service.trigger(alice, 'MONDAY', 'SUNNY');

    expect(result.attempts[0]).toEqual({
      channel: 'SMS',
      succeeded: false,
      cause: 'unknown-error',
    });
  });
});
