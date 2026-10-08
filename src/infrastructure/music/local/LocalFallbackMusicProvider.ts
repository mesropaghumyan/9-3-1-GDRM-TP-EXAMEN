import { inject, injectable } from 'tsyringe';
import type { MusicProvider, Track, TrackQuery } from '../../../domain/index.js';
import { LOCAL_TRACKS } from '../../tokens.js';
import { normalizeText } from '../normalizeText.js';

/** Last link of the chain: in memory, no I/O, no randomness, so it cannot fail. */
@injectable()
export class LocalFallbackMusicProvider implements MusicProvider {
  readonly name = 'local';

  constructor(@inject(LOCAL_TRACKS) private readonly tracks: readonly Track[]) {
    if (tracks.length === 0) {
      throw new RangeError('the local track list must not be empty');
    }
  }

  find(query: TrackQuery): Promise<Track | null> {
    const wanted = normalizeText(query.title);
    const match = this.tracks.find((track) => normalizeText(track.title) === wanted);
    // Why: deterministic fallback to the first entry guarantees a track is always found.
    return Promise.resolve(match ?? this.tracks[0] ?? null);
  }
}
