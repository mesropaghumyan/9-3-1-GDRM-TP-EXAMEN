import { afterEach, describe, expect, it, vi } from 'vitest';
import { JsonLogger, StdoutLogWriter } from '../../../src/infrastructure/logging/index.js';
import { SystemClock } from '../../../src/infrastructure/clock/index.js';
import { FakeClock } from '../../fakes/FakeClock.js';
import { InMemoryLogWriter } from '../../fakes/InMemoryLogWriter.js';

describe('JsonLogger', () => {
  it.each(['info', 'warn', 'error'] as const)(
    '%s -> one JSON line with level, event, clock time and fields',
    (level) => {
      const writer = new InMemoryLogWriter();
      const logger = new JsonLogger(writer, new FakeClock(Date.UTC(2026, 0, 1)));

      logger[level]('wakeup.started', { userId: 'alice' });

      expect(writer.entries()).toEqual([
        { level, event: 'wakeup.started', at: '2026-01-01T00:00:00.000Z', userId: 'alice' },
      ]);
    },
  );

  it('field named like a reserved key -> reserved value wins', () => {
    const writer = new InMemoryLogWriter();
    const logger = new JsonLogger(writer, new FakeClock());

    logger.info('real.event', { event: 'spoofed', level: 'spoofed' });

    expect(writer.entries()[0]).toMatchObject({ event: 'real.event', level: 'info' });
  });

  it('no fields -> still valid JSON', () => {
    const writer = new InMemoryLogWriter();

    new JsonLogger(writer, new FakeClock()).info('x');

    expect(writer.entries()).toHaveLength(1);
  });
});

describe('StdoutLogWriter', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('write -> line followed by newline on stdout', () => {
    const spy = vi.spyOn(process.stdout, 'write').mockReturnValue(true);

    new StdoutLogWriter().write('{"a":1}');

    expect(spy).toHaveBeenCalledWith('{"a":1}\n');
  });
});

describe('SystemClock', () => {
  it('now -> a Date', () => {
    expect(new SystemClock().now()).toBeInstanceOf(Date);
  });
});
