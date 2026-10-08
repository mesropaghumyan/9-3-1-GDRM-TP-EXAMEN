import {
  UserNotFoundError,
  type UserId,
  type UserPreferences,
  type UserPreferencesProvider,
} from '../../src/domain/index.js';

export class FakeUserPreferencesProvider implements UserPreferencesProvider {
  readonly signals: (AbortSignal | undefined)[] = [];

  constructor(private readonly users: ReadonlyMap<string, UserPreferences>) {}

  get(userId: UserId, signal?: AbortSignal): Promise<UserPreferences> {
    this.signals.push(signal);
    const preferences = this.users.get(userId);
    return preferences === undefined
      ? Promise.reject(new UserNotFoundError(userId))
      : Promise.resolve(preferences);
  }
}
