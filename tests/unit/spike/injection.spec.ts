import { container, inject, injectable } from 'tsyringe';
import { describe, expect, it } from 'vitest';

interface Greeter {
  greet(): string;
}
const GREETER = Symbol('Greeter');

@injectable()
class FixedGreeter implements Greeter {
  greet(): string {
    return 'hello';
  }
}

@injectable()
class Consumer {
  constructor(@inject(GREETER) private readonly greeter: Greeter) {}
  run(): string {
    return this.greeter.greet();
  }
}

describe('Injection spike', () => {
  it('resolves an interface parameter through @inject(TOKEN) without emitDecoratorMetadata -> dependency injected', () => {
    const child = container.createChildContainer();
    child.register(GREETER, { useClass: FixedGreeter });

    const consumer = child.resolve(Consumer);

    expect(consumer.run()).toBe('hello');
  });
});
