import { injectable } from 'tsyringe';
import type { TrackQuery, TrackSource, UserPreferences, WeatherType } from '../domain/index.js';

export interface TrackSelection {
  readonly query: TrackQuery;
  readonly source: TrackSource;
}

/** Pure decision: the user's track for the weather, else the user's fallback, else the local list. */
@injectable()
export class TrackSelectionPolicy {
  select(preferences: UserPreferences, weather: WeatherType): TrackSelection {
    const forWeather = preferences.trackByWeather.get(weather);
    if (forWeather !== undefined) {
      return { query: forWeather, source: 'WEATHER' };
    }
    if (preferences.fallbackTrack.title.trim() !== '') {
      return { query: preferences.fallbackTrack, source: 'USER_FALLBACK' };
    }
    // Why: no usable user track at all; an empty title makes the local list answer with its first entry.
    return { query: { title: '' }, source: 'LOCAL_FALLBACK' };
  }
}
