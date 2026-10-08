import { describe, expect, it } from 'vitest';
import { createTrack, createUserId, InvalidInputError } from '../../../src/domain/index.js';

describe('Track', () => {
  it('serialized -> keys are exactly title and artist', () => {
    const track = createTrack('Here Comes the Sun', 'The Beatles');

    expect(Object.keys(JSON.parse(JSON.stringify(track)) as object)).toEqual(['title', 'artist']);
  });

  it('created -> immutable', () => {
    expect(Object.isFrozen(createTrack('a', 'b'))).toBe(true);
  });
});

describe('createUserId', () => {
  it('valid id -> returned trimmed', () => {
    expect(createUserId('  alice ')).toBe('alice');
  });

  it.each(['', '   ', '\t\n'])('blank id %j -> InvalidInputError', (raw) => {
    expect(() => createUserId(raw)).toThrow(InvalidInputError);
  });
});

describe('InvalidInputError', () => {
  it('thrown -> typed domain error with name', () => {
    const error = new InvalidInputError('x');

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('InvalidInputError');
  });
});
