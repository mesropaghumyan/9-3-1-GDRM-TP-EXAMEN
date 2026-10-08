import type { WakeUpUseCase } from '../application/index.js';
import type { WakeUpResult } from '../domain/index.js';
import { parseWakeUpInput } from './parseWakeUpInput.js';
import type { RawWakeUpInput } from './WakeUpInput.js';

/** Thin entry point: validates the raw input, then delegates to the use case. */
export class WakeUpHandler {
  constructor(private readonly useCase: WakeUpUseCase) {}

  /** @throws InvalidInputError before any provider is called. */
  handle(raw: RawWakeUpInput, signal?: AbortSignal): Promise<WakeUpResult> {
    const input = parseWakeUpInput(raw);
    return this.useCase.trigger(input.userId, input.day, input.weather, signal);
  }
}
