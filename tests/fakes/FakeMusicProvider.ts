import type { MusicProvider, Track, TrackQuery } from '../../src/domain/index.js';

type Behavior = Track | null | Error;

export class FakeMusicProvider implements MusicProvider {
  readonly queries: TrackQuery[] = [];
  readonly signals: (AbortSignal | undefined)[] = [];

  constructor(
    readonly name: string,
    private readonly behavior: Behavior,
  ) {}

  find(query: TrackQuery, signal?: AbortSignal): Promise<Track | null> {
    this.queries.push(query);
    this.signals.push(signal);
    return this.behavior instanceof Error
      ? Promise.reject(this.behavior)
      : Promise.resolve(this.behavior);
  }
}
