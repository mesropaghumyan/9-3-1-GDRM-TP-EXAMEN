import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { WAKE_UP_USE_CASE, type WakeUpUseCase } from '../../src/application/index.js';
import {
  CLOCK,
  createUserId,
  LOG_WRITER,
  LOGGER,
  NOTIFICATION_CHANNEL,
  type Clock,
  type Logger,
} from '../../src/domain/index.js';
import { loadConfig } from '../../src/infrastructure/config/index.js';
import { buildContainer } from '../../src/main/container.js';
import { FakeClock } from '../fakes/FakeClock.js';
import { FakeNotificationChannel } from '../fakes/FakeNotificationChannel.js';
import { InMemoryLogWriter } from '../fakes/InMemoryLogWriter.js';

function setup(env: Record<string, string> = {}) {
  // Why: these scenarios use the local list as the only provider (no HTTP at all).
  const container = buildContainer(loadConfig({ MUSIC_PROVIDER_ORDER: 'local', ...env }));
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
});

describe('Command line entry point', () => {
  const entry = resolve(import.meta.dirname, '../../src/main/index.ts');
  const tsx = resolve(import.meta.dirname, '../../node_modules/.bin/tsx');

  it('alice LUNDI SOLEIL -> DELIVERED JSON on stdout, exit code 0', () => {
    const out = execFileSync(tsx, [entry, 'alice', 'LUNDI', 'SOLEIL'], {
      encoding: 'utf8',
      env: { ...process.env, MUSIC_PROVIDER_ORDER: 'local' },
    });

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

describe('Channel added in the container', () => {
  it('fake channel registered in a child container -> used without touching WakeUpService', async () => {
    const { container } = setup();
    const child = container.createChildContainer();
    const fake = new FakeNotificationChannel('EMAIL');
    child.register(NOTIFICATION_CHANNEL, { useValue: fake });

    const result = await child
      .resolve<WakeUpUseCase>(WAKE_UP_USE_CASE)
      .trigger(createUserId('alice'), 'MONDAY', 'SUNNY');

    expect(result).toMatchObject({ status: 'DELIVERED', channel: 'EMAIL' });
    expect(fake.sent).toHaveLength(1);
  });
});

describe('Unknown user (real container)', () => {
  it('ghost -> FAILED USER_NOT_FOUND, error logged, no simulated delivery', async () => {
    const { container, writer } = setup();

    const result = await container
      .resolve<WakeUpUseCase>(WAKE_UP_USE_CASE)
      .trigger(createUserId('ghost'), 'MONDAY', 'SUNNY');

    expect(result).toMatchObject({ status: 'FAILED', reason: 'USER_NOT_FOUND' });
    const events = writer.entries().map((entry) => entry['event']);
    expect(events).toContain('wakeup.failed');
    expect(events).not.toContain('notification.simulated');
  });
});
