import { Effect, Layer } from 'effect';

/** The composition point for future services, repositories, and adapters. */
export const applicationLayer = Layer.empty;

export function runApplication<A>(effect: Effect.Effect<A>) {
  return Effect.runPromise(effect.pipe(Effect.provide(applicationLayer)));
}
