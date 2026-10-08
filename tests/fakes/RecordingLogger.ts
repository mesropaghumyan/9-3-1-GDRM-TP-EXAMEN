import type { LogFields, Logger } from '../../src/domain/index.js';

export interface LogCall {
  readonly level: 'info' | 'warn' | 'error';
  readonly event: string;
  readonly fields: LogFields | undefined;
}

export class RecordingLogger implements Logger {
  readonly calls: LogCall[] = [];

  info(event: string, fields?: LogFields): void {
    this.calls.push({ level: 'info', event, fields });
  }

  warn(event: string, fields?: LogFields): void {
    this.calls.push({ level: 'warn', event, fields });
  }

  error(event: string, fields?: LogFields): void {
    this.calls.push({ level: 'error', event, fields });
  }

  events(level: LogCall['level']): string[] {
    return this.calls.filter((call) => call.level === level).map((call) => call.event);
  }
}
