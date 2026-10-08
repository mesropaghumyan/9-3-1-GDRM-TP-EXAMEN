import {
  DEFAULT_USER_PREFERENCES,
  InMemoryUserPreferencesProvider,
} from '../../src/infrastructure/preferences/index.js';
import { FakeUserPreferencesProvider } from '../fakes/FakeUserPreferencesProvider.js';
import { userPreferencesProviderContract } from './userPreferencesProvider.contract.js';

userPreferencesProviderContract(
  'InMemoryUserPreferencesProvider (mock)',
  () => new InMemoryUserPreferencesProvider(DEFAULT_USER_PREFERENCES),
  'alice',
);
userPreferencesProviderContract(
  'FakeUserPreferencesProvider',
  () => new FakeUserPreferencesProvider(DEFAULT_USER_PREFERENCES),
  'bob',
);
