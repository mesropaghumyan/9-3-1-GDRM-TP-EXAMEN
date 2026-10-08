import type { DayOfWeek, UserId, WeatherType } from '../domain/index.js';

export interface RawWakeUpInput {
  readonly userId: string;
  readonly day: string;
  readonly weather: string;
}

export interface WakeUpInput {
  readonly userId: UserId;
  readonly day: DayOfWeek;
  readonly weather: WeatherType;
}
