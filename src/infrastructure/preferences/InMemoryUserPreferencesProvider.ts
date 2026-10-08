import { inject, injectable } from 'tsyringe';
import {
  UserNotFoundError,
  type UserId,
  type UserPreferences,
  type UserPreferencesProvider,
} from '../../domain/index.js';
import { USER_PREFERENCES_DATA } from '../tokens.js';

/** Mock of the internal preferences service, reached only through its port. */
@injectable()
export class InMemoryUserPreferencesProvider implements UserPreferencesProvider {
  constructor(
    @inject(USER_PREFERENCES_DATA)
    private readonly users: ReadonlyMap<string, UserPreferences>,
  ) {}

  get(userId: UserId): Promise<UserPreferences> {
    const preferences = this.users.get(userId);
    if (preferences === undefined) {
      return Promise.reject(new UserNotFoundError(`unknown user: ${userId}`));
    }
    return Promise.resolve(preferences);
  }
}
