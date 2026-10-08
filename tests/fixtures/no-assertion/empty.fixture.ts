import { it } from 'vitest';

it('a test that asserts nothing', () => {
  const unused = 1 + 1;
  void unused;
});
