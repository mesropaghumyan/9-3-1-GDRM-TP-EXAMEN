import { describe, expect, it } from 'vitest';
import type { MusicProvider, TrackQuery } from '../../src/domain/index.js';

/** Contract every MusicProvider must honour: a found track exposes exactly title and artist. */
export function musicProviderContract(
  name: string,
  create: () => MusicProvider,
  knownQuery: TrackQuery,
): void {
  describe(`MusicProvider contract: ${name}`, () => {
    it('has a non-empty name', () => {
      expect(create().name).not.toBe('');
    });

    it('known query -> Track whose serialized keys are exactly title and artist', async () => {
      const track = await create().find(knownQuery);

      expect(track).not.toBeNull();
      expect(Object.keys(JSON.parse(JSON.stringify(track)) as object)).toEqual(['title', 'artist']);
    });
  });
}
