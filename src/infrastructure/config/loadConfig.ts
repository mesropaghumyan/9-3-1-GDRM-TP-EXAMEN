import { CHANNEL_KINDS, createTrack, type ChannelKind } from '../../domain/index.js';
import type { AppConfig, ProviderName } from './AppConfig.js';
import { ConfigError } from './ConfigError.js';

export type Environment = Readonly<Record<string, string | undefined>>;

const PROVIDER_NAMES: readonly ProviderName[] = ['itunes', 'musicbrainz', 'local'];

// Why: defaults live here (the composition root reads them once), never in the business logic.
const DEFAULT_PROVIDER_ORDER: readonly ProviderName[] = ['itunes', 'musicbrainz', 'local'];
const DEFAULT_LOCAL_TRACKS = [
  createTrack('Here Comes the Sun', 'The Beatles'),
  createTrack('Three Little Birds', 'Bob Marley'),
  createTrack('Good Day Sunshine', 'The Beatles'),
  createTrack('Walking on Sunshine', 'Katrina and the Waves'),
];
const MIN_TIMEOUT_MS = 100;
const MAX_TIMEOUT_MS = 60_000;
const DEFAULT_TIMEOUT_MS = 2000;
const DEFAULT_PORT = 3000;

function parseList<T extends string>(
  name: string,
  raw: string | undefined,
  allowed: readonly T[],
  fallback: readonly T[],
): readonly T[] {
  if (raw === undefined) {
    return fallback;
  }
  const items = raw.split(',').map((item) => item.trim());
  // Why: `includes` is typed on the narrow union; widening to string[] is safe, the guard re-narrows.
  const known = items.filter((item): item is T => (allowed as readonly string[]).includes(item));
  if (known.length !== items.length || items.length === 0) {
    throw new ConfigError(`${name} must be a comma-separated list of: ${allowed.join(', ')}`);
  }
  if (new Set(items).size !== items.length) {
    throw new ConfigError(`${name} must not contain duplicates`);
  }
  return known;
}

function parsePort(raw: string | undefined): number {
  if (raw === undefined) {
    return DEFAULT_PORT;
  }
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 0 || value > 65_535) {
    throw new ConfigError('PORT must be an integer between 0 and 65535');
  }
  return value;
}

function parseTimeout(raw: string | undefined): number {
  if (raw === undefined) {
    return DEFAULT_TIMEOUT_MS;
  }
  const value = Number(raw);
  if (!Number.isInteger(value) || value < MIN_TIMEOUT_MS || value > MAX_TIMEOUT_MS) {
    throw new ConfigError(
      `NOTIFICATION_TIMEOUT_MS must be an integer between ${String(MIN_TIMEOUT_MS)} and ${String(MAX_TIMEOUT_MS)}`,
    );
  }
  return value;
}

// Why: the contact in the User-Agent must be provided by the operator, never hard-coded in logic.
const DEFAULT_USER_AGENT =
  'ReveilMusical/0.1.0 ( https://github.com/mesropaghumyan/9-3-1-GDRM-TP-EXAMEN )';

function parseUserAgent(raw: string | undefined): string {
  const value = raw === undefined ? DEFAULT_USER_AGENT : raw.trim();
  if (value === '') {
    throw new ConfigError(
      'MUSICBRAINZ_USER_AGENT must not be empty (MusicBrainz rejects anonymous clients)',
    );
  }
  return value;
}

/** Read once by the composition root; the result is immutable and injected as typed objects. */
export function loadConfig(env: Environment): AppConfig {
  const providerOrder = parseList(
    'MUSIC_PROVIDER_ORDER',
    env['MUSIC_PROVIDER_ORDER'],
    PROVIDER_NAMES,
    DEFAULT_PROVIDER_ORDER,
  );
  if (providerOrder.at(-1) !== 'local') {
    throw new ConfigError(
      'MUSIC_PROVIDER_ORDER must end with "local" (the provider that cannot fail)',
    );
  }
  const channelFallbackOrder = parseList<ChannelKind>(
    'CHANNEL_FALLBACK_ORDER',
    env['CHANNEL_FALLBACK_ORDER'],
    CHANNEL_KINDS,
    CHANNEL_KINDS,
  );
  const [firstLocal] = DEFAULT_LOCAL_TRACKS;
  const config: AppConfig = {
    // Why: the first local track guarantees the default preferences always resolve to a track.
    defaultPreferences: {
      trackByWeather: new Map(),
      fallbackTrack: { title: firstLocal?.title ?? '', artist: firstLocal?.artist ?? '' },
      preferredChannel: 'EMAIL',
    },
    server: { port: parsePort(env['PORT']) },
    http: { maxRetries: 1 },
    breaker: { failureThreshold: 3, halfOpenAfterMs: 30_000 },
    music: {
      providerOrder,
      localTracks: DEFAULT_LOCAL_TRACKS,
      itunes: {
        baseUrl: 'https://itunes.apple.com/search',
        timeoutMs: 3000,
        ttlMs: 3_600_000,
        maxRequests: 20,
        windowMs: 60_000,
      },
      musicbrainz: {
        baseUrl: 'https://musicbrainz.org/ws/2/recording',
        userAgent: parseUserAgent(env['MUSICBRAINZ_USER_AGENT']),
        timeoutMs: 3000,
        ttlMs: 86_400_000,
        maxRequests: 1,
        windowMs: 1000,
      },
    },
    notifications: {
      channelFallbackOrder,
      sendTimeoutMs: parseTimeout(env['NOTIFICATION_TIMEOUT_MS']),
    },
  };
  return Object.freeze(config);
}
