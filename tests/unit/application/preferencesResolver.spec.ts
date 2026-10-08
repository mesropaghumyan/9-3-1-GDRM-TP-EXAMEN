import { describe, expect, it } from 'vitest';
import { PreferencesResolver } from '../../../src/application/index.js';
import {
  createUserId,
  UserNotFoundError,
  type UserPreferences,
  type UserPreferencesProvider,
} from '../../../src/domain/index.js';
import { RecordingLogger } from '../../fakes/RecordingLogger.js';

const known: UserPreferences = {
  trackByWeather: new Map(),
  fallbackTrack: { title: 'Known' },
  preferredChannel: 'SMS',
};
const defaults: UserPreferences = {
  ...known,
  fallbackTrack: { title: 'Default' },
  preferredChannel: 'EMAIL',
};
const alice = createUserId('alice');

const failing = (error: unknown): UserPreferencesProvider => ({
  // Why: the failure value is injected by the test and may deliberately not be an Error.
  // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
  get: () => Promise.reject(error),
});

describe('PreferencesResolver', () => {
  it('known user -> preferences, not degraded', async () => {
    const resolver = new PreferencesResolver(
      { get: () => Promise.resolve(known) },
      defaults,
      new RecordingLogger(),
    );

    expect(await resolver.resolve(alice)).toEqual({
      kind: 'FOUND',
      preferences: known,
      degraded: false,
    });
  });

  it('unknown user -> USER_NOT_FOUND outcome, no default substituted', async () => {
    const resolver = new PreferencesResolver(
      failing(new UserNotFoundError('x')),
      defaults,
      new RecordingLogger(),
    );

    expect(await resolver.resolve(alice)).toEqual({ kind: 'USER_NOT_FOUND' });
  });

  it.each([new Error('boom'), 'plain string'])(
    'service failing with %j -> default preferences, degraded, warn logged',
    async (error) => {
      const logger = new RecordingLogger();
      const resolver = new PreferencesResolver(failing(error), defaults, logger);

      expect(await resolver.resolve(alice)).toEqual({
        kind: 'FOUND',
        preferences: defaults,
        degraded: true,
      });
      expect(logger.events('warn')).toEqual(['preferences.unavailable']);
    },
  );

  it('cancellation -> rethrown, not disguised as an unavailable service', async () => {
    const controller = new AbortController();
    controller.abort();
    const abort = new Error('aborted');
    const resolver = new PreferencesResolver(failing(abort), defaults, new RecordingLogger());

    await expect(resolver.resolve(alice, controller.signal)).rejects.toBe(abort);
  });
});
