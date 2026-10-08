import { describe, expect, it } from 'vitest';
import {
  DomainError,
  InvalidInputError,
  MusicProviderUnavailableError,
  NotificationDeliveryError,
  PreferencesUnavailableError,
  UserNotFoundError,
} from '../../../src/domain/index.js';

describe('Domain errors', () => {
  it.each([
    InvalidInputError,
    MusicProviderUnavailableError,
    NotificationDeliveryError,
    PreferencesUnavailableError,
    UserNotFoundError,
  ])('%o -> DomainError carrying its class name and cause', (ErrorClass) => {
    const cause = new Error('root');

    const error = new ErrorClass('boom', { cause });

    expect(error).toBeInstanceOf(DomainError);
    expect(error.name).toBe(ErrorClass.name);
    expect(error.cause).toBe(cause);
  });
});
