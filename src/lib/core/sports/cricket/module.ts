import type { MatchContext, MatchResult, SportModule } from "../contract";
import type { CricketFormat, CricketState } from "./types";
import { reduce } from "./reduce";
import { validate } from "./validate";
import { scoreboard, summary } from "./scoreboard";

export const INDOOR_8_OVER: CricketFormat = {
  oversPerInnings: 8,
  playersPerSide: 6,
  ballsPerOver: 6,
  lastManStands: true,
  wideRuns: 2,
  noBallRuns: 2,
  maxOversPerBowler: 2,
};

const T6: CricketFormat = {
  oversPerInnings: 6,
  playersPerSide: 6,
  ballsPerOver: 6,
  lastManStands: true,
  wideRuns: 1,
  noBallRuns: 1,
  maxOversPerBowler: 2,
};

const T10: CricketFormat = {
  oversPerInnings: 10,
  playersPerSide: 8,
  ballsPerOver: 6,
  lastManStands: false,
  wideRuns: 1,
  noBallRuns: 1,
  maxOversPerBowler: 3,
};

export function init(format: unknown): CricketState {
  return {
    format: format as CricketFormat,
    toss: null,
    innings: [],
    current: 0,
    target: null,
    needsNewBatter: false,
    needsNewBowler: false,
    phase: "setup",
    resultSummary: null,
    lastHighlight: null,
  };
}

function result(s: CricketState, ctx: MatchContext): MatchResult | null {
  if (s.phase !== "completed") return null;
  const summaryText = s.resultSummary ?? "Match complete";
  const first = s.innings[0];
  const second = s.innings[1];
  let winner: MatchResult["winner"] = null;
  if (first && second) {
    if (second.runs > first.runs) winner = second.battingSide;
    else if (first.runs > second.runs) winner = first.battingSide;
    else winner = "tie";
  }
  // resolve to team name where possible
  const named =
    winner === "A" || winner === "B"
      ? summaryText.replace(`Team ${winner}`, ctx.teams[winner]?.name ?? `Team ${winner}`)
      : summaryText;
  return { winner, summary: named };
}

export const cricket: SportModule<CricketState> = {
  key: "cricket",
  name: "Cricket",
  defaultFormats: [
    { id: "indoor8", label: "Indoor · 8 overs · 6-a-side", config: INDOOR_8_OVER },
    { id: "t6", label: "Quick · 6 overs", config: T6 },
    { id: "t10", label: "T10 · 8-a-side", config: T10 },
  ],
  rosterRoles: ["Batsman", "Bowler", "All-rounder", "Wicketkeeper"],
  init: (format) => init(format),
  validate: (state, event) => validate(state, event),
  reduce,
  scoreboard: (state, ctx) => scoreboard(state, ctx),
  summary: (state, ctx) => summary(state, ctx),
  isComplete: (state) => state.phase === "completed",
  result,
  scorerUI: { kind: "custom", componentKey: "CricketPanel" },
};
