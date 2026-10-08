import type { LogFields } from '../model/index.js';

export interface Logger {
  info(event: string, fields?: LogFields): void;
  warn(event: string, fields?: LogFields): void;
  error(event: string, fields?: LogFields): void;
}
export const LOGGER = Symbol('Logger');
