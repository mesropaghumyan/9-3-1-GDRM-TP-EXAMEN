import { describe, expect, it } from 'vitest';
import { InvalidInputError } from '../../../src/domain/index.js';
import { parseWakeUpInput } from '../../../src/presentation/index.js';

describe('parseWakeUpInput', () => {
  it.each([
    ['SOLEIL', 'SUNNY'],
    ['PLUIE', 'RAIN'],
    ['NEIGE', 'SNOW'],
    ['NUAGEUX', 'CLOUDY'],
  ])('weather %s -> %s', (label, expected) => {
    const input = parseWakeUpInput({ userId: 'alice', day: 'LUNDI', weather: label });

    expect(input.weather).toBe(expected);
  });

  it.each([
    ['LUNDI', 'MONDAY'],
    ['MARDI', 'TUESDAY'],
    ['MERCREDI', 'WEDNESDAY'],
    ['JEUDI', 'THURSDAY'],
    ['VENDREDI', 'FRIDAY'],
    ['SAMEDI', 'SATURDAY'],
    ['DIMANCHE', 'SUNDAY'],
  ])('day %s -> %s', (label, expected) => {
    const input = parseWakeUpInput({ userId: 'alice', day: label, weather: 'SOLEIL' });

    expect(input.day).toBe(expected);
  });

  it.each([
    ['blank userId', { userId: '  ', day: 'LUNDI', weather: 'SOLEIL' }],
    ['unknown day', { userId: 'alice', day: 'FUNDAY', weather: 'SOLEIL' }],
    ['unknown weather', { userId: 'alice', day: 'LUNDI', weather: 'BROUILLARD' }],
    ['english weather label', { userId: 'alice', day: 'LUNDI', weather: 'SUNNY' }],
  ])('%s -> InvalidInputError', (_name, raw) => {
    expect(() => parseWakeUpInput(raw)).toThrow(InvalidInputError);
  });
});
