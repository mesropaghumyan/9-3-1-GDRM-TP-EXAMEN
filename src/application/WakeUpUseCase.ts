import type { DayOfWeek, UserId, WakeUpResult, WeatherType } from '../domain/index.js';

export interface WakeUpUseCase {
  trigger(
    userId: UserId,
    day: DayOfWeek,
    weather: WeatherType,
    signal?: AbortSignal,
  ): Promise<WakeUpResult>;
}
