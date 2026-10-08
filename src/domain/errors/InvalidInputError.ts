import { DomainError } from './DomainError.js';

export class InvalidInputError extends DomainError {
  override readonly name = 'InvalidInputError';
}
