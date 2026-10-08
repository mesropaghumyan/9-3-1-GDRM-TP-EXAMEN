import type { Track, TrackQuery } from '../model/index.js';

export interface MusicProvider {
  readonly name: string;
  find(query: TrackQuery, signal?: AbortSignal): Promise<Track | null>;
}
export const MUSIC_PROVIDER = Symbol('MusicProvider');
