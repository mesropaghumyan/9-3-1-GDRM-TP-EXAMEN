import { describe, expect, it } from 'vitest';
import { createTrack } from '../../../src/domain/index.js';
import { LocalFallbackMusicProvider } from '../../../src/infrastructure/music/local/index.js';

const first = createTrack('Three Little Birds', 'Bob Marley');
const second = createTrack('Here Comes the Sun', 'The Beatles');

describe('LocalFallbackMusicProvider', () => {
  const provider = new LocalFallbackMusicProvider([first, second]);

  it.each(['here comes the sun', '  HERE   comes the SUN ', 'Hére Cômes the Sun'])(
    'title %j -> matching entry through normalized comparison',
    async (title) => {
      expect(await provider.find({ title })).toBe(second);
    },
  );

  it('unknown title -> first entry (deterministic)', async () => {
    expect(await provider.find({ title: 'Nothing like it' })).toBe(first);
  });

  it('empty list -> rejected at construction', () => {
    expect(() => new LocalFallbackMusicProvider([])).toThrow(RangeError);
  });
});
