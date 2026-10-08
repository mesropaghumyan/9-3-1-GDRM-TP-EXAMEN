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

export interface ItunesConfig {
  readonly baseUrl: string;
  readonly timeoutMs: number;
  readonly ttlMs: number;
  /** iTunes allows roughly 20 requests per minute. */
  readonly maxRequests: number;
  readonly windowMs: number;
}

export interface MusicBrainzConfig {
  readonly baseUrl: string;
  /** Identifiable User-Agent, mandatory for MusicBrainz: `Name/version ( contact )`. */
  readonly userAgent: string;
  readonly timeoutMs: number;
  readonly ttlMs: number;
  /** MusicBrainz asks for about one request per second. */
  readonly maxRequests: number;
  readonly windowMs: number;
}

export interface AppConfig {
  readonly http: HttpConfig;
  readonly breaker: BreakerConfig;
  readonly music: {
    /** Chain order; always ends with the local list, which cannot fail. */
    readonly providerOrder: readonly ProviderName[];
    readonly localTracks: readonly Track[];
    readonly itunes: ItunesConfig;
    readonly musicbrainz: MusicBrainzConfig;
  };
  readonly notifications: {
    readonly channelFallbackOrder: readonly ChannelKind[];
    readonly sendTimeoutMs: number;
  };
}
