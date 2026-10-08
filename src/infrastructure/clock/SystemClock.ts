import { injectable } from 'tsyringe';
import type { Clock } from '../../domain/index.js';

@injectable()
export class SystemClock implements Clock {
  now(): Date {
    // Why: the single place allowed to read the machine time; everything else goes through Clock.
    // eslint-disable-next-line no-restricted-syntax
    return new Date();
  }
}
