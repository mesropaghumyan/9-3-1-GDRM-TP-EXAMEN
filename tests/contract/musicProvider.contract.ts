import { describe, expect, it } from 'vitest';
import {
  MusicProviderUnavailableError,
  type MusicProvider,
  type TrackQuery,
} from '../../src/domain/index.js';

/** Contract every MusicProvider must honour: a found track exposes exactly title and artist. */
export function musicProviderContract(
  name: string,
  create: () => MusicProvider,
  knownQuery: TrackQuery,
  /** Providers wired to fail in every supported way (empty, 429, 5xx, timeout, bad JSON...). */
  failing: readonly (() => MusicProvider)[] = [],
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

    it.each(failing.map((create, index) => [index, create] as const))(
      'failure scenario %i -> null or MusicProviderUnavailableError, never a third-party error',
      async (_index, createFailing) => {
        const outcome = await createFailing()
          .find(knownQuery)
          .then(
            (track) => track,
            (error: unknown) => error,
          );

        expect(outcome === null || outcome instanceof MusicProviderUnavailableError).toBe(true);
      },
    );
  });
}
