import { DomainError } from './DomainError.js';

export class PreferencesUnavailableError extends DomainError {
  override readonly name = 'PreferencesUnavailableError';
}
