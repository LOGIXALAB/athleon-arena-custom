import { describe, it, expect } from "vitest";
import type { MatchContext, MatchEvent } from "../contract";
import { futsal, type FutsalState, type FutsalFormat } from "./module";

const FMT: FutsalFormat = { periodMinutes: 20, periods: 2, foulLimit: 5 };

function ctx(): MatchContext {
  return {
    teams: { A: { side: "A", name: "Falcons" }, B: { side: "B", name: "Sharks" } },
    players: {
      A: [{ id: "a1", name: "Ali" }],
      B: [{ id: "b1", name: "Bilal" }],
    },
  };
}

const apply = (s: FutsalState, events: MatchEvent[]) =>
  events.reduce((st, e) => futsal.reduce(st, e), s);

describe("futsal reducer", () => {
  it("tracks goals, fouls (with penalty warning) and a drawn result", () => {
    let s = futsal.init(FMT) as FutsalState;
    s = apply(s, [
      { type: "PERIOD_START", payload: { period: 1, at: "2026-06-15T13:00:00Z" } },
      { type: "GOAL", payload: { team: "A", playerId: "a1", at: "2026-06-15T13:05:00Z" } },
      { type: "GOAL", payload: { team: "A", at: "2026-06-15T13:06:00Z" } },
      { type: "GOAL", payload: { team: "B", at: "2026-06-15T13:07:00Z" } },
      { type: "FOUL", payload: { team: "A" } },
      { type: "FOUL", payload: { team: "A" } },
      { type: "FOUL", payload: { team: "A" } },
      { type: "FOUL", payload: { team: "A" } },
      { type: "FOUL", payload: { team: "A" } },
      { type: "FOUL", payload: { team: "A" } }, // 6th → over foulLimit
    ]);
    expect(s.score).toEqual({ A: 2, B: 1 });
    expect(s.foulsThisPeriod.A).toBe(6);

    const sb = futsal.scoreboard(s, ctx());
    const foulsA = sb.lines.find((l) => l.label === "Fouls A");
    expect(foulsA?.value).toContain("penalty");
    expect(sb.detail.sections[0].title).toContain("Falcons");

    s = apply(s, [
      { type: "PERIOD_END", payload: { at: "2026-06-15T13:20:00Z" } },
      { type: "PERIOD_START", payload: { period: 2, at: "2026-06-15T13:25:00Z" } },
      { type: "GOAL", payload: { team: "B", at: "2026-06-15T13:30:00Z" } },
      { type: "MATCH_END", payload: { at: "2026-06-15T13:45:00Z" } },
    ]);
    expect(s.phase).toBe("completed");
    expect(s.score).toEqual({ A: 2, B: 2 });
    const res = futsal.result(s, ctx());
    expect(res?.winner).toBe("tie");
  });

  it("resets fouls each period and clears between periods", () => {
    let s = futsal.init(FMT) as FutsalState;
    s = apply(s, [
      { type: "PERIOD_START", payload: { period: 1, at: "2026-06-15T13:00:00Z" } },
      { type: "FOUL", payload: { team: "B" } },
      { type: "PERIOD_END", payload: { at: "2026-06-15T13:20:00Z" } },
      { type: "PERIOD_START", payload: { period: 2, at: "2026-06-15T13:25:00Z" } },
    ]);
    expect(s.foulsThisPeriod.B).toBe(0);
    expect(s.phase).toBe("live");
  });
});
