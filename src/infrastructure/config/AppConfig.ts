import type { ChannelKind, Track } from '../../domain/index.js';

export type ProviderName = 'itunes' | 'musicbrainz' | 'local';

export interface AppConfig {
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
