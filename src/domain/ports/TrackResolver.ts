import type { ResolvedTrack, TrackQuery } from '../model/index.js';

/** Never answers null: the chain ends with a provider that cannot fail. */
export interface TrackResolver {
  resolve(query: TrackQuery, signal?: AbortSignal): Promise<ResolvedTrack>;
}
export const TRACK_RESOLVER = Symbol('TrackResolver');
