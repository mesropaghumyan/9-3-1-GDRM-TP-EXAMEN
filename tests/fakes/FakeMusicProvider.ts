import type { MusicProvider, Track, TrackQuery } from '../../src/domain/index.js';

type Behavior = Track | null | Error;

export class FakeMusicProvider implements MusicProvider {
  readonly queries: TrackQuery[] = [];

  constructor(
    readonly name: string,
    private readonly behavior: Behavior,
  ) {}

  find(query: TrackQuery): Promise<Track | null> {
    this.queries.push(query);
    return this.behavior instanceof Error
      ? Promise.reject(this.behavior)
      : Promise.resolve(this.behavior);
  }
}
