import { describe, expect, it } from 'vitest';
import {
  ChannelDelivery,
  ChannelResolver,
  FallbackMusicProvider,
  PreferencesResolver,
  TrackSelectionPolicy,
  WakeUpService,
} from '../../../src/application/index.js';
import { createTrack, createUserId, type UserPreferences } from '../../../src/domain/index.js';
import { FakeMusicProvider } from '../../fakes/FakeMusicProvider.js';
import {
  FakeNotificationChannel,
  HangingNotificationChannel,
} from '../../fakes/FakeNotificationChannel.js';
import { FakeUserPreferencesProvider } from '../../fakes/FakeUserPreferencesProvider.js';
import { RecordingLogger } from '../../fakes/RecordingLogger.js';

const alice = createUserId('alice');
const preferences: UserPreferences = {
  trackByWeather: new Map([['SUNNY', { title: 'Sun' }]]),
  fallbackTrack: { title: 'Fallback' },
  preferredChannel: 'EMAIL',
};

function build(
  email: FakeNotificationChannel | HangingNotificationChannel = new FakeNotificationChannel(
    'EMAIL',
  ),
) {
  const logger = new RecordingLogger();
  const prefs = new FakeUserPreferencesProvider(new Map([['alice', preferences]]));
  const music = new FakeMusicProvider('local', createTrack('Sun', 'Artist'));
  const service = new WakeUpService(
    new PreferencesResolver(prefs, preferences, logger),
    new TrackSelectionPolicy(),
    new FallbackMusicProvider([music], logger),
    new ChannelDelivery(new ChannelResolver([email], ['EMAIL'], logger), logger, 5000),
    logger,
  );
  return { service, logger, prefs, music, email };
}

describe('WakeUpService cancellation', () => {
  it('signal already aborted -> FAILED CANCELLED logged in warn, nothing sent', async () => {
    const controller = new AbortController();
    controller.abort();
    const { service, logger, email } = build();

    const result = await service.trigger(alice, 'MONDAY', 'SUNNY', controller.signal);

    expect(result).toMatchObject({ status: 'FAILED', reason: 'CANCELLED', degraded: true });
    expect(logger.events('warn')).toContain('wakeup.cancelled');
    expect((email as FakeNotificationChannel).sent).toHaveLength(0);
  });

  it('signal aborted while a channel hangs -> CANCELLED keeps the chosen track', async () => {
    const controller = new AbortController();
    const { service } = build(new HangingNotificationChannel('EMAIL'));

    const pending = service.trigger(alice, 'MONDAY', 'SUNNY', controller.signal);
    await new Promise((resolve) => setTimeout(resolve, 10));
    controller.abort();
    const result = await pending;

    expect(result).toMatchObject({
      status: 'FAILED',
      reason: 'CANCELLED',
      track: { title: 'Sun' },
      providerName: 'local',
    });
  });

  it('signal -> propagated to preferences, music provider and channel', async () => {
    const controller = new AbortController();
    const { service, prefs, music, email } = build();

    await service.trigger(alice, 'MONDAY', 'SUNNY', controller.signal);
    controller.abort();

    expect(prefs.signals[0]).toBe(controller.signal);
    expect(music.signals[0]).toBe(controller.signal);
    // The channel gets a derived signal (timeout + caller), which follows the caller's abort.
    expect((email as FakeNotificationChannel).signals[0]?.aborted).toBe(true);
  });
});
