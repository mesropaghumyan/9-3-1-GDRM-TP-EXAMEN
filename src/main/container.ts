import { container, instanceCachingFactory, type DependencyContainer } from 'tsyringe';
import {
  CHANNEL_DELIVERY,
  ChannelDelivery,
  ChannelResolver,
  FallbackMusicProvider,
  PREFERENCES_RESOLVER,
  PreferencesResolver,
  TRACK_SELECTION_POLICY,
  TrackSelectionPolicy,
  WAKE_UP_USE_CASE,
  WakeUpService,
  type WakeUpUseCase,
} from '../application/index.js';
import {
  CLOCK,
  HTTP_CLIENT,
  LOG_WRITER,
  LOGGER,
  MUSIC_PROVIDER,
  NOTIFICATION_CHANNEL,
  NOTIFICATION_CHANNEL_RESOLVER,
  NOTIFICATION_SINK,
  TRACK_RESOLVER,
  USER_PREFERENCES_PROVIDER,
  type Clock,
  type HttpClient,
  type Logger,
  type MusicProvider,
  type NotificationChannel,
  type NotificationChannelResolver,
  type UserPreferencesProvider,
} from '../domain/index.js';
import {
  WAKE_UP_HANDLER,
  WAKE_UP_HTTP_API,
  WakeUpHandler,
  WakeUpHttpApi,
} from '../presentation/index.js';
import { SystemClock } from '../infrastructure/clock/index.js';
import { ConfigError, type AppConfig } from '../infrastructure/config/index.js';
import {
  JsonLogger,
  LoggerNotificationSink,
  StdoutLogWriter,
} from '../infrastructure/logging/index.js';
import { FetchHttpClient } from '../infrastructure/http/index.js';
import { ITunesMusicProvider } from '../infrastructure/music/itunes/index.js';
import { MusicBrainzMusicProvider } from '../infrastructure/music/musicbrainz/index.js';
import { CircuitBreaker, RateLimiter, TtlCache } from '../infrastructure/resilience/index.js';
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
  BREAKER_CONFIG,
  EMAIL_CLIENT,
  HTTP_CONFIG,
  ITUNES_CONFIG,
  LOCAL_TRACKS,
  MUSICBRAINZ_CONFIG,
  PUSH_SERVICE,
  SMS_GATEWAY,
  USER_PREFERENCES_DATA,
} from '../infrastructure/tokens.js';

/**
 * Declared lifetimes, checked by tests/architecture: a singleton must never depend on a transient.
 * MUSIC_PROVIDER stands for all its registrations (local, iTunes, MusicBrainz are singletons).
 */
export const SINGLETON_TOKENS: readonly unknown[] = [
  CLOCK,
  LOG_WRITER,
  LOGGER,
  NOTIFICATION_SINK,
  HTTP_CLIENT,
  USER_PREFERENCES_PROVIDER,
  EMAIL_CLIENT,
  SMS_GATEWAY,
  PUSH_SERVICE,
  MUSIC_PROVIDER,
  LocalFallbackMusicProvider,
];

export const TRANSIENT_TOKENS: readonly unknown[] = [
  WAKE_UP_USE_CASE,
  TRACK_RESOLVER,
  TRACK_SELECTION_POLICY,
  CHANNEL_DELIVERY,
  PREFERENCES_RESOLVER,
  NOTIFICATION_CHANNEL_RESOLVER,
  NOTIFICATION_CHANNEL,
];

/**
 * The only file that wires the object graph (and the only one allowed to `new` implementations).
 * Lifetimes: stateless shared services are singletons; use-case level classes are transient.
 * A singleton never depends on a transient one.
 */
export function buildContainer(config: AppConfig, openApiDocument = ''): DependencyContainer {
  const c = container.createChildContainer();

  // Singletons: clock, log chain, sink, preferences, local provider, mocked clients.
  c.registerSingleton(CLOCK, SystemClock);
  c.registerSingleton(LOG_WRITER, StdoutLogWriter);
  c.registerSingleton(LOGGER, JsonLogger);
  c.registerSingleton(NOTIFICATION_SINK, LoggerNotificationSink);
  c.register(USER_PREFERENCES_DATA, { useValue: DEFAULT_USER_PREFERENCES });
  c.registerSingleton(USER_PREFERENCES_PROVIDER, InMemoryUserPreferencesProvider);
  c.register(HTTP_CONFIG, { useValue: config.http });
  c.register(BREAKER_CONFIG, { useValue: config.breaker });
  c.register(ITUNES_CONFIG, { useValue: config.music.itunes });
  c.register(MUSICBRAINZ_CONFIG, { useValue: config.music.musicbrainz });
  c.registerSingleton(HTTP_CLIENT, FetchHttpClient);
  c.register(LOCAL_TRACKS, { useValue: config.music.localTracks });
  c.registerSingleton(LocalFallbackMusicProvider);
  // Why: one provider = one cache, one limiter and one breaker, all singletons built together here.
  c.register(MUSIC_PROVIDER, {
    useFactory: instanceCachingFactory((d) => {
      const clock = d.resolve<Clock>(CLOCK);
      const settings = config.music.itunes;
      return new ITunesMusicProvider(
        d.resolve<HttpClient>(HTTP_CLIENT),
        settings,
        new TtlCache(clock, settings.ttlMs),
        new RateLimiter(clock, settings.maxRequests, settings.windowMs),
        new CircuitBreaker(clock, config.breaker.failureThreshold, config.breaker.halfOpenAfterMs),
      );
    }),
  });
  c.register(MUSIC_PROVIDER, {
    useFactory: instanceCachingFactory((d) => {
      const clock = d.resolve<Clock>(CLOCK);
      const settings = config.music.musicbrainz;
      return new MusicBrainzMusicProvider(
        d.resolve<HttpClient>(HTTP_CLIENT),
        settings,
        new TtlCache(clock, settings.ttlMs),
        new RateLimiter(clock, settings.maxRequests, settings.windowMs),
        new CircuitBreaker(clock, config.breaker.failureThreshold, config.breaker.halfOpenAfterMs),
      );
    }),
  });
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
  c.register(PREFERENCES_RESOLVER, {
    useFactory: (d) =>
      new PreferencesResolver(
        d.resolve<UserPreferencesProvider>(USER_PREFERENCES_PROVIDER),
        config.defaultPreferences,
        d.resolve<Logger>(LOGGER),
      ),
  });
  c.register(CHANNEL_DELIVERY, {
    useFactory: (d) =>
      new ChannelDelivery(
        d.resolve<NotificationChannelResolver>(NOTIFICATION_CHANNEL_RESOLVER),
        d.resolve<Logger>(LOGGER),
        config.notifications.sendTimeoutMs,
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
  c.register(WAKE_UP_HANDLER, {
    useFactory: (d) => new WakeUpHandler(d.resolve<WakeUpUseCase>(WAKE_UP_USE_CASE)),
  });
  c.register(WAKE_UP_HTTP_API, {
    useFactory: (d) =>
      new WakeUpHttpApi(
        d.resolve<WakeUpHandler>(WAKE_UP_HANDLER),
        d.resolve<Logger>(LOGGER),
        openApiDocument,
      ),
  });

  return c;
}
