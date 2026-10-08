import {
  MusicProviderUnavailableError,
  type Logger,
  type MusicProvider,
  type ResolvedTrack,
  type Track,
  type TrackQuery,
  type TrackResolver,
} from '../domain/index.js';

/**
 * Composite over an ordered provider chain. Built by the composition root (useFactory) because
 * the order comes from configuration. The last provider (the local list) cannot fail.
 */
export class FallbackMusicProvider implements MusicProvider, TrackResolver {
  readonly name = 'fallback-chain';

  constructor(
    private readonly providers: readonly MusicProvider[],
    private readonly logger: Logger,
  ) {}

  async find(query: TrackQuery, signal?: AbortSignal): Promise<Track | null> {
    return (await this.resolve(query, signal)).track;
  }

  async resolve(query: TrackQuery, signal?: AbortSignal): Promise<ResolvedTrack> {
    let skipped = 0;
    for (const [index, provider] of this.providers.entries()) {
      signal?.throwIfAborted();
      let cause = 'no-result';
      try {
        const track = await provider.find(query, signal);
        if (track !== null) {
          this.logger.info('music.provider.used', { provider: provider.name });
          return {
            track,
            providerName: provider.name,
            skippedProviders: skipped,
            isLocalFallback: skipped > 0 && index === this.providers.length - 1,
          };
        }
      } catch (error) {
        // Why: cancellation must stop the chain; any other failure only means "provider unavailable".
        if (signal?.aborted === true) {
          throw error;
        }
        cause = error instanceof Error ? `${error.name}: ${error.message}` : 'unknown-error';
      }
      skipped += 1;
      this.logger.warn('music.provider.skipped', { provider: provider.name, cause });
    }
    throw new MusicProviderUnavailableError('no music provider could answer');
  }
}
