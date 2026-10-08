import {
  createTrack,
  MusicProviderUnavailableError,
  type HttpClient,
  type HttpResponse,
  type MusicProvider,
  type Track,
  type TrackQuery,
} from '../../../domain/index.js';
import type { ItunesConfig } from '../../config/index.js';
import type { CircuitBreaker, RateLimiter, TtlCache } from '../../resilience/index.js';
import { normalizeText } from '../normalizeText.js';
import { isITunesResponse, isITunesResult } from './ITunesDto.js';

/**
 * iTunes Search adapter. Built by a useFactory (one cache/limiter/breaker per provider).
 * Order: cache -> circuit -> quota -> call -> cache the answer.
 */
export class ITunesMusicProvider implements MusicProvider {
  readonly name = 'itunes';

  constructor(
    private readonly http: HttpClient,
    private readonly config: ItunesConfig,
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
      throw new MusicProviderUnavailableError('itunes circuit is open');
    }
    if (!this.limiter.tryAcquire()) {
      throw new MusicProviderUnavailableError('itunes quota reached');
    }

    const track = this.toTrack(await this.requestJson(term, signal));
    this.breaker.recordSuccess();
    this.cache.set(term, track);
    return track;
  }

  private async requestJson(term: string, signal: AbortSignal | undefined): Promise<HttpResponse> {
    const url = `${this.config.baseUrl}?${new URLSearchParams({ term, media: 'music', limit: '5' }).toString()}`;
    try {
      return await this.http.getJson(url, {
        timeoutMs: this.config.timeoutMs,
        ...(signal === undefined ? {} : { signal }),
      });
    } catch (error) {
      if (signal?.aborted === true) {
        throw error;
      }
      this.breaker.recordFailure();
      throw new MusicProviderUnavailableError('itunes request failed', { cause: error });
    }
  }

  private toTrack(response: HttpResponse): Track | null {
    if (response.status !== 200 || !isITunesResponse(response.body)) {
      this.breaker.recordFailure();
      throw new MusicProviderUnavailableError(
        `itunes answered an unusable response (${String(response.status)})`,
      );
    }
    const first = response.body.results.find(isITunesResult);
    return first === undefined ? null : createTrack(first.trackName, first.artistName);
  }
}
