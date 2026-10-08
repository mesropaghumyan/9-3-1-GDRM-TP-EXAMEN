import type { ChannelKind, Track } from '../../domain/index.js';

export type ProviderName = 'itunes' | 'musicbrainz' | 'local';

export interface HttpConfig {
  /** Retries after a transport error or a 5xx (never after a 4xx). */
  readonly maxRetries: number;
}

export interface BreakerConfig {
  readonly failureThreshold: number;
  readonly halfOpenAfterMs: number;
}

export interface AppConfig {
  readonly http: HttpConfig;
  readonly breaker: BreakerConfig;
  readonly music: {
    /** Chain order; always ends with the local list, which cannot fail. */
    readonly providerOrder: readonly ProviderName[];
    readonly localTracks: readonly Track[];
  };
  readonly notifications: {
    readonly channelFallbackOrder: readonly ChannelKind[];
    readonly sendTimeoutMs: number;
  };
}
