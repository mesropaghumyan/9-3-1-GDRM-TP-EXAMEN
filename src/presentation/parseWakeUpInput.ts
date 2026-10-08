import {
  createUserId,
  InvalidInputError,
  type DayOfWeek,
  type WeatherType,
} from '../domain/index.js';
import type { RawWakeUpInput, WakeUpInput } from './WakeUpInput.js';

// Why: input labels are French, the domain is English; the mapping lives at the boundary only.
export const WEATHER_BY_LABEL: ReadonlyMap<string, WeatherType> = new Map([
  ['SOLEIL', 'SUNNY'],
  ['PLUIE', 'RAIN'],
  ['NEIGE', 'SNOW'],
  ['NUAGEUX', 'CLOUDY'],
]);

export const DAY_BY_LABEL: ReadonlyMap<string, DayOfWeek> = new Map([
  ['LUNDI', 'MONDAY'],
  ['MARDI', 'TUESDAY'],
  ['MERCREDI', 'WEDNESDAY'],
  ['JEUDI', 'THURSDAY'],
  ['VENDREDI', 'FRIDAY'],
  ['SAMEDI', 'SATURDAY'],
  ['DIMANCHE', 'SUNDAY'],
]);

/** @throws InvalidInputError when a field is blank or unknown: no wake-up is ever triggered on bad data. */
export function parseWakeUpInput(raw: RawWakeUpInput): WakeUpInput {
  const day = DAY_BY_LABEL.get(raw.day);
  if (day === undefined) {
    throw new InvalidInputError(`unknown day: ${raw.day}`);
  }
  const weather = WEATHER_BY_LABEL.get(raw.weather);
  if (weather === undefined) {
    throw new InvalidInputError(`unknown weather: ${raw.weather}`);
  }
  return { userId: createUserId(raw.userId), day, weather };
}
