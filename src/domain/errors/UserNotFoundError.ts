import { DomainError } from './DomainError.js';

export class UserNotFoundError extends DomainError {
  override readonly name = 'UserNotFoundError';
}
