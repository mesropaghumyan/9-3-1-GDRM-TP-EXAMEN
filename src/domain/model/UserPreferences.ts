import type { ChannelKind } from './ChannelKind.js';
import type { TrackQuery } from './TrackQuery.js';
import type { WeatherType } from './WeatherType.js';

export interface UserPreferences {
  readonly trackByWeather: ReadonlyMap<WeatherType, TrackQuery>;
  readonly fallbackTrack: TrackQuery;
  readonly preferredChannel: ChannelKind;
}
