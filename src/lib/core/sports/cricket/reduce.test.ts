import { describe, it, expect } from "vitest";
import type { MatchEvent, MatchContext } from "../contract";
import type { CricketFormat, CricketState } from "./types";
import { cricket } from "./module";

const FMT: CricketFormat = {
  oversPerInnings: 2,
  playersPerSide: 3,
  ballsPerOver: 6,
  lastManStands: false,
  wideRuns: 1,
  noBallRuns: 1,
  maxOversPerBowler: null,
};

function apply(state: CricketState, events: MatchEvent[]): CricketState {
  return events.reduce((s, e) => cricket.reduce(s, e), state);
}

const ball = (p: Record<string, unknown>): MatchEvent => ({ type: "BALL", payload: p });

function ctx(): MatchContext {
  const mk = (ids: string[]) =>
    ids.map((id, i) => ({ id, name: id.toUpperCase(), jerseyNo: i + 1 }));
  return {
    teams: { A: { side: "A", name: "Lions" }, B: { side: "B", name: "Tigers" } },
    players: { A: mk(["a1", "a2", "a3"]), B: mk(["b1", "b2", "b3"]) },
  };
}

describe("cricket reducer — first over with a wide", () => {
  it("tallies runs, balls, extras and flags a new bowler", () => {
    let s = cricket.init(FMT) as CricketState;
    s = apply(s, [
      { type: "TOSS", payload: { wonBy: "A", decision: "bat" } },
      {
        type: "INNINGS_START",
        payload: { battingSide: "A", strikerId: "a1", nonStrikerId: "a2", bowlerId: "b1" },
      },
      ball({ batRuns: 1 }),
      ball({ batRuns: 4 }),
      ball({ batRuns: 0 }),
      ball({ batRuns: 0, extra: { kind: "wide", runs: 0 } }),
      ball({ batRuns: 2 }),
      ball({ batRuns: 1 }),
      ball({ batRuns: 1 }), // 6th legal ball → over complete
    ]);
    const inn = s.innings[0];
    expect(inn.runs).toBe(10);
    expect(inn.legalBalls).toBe(6);
    expect(inn.wickets).toBe(0);
    expect(inn.extras).toBe(1);
    expect(s.needsNewBowler).toBe(true);
    expect(s.phase).toBe("live");
  });
});

describe("cricket reducer — full innings with wickets, all out closes", () => {
  it("sets the target after innings 1", () => {
    let s = cricket.init(FMT) as CricketState;
    s = apply(s, [
      { type: "INNINGS_START", payload: { battingSide: "A", strikerId: "a1", nonStrikerId: "a2", bowlerId: "b1" } },
      ball({ batRuns: 6 }),
      ball({ batRuns: 6 }),
      ball({ batRuns: 0 }),
      ball({ batRuns: 0 }),
      ball({ batRuns: 0 }),
      ball({ batRuns: 0 }), // over 1 complete, 12 runs
    ]);
    expect(s.needsNewBowler).toBe(true);
    s = apply(s, [{ type: "NEW_BOWLER", payload: { playerId: "b2" } }]);

    // over 2: wicket then all out
    s = apply(s, [
      ball({ batRuns: 0, wicket: { kind: "bowled", batterOut: "striker" } }),
    ]);
    expect(s.needsNewBatter).toBe(true);
    expect(s.innings[0].wickets).toBe(1);
    s = apply(s, [{ type: "NEW_BATTER", payload: { playerId: "a3", end: "striker" } }]);
    s = apply(s, [
      ball({ batRuns: 4 }),
      // run out the non-striker → 2nd wicket → all out (playersPerSide-1 = 2)
      ball({ batRuns: 0, wicket: { kind: "run_out", batterOut: "non_striker" } }),
    ]);
    expect(s.innings[0].wickets).toBe(2);
    expect(s.phase).toBe("between_innings");
    expect(s.target).toBe(s.innings[0].runs + 1);
    // run_out does not credit the bowler
    const bowlerWkts = Object.values(s.innings[0].bowlers).reduce((n, b) => n + b.wickets, 0);
    expect(bowlerWkts).toBe(1);
  });
});

