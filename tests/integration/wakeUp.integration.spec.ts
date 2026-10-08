import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { WAKE_UP_USE_CASE, type WakeUpUseCase } from '../../src/application/index.js';
import {
  CLOCK,
  createUserId,
  LOG_WRITER,
  LOGGER,
  type Clock,
  type Logger,
} from '../../src/domain/index.js';
import { loadConfig } from '../../src/infrastructure/config/index.js';
import { buildContainer } from '../../src/main/container.js';
import { FakeClock } from '../fakes/FakeClock.js';
import { InMemoryLogWriter } from '../fakes/InMemoryLogWriter.js';

function setup(env: Record<string, string> = {}) {
  const container = buildContainer(loadConfig(env));
  const writer = new InMemoryLogWriter();
  container.register(LOG_WRITER, { useValue: writer });
  container.register(CLOCK, { useValue: new FakeClock() });
  return { container, writer };
}

describe('Production container (local list as the only provider)', () => {
  it('resolve(WAKE_UP_USE_CASE) -> graph resolved, use case is transient', () => {
    const { container } = setup();

    const first = container.resolve<WakeUpUseCase>(WAKE_UP_USE_CASE);
    const second = container.resolve<WakeUpUseCase>(WAKE_UP_USE_CASE);

    expect(first).not.toBe(second);
  });

  it('singletons -> shared, and never built from a transient (no captive dependency)', () => {
    const { container } = setup();

    expect(container.resolve<Logger>(LOGGER)).toBe(container.resolve<Logger>(LOGGER));
    expect(container.resolve<Clock>(CLOCK)).toBe(container.resolve<Clock>(CLOCK));
    // Resolving the transient use case twice must not recreate the singleton logger it received.
    container.resolve<WakeUpUseCase>(WAKE_UP_USE_CASE);
    expect(container.resolve<Logger>(LOGGER)).toBe(container.resolve<Logger>(LOGGER));
  });

  it.each([
    ['alice', 'EMAIL'],
    ['bob', 'SMS'],
    ['carol', 'PUSH'],
  ] as const)(
    'user %s -> DELIVERED on %s with a simulated delivery in the log',
    async (user, channel) => {
      const { container, writer } = setup();
      const useCase = container.resolve<WakeUpUseCase>(WAKE_UP_USE_CASE);

      const result = await useCase.trigger(createUserId(user), 'MONDAY', 'SUNNY');

      expect(result).toMatchObject({
        status: 'DELIVERED',
        degraded: false,
        channel,
        providerName: 'local',
      });
      expect(
        writer.entries().filter((entry) => entry['event'] === 'notification.simulated'),
      ).toEqual([expect.objectContaining({ channel, recipient: user })]);
    },
  );

  it('provider order naming an unregistered adapter -> explicit ConfigError', () => {
    const { container } = setup({ MUSIC_PROVIDER_ORDER: 'itunes,local' });

    expect(() => container.resolve<WakeUpUseCase>(WAKE_UP_USE_CASE)).toThrow(
      /no adapter registered/,
    );
  });
});

describe('Command line entry point', () => {
  const entry = resolve(import.meta.dirname, '../../src/main/index.ts');
  const tsx = resolve(import.meta.dirname, '../../node_modules/.bin/tsx');

  it('alice LUNDI SOLEIL -> DELIVERED JSON on stdout, exit code 0', () => {
    const out = execFileSync(tsx, [entry, 'alice', 'LUNDI', 'SOLEIL'], { encoding: 'utf8' });

    const lines = out
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line) as Record<string, unknown>);
    expect(lines.at(-1)).toMatchObject({ result: { status: 'DELIVERED' } });
  });

  it('invalid day -> INVALID_INPUT, exit code 2, no wake-up started', () => {
    let status = 0;
    let stdout = '';
    try {
      execFileSync(tsx, [entry, 'alice', 'FUNDAY', 'SOLEIL'], { encoding: 'utf8' });
    } catch (error) {
      const failure = error as { status: number; stdout: string };
      status = failure.status;
      stdout = failure.stdout;
    }

    expect(status).toBe(2);
    expect(stdout).toContain('INVALID_INPUT');
    expect(stdout).not.toContain('wakeup.started');
  });
});
