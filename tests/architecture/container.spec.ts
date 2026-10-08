import { describe, expect, it } from 'vitest';
import { container as rootContainer, inject, injectable } from 'tsyringe';
import { WAKE_UP_USE_CASE, type WakeUpUseCase } from '../../src/application/index.js';
import { MUSIC_PROVIDER, NOTIFICATION_CHANNEL } from '../../src/domain/index.js';
import { loadConfig } from '../../src/infrastructure/config/index.js';
import { buildContainer, SINGLETON_TOKENS, TRANSIENT_TOKENS } from '../../src/main/container.js';
import { trackResolutionEdges } from './trackResolutionEdges.js';

const config = loadConfig({});
const MULTI_VALUED: readonly unknown[] = [MUSIC_PROVIDER, NOTIFICATION_CHANNEL];

function resolveEverything(c: ReturnType<typeof buildContainer>): void {
  for (const token of [...SINGLETON_TOKENS, ...TRANSIENT_TOKENS]) {
    if (MULTI_VALUED.includes(token)) {
      c.resolveAll(token as symbol);
    } else {
      c.resolve(token as symbol);
    }
  }
}

describe('Production container', () => {
  it('resolve(WAKE_UP_USE_CASE) -> the whole graph builds', () => {
    expect(() => buildContainer(config).resolve<WakeUpUseCase>(WAKE_UP_USE_CASE)).not.toThrow();
  });

  it('declared singletons -> same instance every time; transients -> a new one', () => {
    const c = buildContainer(config);
    const pick = (token: unknown): unknown =>
      MULTI_VALUED.includes(token) ? c.resolveAll(token as symbol) : c.resolve(token as symbol);

    for (const token of SINGLETON_TOKENS) {
      const [first, second] = [pick(token), pick(token)];
      expect(
        Array.isArray(first)
          ? first.every((item, i) => item === (second as unknown[])[i])
          : first === second,
      ).toBe(true);
    }
    for (const token of TRANSIENT_TOKENS) {
      const [first, second] = [pick(token), pick(token)];
      expect(
        Array.isArray(first)
          ? first.some((item, i) => item !== (second as unknown[])[i])
          : first !== second,
      ).toBe(true);
    }
  });

  it('no singleton captures a transient dependency', () => {
    const c = buildContainer(config);
    const edges = trackResolutionEdges(c);
    resolveEverything(c);

    expect(edges.length).toBeGreaterThan(10);
    const captive = edges.filter(
      (edge) => SINGLETON_TOKENS.includes(edge.from) && TRANSIENT_TOKENS.includes(edge.to),
    );
    expect(captive).toEqual([]);
  });

  it('detector sanity check -> flags a singleton built from a transient', () => {
    const TRANSIENT = Symbol('Transient');
    const SINGLETON = Symbol('Singleton');
    @injectable()
    class Short {
      readonly marker = 'short-lived';
    }
    @injectable()
    class Long {
      constructor(@inject(TRANSIENT) readonly short: Short) {}
    }
    const c = rootContainer.createChildContainer();
    c.register(TRANSIENT, { useClass: Short });
    c.registerSingleton(SINGLETON, Long);
    const edges = trackResolutionEdges(c);

    c.resolve(SINGLETON);

    expect(edges).toContainEqual({ from: SINGLETON, to: TRANSIENT });
  });
});