describe("cricket reducer — second innings chase produces a result", () => {
  it("declares the chasing side the winner by wickets", () => {
    let s = cricket.init(FMT) as CricketState;
    // innings 1: score 16 then all out for a target of 17
    s = apply(s, [
      { type: "INNINGS_START", payload: { battingSide: "A", strikerId: "a1", nonStrikerId: "a2", bowlerId: "b1" } },
      ball({ batRuns: 6 }),
      ball({ batRuns: 6 }),
      ball({ batRuns: 4, wicket: { kind: "caught", batterOut: "striker" } }),
    ]);
    s = apply(s, [{ type: "NEW_BATTER", payload: { playerId: "a3", end: "striker" } }]);
    s = apply(s, [ball({ batRuns: 0, wicket: { kind: "bowled", batterOut: "striker" } })]);
    expect(s.phase).toBe("between_innings");
    const target = s.target!;

    s = apply(s, [
      { type: "INNINGS_START", payload: { battingSide: "B", strikerId: "b1", nonStrikerId: "b2", bowlerId: "a1" } },
      ball({ batRuns: 6 }),
      ball({ batRuns: 6 }),
      ball({ batRuns: 6 }), // 18 >= 17 → chased
    ]);
    expect(s.phase).toBe("completed");
    expect(s.innings[1].runs).toBeGreaterThanOrEqual(target);
    expect(s.resultSummary).toContain("won by");

    const res = cricket.result(s, ctx());
    expect(res?.winner).toBe("B");
    expect(res?.summary).toContain("Tigers");
  });
});

describe("cricket reducer — won by runs and tie", () => {
  const playInnings1 = (s: CricketState) =>
    apply(s, [
      { type: "INNINGS_START", payload: { battingSide: "A", strikerId: "a1", nonStrikerId: "a2", bowlerId: "b1" } },
      ball({ batRuns: 6 }),
      ball({ batRuns: 4 }),
      ball({ batRuns: 0, wicket: { kind: "bowled", batterOut: "striker" } }),
    ]);

  it("won by runs when the chase falls short and overs run out", () => {
    let s = cricket.init({ ...FMT, oversPerInnings: 1 }) as CricketState;
    s = playInnings1(s);
    s = apply(s, [{ type: "NEW_BATTER", payload: { playerId: "a3", end: "striker" } }]);
    s = apply(s, [ball({ batRuns: 1 }), ball({ batRuns: 1 }), ball({ batRuns: 1 })]); // over ends (1 over)
    // innings 1 ends at 1 over; target = runs+1
    const target = s.target!;
    expect(s.phase).toBe("between_innings");

    s = apply(s, [
      { type: "INNINGS_START", payload: { battingSide: "B", strikerId: "b1", nonStrikerId: "b2", bowlerId: "a1" } },
      ball({ batRuns: 1 }),
      ball({ batRuns: 1 }),
      ball({ batRuns: 1 }),
      ball({ batRuns: 1 }),
      ball({ batRuns: 1 }),
      ball({ batRuns: 0 }), // 1 over done, 5 runs < target
    ]);
    expect(s.phase).toBe("completed");
    expect(s.innings[1].runs).toBeLessThan(target);
    expect(s.resultSummary).toContain("runs");
  });
});

describe("cricket validation guards", () => {
  it("rejects a BALL while a new batter is due", () => {
    let s = cricket.init(FMT) as CricketState;
    s = apply(s, [
      { type: "INNINGS_START", payload: { battingSide: "A", strikerId: "a1", nonStrikerId: "a2", bowlerId: "b1" } },
      ball({ batRuns: 0, wicket: { kind: "bowled", batterOut: "striker" } }),
    ]);
    expect(s.needsNewBatter).toBe(true);
    const v = cricket.validate(s, ball({ batRuns: 1 }), ctx());
    expect(v.ok).toBe(false);
  });

  it("rejects the same bowler bowling consecutive overs", () => {
    let s = cricket.init(FMT) as CricketState;
    s = apply(s, [
      { type: "INNINGS_START", payload: { battingSide: "A", strikerId: "a1", nonStrikerId: "a2", bowlerId: "b1" } },
      ball({ batRuns: 0 }), ball({ batRuns: 0 }), ball({ batRuns: 0 }),
      ball({ batRuns: 0 }), ball({ batRuns: 0 }), ball({ batRuns: 0 }),
    ]);
    expect(s.needsNewBowler).toBe(true);
    const v = cricket.validate(s, { type: "NEW_BOWLER", payload: { playerId: "b1" } }, ctx());
    expect(v.ok).toBe(false);
  });
});

describe("cricket scoreboard — detail sections for the display", () => {
  it("emits batting + bowling tables", () => {
    let s = cricket.init(FMT) as CricketState;
    s = apply(s, [
      { type: "INNINGS_START", payload: { battingSide: "A", strikerId: "a1", nonStrikerId: "a2", bowlerId: "b1" } },
      ball({ batRuns: 4 }),
    ]);
    const sb = cricket.scoreboard(s, ctx());
    expect(sb.headline.home.name).toBe("Lions");
    expect(sb.detail.sections.length).toBeGreaterThanOrEqual(2);
    expect(sb.detail.sections[0].title).toContain("Batting");
    expect(sb.detail.sections[0].rows[0][0]).toBe("A1"); // resolved name
  });
});
