import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { WakeUpUseCase } from '../../src/application/index.js';
import {
  CHANNEL_KINDS,
  FAILURE_REASONS,
  TRACK_SOURCES,
  type WakeUpResult,
} from '../../src/domain/index.js';
import {
  DAY_BY_LABEL,
  WakeUpHandler,
  WakeUpHttpApi,
  WEATHER_BY_LABEL,
} from '../../src/presentation/index.js';
import { RecordingLogger } from '../fakes/RecordingLogger.js';

const yaml = readFileSync(resolve(import.meta.dirname, '../../docs/api/openapi.yaml'), 'utf8');

/** Reads `key: ... enum: [A, B]` (block or inline form) written in this contract's flow style. */
function enumOf(key: string): string[] {
  const match = new RegExp(
    `\\b${key}:[^\\n]*?(?:\\{[^}]*?enum: \\[([^\\]]*)\\]|\\n\\s+type: string\\n\\s+enum: \\[([^\\]]*)\\])`,
  ).exec(yaml);
  const raw = match?.[1] ?? match?.[2];
  if (raw === undefined) throw new Error(`enum not found for ${key}`);
  return raw.split(',').map((item) => item.trim());
}

const declaredRoutes = [...yaml.matchAll(/^  (\/[^\s:]*):\n((?:    .*\n|\n)*)/gm)].map((match) => ({
  path: match[1] ?? '',
  method: /^    (get|post):/m.exec(match[2] ?? '')?.[1]?.toUpperCase() ?? '',
}));

describe('docs/api/openapi.yaml vs the code', () => {
  it('declares the three expected routes', () => {
    expect(declaredRoutes).toEqual([
      { path: '/wake-ups', method: 'POST' },
      { path: '/health', method: 'GET' },
      { path: '/openapi.yaml', method: 'GET' },
    ]);
  });

  it.each(declaredRoutes)(
    '$method $path -> exists on the server (neither 404 nor 405)',
    async ({ path, method }) => {
      const result: WakeUpResult = {
        status: 'FAILED',
        degraded: true,
        reason: 'CANCELLED',
        attempts: [],
      };
      const useCase: WakeUpUseCase = { trigger: () => Promise.resolve(result) };
      const api = new WakeUpHttpApi(new WakeUpHandler(useCase), new RecordingLogger(), yaml);

      const response = await api.handle({ method, path, body: '{}' });

      expect([404, 405]).not.toContain(response.status);
    },
  );

  it('days (French input labels) -> same as the code', () => {
    expect(enumOf('day')).toEqual([...DAY_BY_LABEL.keys()]);
  });

  it('weathers (French input labels) -> same as the code', () => {
    expect(enumOf('weather')).toEqual([...WEATHER_BY_LABEL.keys()]);
  });

  it('channels -> same as the domain', () => {
    expect(enumOf('ChannelKind')).toEqual([...CHANNEL_KINDS]);
  });

  it('track sources -> same as the domain', () => {
    expect(enumOf('TrackSource')).toEqual([...TRACK_SOURCES]);
  });

  it('failure reasons -> same as the domain', () => {
    expect(enumOf('reason')).toEqual([...FAILURE_REASONS]);
  });
});
