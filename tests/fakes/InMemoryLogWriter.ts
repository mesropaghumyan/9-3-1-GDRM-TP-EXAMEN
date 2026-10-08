import type { LogWriter } from '../../src/domain/index.js';

export class InMemoryLogWriter implements LogWriter {
  readonly lines: string[] = [];

  write(line: string): void {
    this.lines.push(line);
  }

  entries(): Record<string, unknown>[] {
    return this.lines.map((line) => JSON.parse(line) as Record<string, unknown>);
  }
}
