/** Base of every typed domain error; never throw a bare string. */
export abstract class DomainError extends Error {
  override readonly name: string = 'DomainError';
}
