import { injectable } from 'tsyringe';
import type { LogWriter } from '../../domain/index.js';

@injectable()
export class StdoutLogWriter implements LogWriter {
  write(line: string): void {
    // Why: the only reference to process.stdout in the code base (console.* is forbidden).
    process.stdout.write(`${line}\n`);
  }
}
