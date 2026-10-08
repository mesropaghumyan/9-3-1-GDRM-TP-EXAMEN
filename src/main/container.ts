import { container, type DependencyContainer } from 'tsyringe';
import {
  ChannelResolver,
  FallbackMusicProvider,
  TRACK_SELECTION_POLICY,
  TrackSelectionPolicy,
  WAKE_UP_USE_CASE,
  WakeUpService,
} from '../application/index.js';
import {
  CLOCK,
  LOG_WRITER,
  LOGGER,
  MUSIC_PROVIDER,
  NOTIFICATION_CHANNEL,
  NOTIFICATION_CHANNEL_RESOLVER,
  NOTIFICATION_SINK,
  TRACK_RESOLVER,
  USER_PREFERENCES_PROVIDER,
  type Logger,
  type MusicProvider,
  type NotificationChannel,
} from '../domain/index.js';
import { SystemClock } from '../infrastructure/clock/index.js';
import { ConfigError, type AppConfig } from '../infrastructure/config/index.js';
import {
  JsonLogger,
  LoggerNotificationSink,
  StdoutLogWriter,
} from '../infrastructure/logging/index.js';
import { LocalFallbackMusicProvider } from '../infrastructure/music/local/index.js';
import {
  EmailChannelAdapter,
  FakeEmailClient,
} from '../infrastructure/notifications/email/index.js';
import { FakePushService, PushChannelAdapter } from '../infrastructure/notifications/push/index.js';
import { FakeSmsGateway, SmsChannelAdapter } from '../infrastructure/notifications/sms/index.js';
import {
  DEFAULT_USER_PREFERENCES,
  InMemoryUserPreferencesProvider,
} from '../infrastructure/preferences/index.js';
import {
  EMAIL_CLIENT,
  LOCAL_TRACKS,
  PUSH_SERVICE,
  SMS_GATEWAY,
  USER_PREFERENCES_DATA,
} from '../infrastructure/tokens.js';

/**
 * The only file that wires the object graph (and the only one allowed to `new` implementations).
 * Lifetimes: stateless shared services are singletons; use-case level classes are transient.
 * A singleton never depends on a transient one.
 */
export function buildContainer(config: AppConfig): DependencyContainer {
  const c = container.createChildContainer();

  // Singletons: clock, log chain, sink, preferences, local provider, mocked clients.
  c.registerSingleton(CLOCK, SystemClock);
  c.registerSingleton(LOG_WRITER, StdoutLogWriter);
  c.registerSingleton(LOGGER, JsonLogger);
  c.registerSingleton(NOTIFICATION_SINK, LoggerNotificationSink);
  c.register(USER_PREFERENCES_DATA, { useValue: DEFAULT_USER_PREFERENCES });
  c.registerSingleton(USER_PREFERENCES_PROVIDER, InMemoryUserPreferencesProvider);
  c.register(LOCAL_TRACKS, { useValue: config.music.localTracks });
  c.registerSingleton(LocalFallbackMusicProvider);
  c.register(MUSIC_PROVIDER, { useToken: LocalFallbackMusicProvider });
  c.registerSingleton(EMAIL_CLIENT, FakeEmailClient);
  c.registerSingleton(SMS_GATEWAY, FakeSmsGateway);
  c.registerSingleton(PUSH_SERVICE, FakePushService);

  // Transient: channel adapters and everything built per use.
  c.register(NOTIFICATION_CHANNEL, { useClass: EmailChannelAdapter });
  c.register(NOTIFICATION_CHANNEL, { useClass: SmsChannelAdapter });
  c.register(NOTIFICATION_CHANNEL, { useClass: PushChannelAdapter });
  c.register(NOTIFICATION_CHANNEL_RESOLVER, {
    useFactory: (d) =>
      new ChannelResolver(
        d.resolveAll<NotificationChannel>(NOTIFICATION_CHANNEL),
        config.notifications.channelFallbackOrder,
        d.resolve<Logger>(LOGGER),
      ),
  });
  c.register(TRACK_RESOLVER, {
    useFactory: (d) => {
      const available = d.resolveAll<MusicProvider>(MUSIC_PROVIDER);
      const chain = config.music.providerOrder.map((name) => {
        const provider = available.find((candidate) => candidate.name === name);
        if (provider === undefined) {
          throw new ConfigError(`no adapter registered for music provider "${name}"`);
        }
        return provider;
      });
      return new FallbackMusicProvider(chain, d.resolve<Logger>(LOGGER));
    },
  });
  c.register(TRACK_SELECTION_POLICY, { useClass: TrackSelectionPolicy });
  c.register(WAKE_UP_USE_CASE, { useClass: WakeUpService });

  return c;
}
