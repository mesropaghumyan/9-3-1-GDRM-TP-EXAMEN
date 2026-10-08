/** The only exit point of the log: one line per call. */
export interface LogWriter {
  write(line: string): void;
}
export const LOG_WRITER = Symbol('LogWriter');
