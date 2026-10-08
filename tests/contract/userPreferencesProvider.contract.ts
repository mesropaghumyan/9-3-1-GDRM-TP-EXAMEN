import { describe, expect, it } from 'vitest';
import {
  createUserId,
  UserNotFoundError,
  type UserPreferencesProvider,
} from '../../src/domain/index.js';

/** Contract every UserPreferencesProvider (mock or fake) must honour (CAP-2). */
export function userPreferencesProviderContract(
  name: string,
  create: () => UserPreferencesProvider,
  knownUser: string,
): void {
  describe(`UserPreferencesProvider contract: ${name}`, () => {
    it('known user -> weather tracks, fallback and preferred channel', async () => {
      const preferences = await create().get(createUserId(knownUser));

      expect(preferences.trackByWeather.size).toBeGreaterThan(0);
      expect(preferences.fallbackTrack.title).not.toBe('');
      expect(['EMAIL', 'SMS', 'PUSH']).toContain(preferences.preferredChannel);
    });

    it('unknown user -> UserNotFoundError', async () => {
      await expect(create().get(createUserId('nobody'))).rejects.toBeInstanceOf(UserNotFoundError);
    });
  });
}
