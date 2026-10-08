import type { DependencyContainer, InjectionToken } from 'tsyringe';

export interface ResolutionEdge {
  readonly from: unknown;
  readonly to: unknown;
}

/**
 * Records "token A needed token B" while the container builds objects, by wrapping `resolve` and
 * `resolveAll` (tsyringe resolves constructor parameters through `this.resolve`).
 */
export function trackResolutionEdges(container: DependencyContainer): ResolutionEdge[] {
  const edges: ResolutionEdge[] = [];
  const stack: unknown[] = [];
  for (const method of ['resolve', 'resolveAll'] as const) {
    const original = container[method].bind(container) as (...args: unknown[]) => unknown;
    Object.defineProperty(container, method, {
      value: (token: InjectionToken, ...rest: unknown[]): unknown => {
        const parent = stack.at(-1);
        if (parent !== undefined) {
          edges.push({ from: parent, to: token });
        }
        stack.push(token);
        try {
          return original(token, ...rest);
        } finally {
          stack.pop();
        }
      },
    });
  }
  return edges;
}
