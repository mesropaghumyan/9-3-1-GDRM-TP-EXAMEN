import { inject, injectable } from 'tsyringe';
import {
  CLOCK,
  LOG_WRITER,
  type Clock,
  type LogFields,
  type Logger,
  type LogWriter,
} from '../../domain/index.js';

type Level = 'info' | 'warn' | 'error';

@injectable()
export class JsonLogger implements Logger {
  constructor(
    @inject(LOG_WRITER) private readonly writer: LogWriter,
    @inject(CLOCK) private readonly clock: Clock,
  ) {}

  info(event: string, fields?: LogFields): void {
    this.log('info', event, fields);
  }

  warn(event: string, fields?: LogFields): void {
    this.log('warn', event, fields);
  }

  error(event: string, fields?: LogFields): void {
    this.log('error', event, fields);
  }

  private log(level: Level, event: string, fields: LogFields | undefined): void {
    // Why: reserved keys are written last so a caller field can never overwrite them.
    this.writer.write(
      JSON.stringify({ ...fields, level, event, at: this.clock.now().toISOString() }),
    );
  }
}
