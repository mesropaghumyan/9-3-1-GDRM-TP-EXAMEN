import { describe, expect, it } from 'vitest';
import type { UserPreferences } from '../../../src/domain/index.js';
import { TrackSelectionPolicy } from '../../../src/application/index.js';

const sunny = { title: 'Here Comes the Sun', artist: 'The Beatles' };
const fallback = { title: 'Three Little Birds', artist: 'Bob Marley' };
const preferences = (overrides: Partial<UserPreferences> = {}): UserPreferences => ({
  trackByWeather: new Map([['SUNNY', sunny]]),
  fallbackTrack: fallback,
  preferredChannel: 'EMAIL',
  ...overrides,
});

describe('TrackSelectionPolicy', () => {
  const policy = new TrackSelectionPolicy();

  it('weather covered -> the weather track, source WEATHER', () => {
    expect(policy.select(preferences(), 'SUNNY')).toEqual({ query: sunny, source: 'WEATHER' });
  });

  it('weather not covered -> user fallback, source USER_FALLBACK', () => {
    expect(policy.select(preferences(), 'SNOW')).toEqual({
      query: fallback,
      source: 'USER_FALLBACK',
    });
  });

  it('no weather track and blank fallback -> local list, source LOCAL_FALLBACK', () => {
    const selection = policy.select(preferences({ fallbackTrack: { title: '  ' } }), 'RAIN');

    expect(selection).toEqual({ query: { title: '' }, source: 'LOCAL_FALLBACK' });
  });
});
