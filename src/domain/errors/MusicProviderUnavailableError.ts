import { DomainError } from './DomainError.js';

export class MusicProviderUnavailableError extends DomainError {
  override readonly name = 'MusicProviderUnavailableError';
}
