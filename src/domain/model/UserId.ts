import { InvalidInputError } from '../errors/index.js';

export type UserId = string & { readonly __brand: 'UserId' };

/** Invariant: a user id is a non-blank string. */
export function createUserId(raw: string): UserId {
  const trimmed = raw.trim();
  if (trimmed === '') {
    throw new InvalidInputError('userId must not be empty or blank');
  }
  // Why: the brand only exists at the type level; this is the single place that mints a UserId.
  return trimmed as UserId;
}
