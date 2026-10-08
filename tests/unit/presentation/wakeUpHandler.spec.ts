import { describe, expect, it } from 'vitest';
import type { WakeUpUseCase } from '../../../src/application/index.js';
import { InvalidInputError, type WakeUpResult } from '../../../src/domain/index.js';
import { WakeUpHandler } from '../../../src/presentation/index.js';

const delivered: WakeUpResult = {
  status: 'DELIVERED',
  degraded: false,
  track: { title: 't', artist: 'a' },
  trackSource: 'WEATHER',
  providerName: 'local',
  channel: 'EMAIL',
  attempts: [{ channel: 'EMAIL', succeeded: true }],
};

function recordingUseCase() {
  const calls: unknown[][] = [];
  const useCase: WakeUpUseCase = {
    trigger: (...args) => {
      calls.push(args);
      return Promise.resolve(delivered);
    },
  };
  return { useCase, calls };
}

describe('WakeUpHandler', () => {
  it('valid raw input -> parsed, then delegated with the signal', async () => {
    const { useCase, calls } = recordingUseCase();
    const controller = new AbortController();

    const result = await new WakeUpHandler(useCase).handle(
      { userId: ' alice ', day: 'MARDI', weather: 'PLUIE' },
      controller.signal,
    );

    expect(result).toBe(delivered);
    expect(calls).toEqual([['alice', 'TUESDAY', 'RAIN', controller.signal]]);
  });

  it('invalid raw input -> InvalidInputError and the use case is never called', () => {
    const { useCase, calls } = recordingUseCase();

    expect(() =>
      new WakeUpHandler(useCase).handle({ userId: '', day: 'LUNDI', weather: 'SOLEIL' }),
    ).toThrow(InvalidInputError);
    expect(calls).toHaveLength(0);
  });
});
