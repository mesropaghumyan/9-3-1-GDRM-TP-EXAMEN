import type { UserId, UserPreferences } from '../model/index.js';

export interface UserPreferencesProvider {
  /** @throws UserNotFoundError | PreferencesUnavailableError */
  get(userId: UserId, signal?: AbortSignal): Promise<UserPreferences>;
}
export const USER_PREFERENCES_PROVIDER = Symbol('UserPreferencesProvider');
