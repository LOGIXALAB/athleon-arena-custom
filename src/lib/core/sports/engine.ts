/**
 * Sport-agnostic engine wrapper. Pure: folds the event log through the
 * module's reducer. IO (persistence, realtime) lives in the API route, not here.
 */
import type { MatchContext, MatchEvent, SportModule, StoredEvent } from "./contract";

/** Single source of truth: fold non-reverted events through the reducer. */
export function deriveState<S>(
  mod: SportModule<S>,
  format: unknown,
  ctx: MatchContext,
  events: StoredEvent[],
): S {
  return events
    .filter((e) => e.revertedBySeq === null)
    .slice()
    .sort((a, b) => a.seq - b.seq)
    .reduce<S>((s, e) => mod.reduce(s, e), mod.init(format, ctx));
}

/** Derive state, then validate an incoming event against it. */
export function checkEvent<S>(
  mod: SportModule<S>,
  format: unknown,
  ctx: MatchContext,
  events: StoredEvent[],
  incoming: MatchEvent,
): { state: S; result: ReturnType<SportModule<S>["validate"]> } {
  const state = deriveState(mod, format, ctx, events);
  return { state, result: mod.validate(state, incoming, ctx) };
}
