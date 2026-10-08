import {
  UserNotFoundError,
  type Logger,
  type UserId,
  type UserPreferences,
  type UserPreferencesProvider,
} from '../domain/index.js';

export type PreferencesLookup =
  | { readonly kind: 'FOUND'; readonly preferences: UserPreferences; readonly degraded: boolean }
  | { readonly kind: 'USER_NOT_FOUND' };

/**
 * Wraps the preferences port: an unknown user is an outcome (RG-09); an unavailable service
 * falls back to the configured default preferences and degrades the wake-up (RG-10).
 * Built by the composition root because the defaults come from configuration.
 */
export class PreferencesResolver {
  constructor(
    private readonly provider: UserPreferencesProvider,
    private readonly defaults: UserPreferences,
    private readonly logger: Logger,
  ) {}

  async resolve(userId: UserId, signal?: AbortSignal): Promise<PreferencesLookup> {
    try {
      return {
        kind: 'FOUND',
        preferences: await this.provider.get(userId, signal),
        degraded: false,
      };
    } catch (error) {
      if (error instanceof UserNotFoundError) {
        return { kind: 'USER_NOT_FOUND' };
      }
      // Why: cancellation must not be disguised as "service unavailable".
      if (signal?.aborted === true) {
        throw error;
      }
      const cause = error instanceof Error ? error.message : 'unknown-error';
      this.logger.warn('preferences.unavailable', { cause, fallback: 'default-preferences' });
      return { kind: 'FOUND', preferences: this.defaults, degraded: true };
    }
  }
}
