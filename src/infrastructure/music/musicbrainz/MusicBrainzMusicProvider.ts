import {
  createTrack,
  MusicProviderUnavailableError,
  type HttpClient,
  type HttpResponse,
  type MusicProvider,
  type Track,
  type TrackQuery,
} from '../../../domain/index.js';
import type { MusicBrainzConfig } from '../../config/index.js';
import type { CircuitBreaker, RateLimiter, TtlCache } from '../../resilience/index.js';
import { normalizeText } from '../normalizeText.js';
import { isMusicBrainzRecording, isMusicBrainzResponse } from './MusicBrainzDto.js';

/**
 * MusicBrainz adapter. Same order as iTunes: cache -> circuit -> pacing -> call -> cache.
 * Every request carries the configured, non-empty User-Agent.
 */
export class MusicBrainzMusicProvider implements MusicProvider {
  readonly name = 'musicbrainz';

  constructor(
    private readonly http: HttpClient,
    private readonly config: MusicBrainzConfig,
    private readonly cache: TtlCache<Track | null>,
    private readonly limiter: RateLimiter,
    private readonly breaker: CircuitBreaker,
  ) {}

  async find(query: TrackQuery, signal?: AbortSignal): Promise<Track | null> {
    const term = normalizeText(
      query.artist === undefined ? query.title : `${query.title} ${query.artist}`,
    );
    const cached = this.cache.get(term);
    if (cached !== undefined) {
      return cached;
    }
    if (!this.breaker.canCall()) {
      throw new MusicProviderUnavailableError('musicbrainz circuit is open');
    }
    if (!this.limiter.tryAcquire()) {
      throw new MusicProviderUnavailableError('musicbrainz pacing limit reached');
    }

    const track = this.toTrack(await this.requestJson(term, signal));
    this.breaker.recordSuccess();
    this.cache.set(term, track);
    return track;
  }

  private async requestJson(term: string, signal: AbortSignal | undefined): Promise<HttpResponse> {
    const url = `${this.config.baseUrl}?${new URLSearchParams({ query: term, fmt: 'json' }).toString()}`;
    try {
      return await this.http.getJson(url, {
        headers: { 'User-Agent': this.config.userAgent },
        timeoutMs: this.config.timeoutMs,
        ...(signal === undefined ? {} : { signal }),
      });
    } catch (error) {
      if (signal?.aborted === true) {
        throw error;
      }
      this.breaker.recordFailure();
      throw new MusicProviderUnavailableError('musicbrainz request failed', { cause: error });
    }
  }

  private toTrack(response: HttpResponse): Track | null {
    if (response.status !== 200 || !isMusicBrainzResponse(response.body)) {
      this.breaker.recordFailure();
      throw new MusicProviderUnavailableError(
        `musicbrainz answered an unusable response (${String(response.status)})`,
      );
    }
    const first = response.body.recordings.find(isMusicBrainzRecording);
    if (first === undefined) {
      return null;
    }
    return createTrack(first.title, first['artist-credit'].map((credit) => credit.name).join(', '));
  }
}
