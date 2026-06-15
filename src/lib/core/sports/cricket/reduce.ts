import type { MatchEvent } from "../contract";
import type {
  BallPayload,
  BatterCard,
  BowlerCard,
  CricketState,
  InningsState,
} from "./types";

// ---- helpers ---------------------------------------------------------------

const newBatter = (playerId: string): BatterCard => ({
  playerId,
  runs: 0,
  balls: 0,
  fours: 0,
  sixes: 0,
  out: false,
});

const newBowler = (playerId: string): BowlerCard => ({
  playerId,
  balls: 0,
  runsConceded: 0,
  wickets: 0,
});

const cur = (s: CricketState): InningsState => s.innings[s.current];

function setCur(s: CricketState, inn: InningsState): CricketState {
  const innings = s.innings.slice();
  innings[s.current] = inn;
  return { ...s, innings };
}

// structuredClone is available in Node 18+ and modern browsers
const clone = <T>(x: T): T => structuredClone(x);

export function overStr(legalBalls: number, ballsPerOver: number): string {
  return `${Math.floor(legalBalls / ballsPerOver)}.${legalBalls % ballsPerOver}`;
}

function glyph(p: BallPayload): string {
  if (p.wicket) return "W";
  if (p.extra?.kind === "wide") return `wd${p.extra.runs ? "+" + p.extra.runs : ""}`;
  if (p.extra?.kind === "no_ball") return `nb${p.batRuns ? "+" + p.batRuns : ""}`;
  if (p.extra?.kind === "bye") return `b${p.extra.runs}`;
  if (p.extra?.kind === "leg_bye") return `lb${p.extra.runs}`;
  if (p.batRuns === 0) return "·";
  return String(p.batRuns);
}

function swapEnds(inn: InningsState) {
  const tmp = inn.strikerId;
  inn.strikerId = inn.nonStrikerId ?? "";
  inn.nonStrikerId = tmp;
}

// ---- reducer ---------------------------------------------------------------

export function reduce(s: CricketState, e: MatchEvent): CricketState {
  switch (e.type) {
    case "TOSS": {
      const p = e.payload as { wonBy: "A" | "B"; decision: "bat" | "bowl" };
      return { ...s, toss: { wonBy: p.wonBy, decision: p.decision } };
    }
    case "INNINGS_START": {
      const p = e.payload as {
        battingSide: "A" | "B";
        strikerId: string;
        nonStrikerId: string | null;
        bowlerId: string;
      };
      const batters: Record<string, BatterCard> = {
        [p.strikerId]: newBatter(p.strikerId),
      };
      const order = [p.strikerId];
      if (p.nonStrikerId) {
        batters[p.nonStrikerId] = newBatter(p.nonStrikerId);
        order.push(p.nonStrikerId);
      }
      const innings: InningsState = {
        battingSide: p.battingSide,
        runs: 0,
        wickets: 0,
        legalBalls: 0,
        extras: 0,
        strikerId: p.strikerId,
        nonStrikerId: p.nonStrikerId,
        bowlerId: p.bowlerId,
        prevOverBowlerId: null,
        batters,
        bowlers: { [p.bowlerId]: newBowler(p.bowlerId) },
        battingOrder: order,
        fallOfWickets: [],
        recentBalls: [],
        closed: false,
      };
      return {
        ...s,
        innings: [...s.innings, innings],
        current: s.innings.length,
        phase: "live",
        needsNewBatter: false,
        needsNewBowler: false,
        lastHighlight: null,
      };
    }
    case "BALL":
      return applyBall(s, e.payload as unknown as BallPayload);
    case "NEW_BATTER": {
      const p = e.payload as { playerId: string; end: "striker" | "non_striker" };
      const inn = clone(cur(s));
      inn.batters[p.playerId] = newBatter(p.playerId);
      inn.battingOrder.push(p.playerId);
      if (p.end === "striker") inn.strikerId = p.playerId;
      else inn.nonStrikerId = p.playerId;
      return setCur({ ...s, needsNewBatter: false }, inn);
    }
    case "NEW_BOWLER": {
      const p = e.payload as { playerId: string };
      const inn = clone(cur(s));
      inn.prevOverBowlerId = inn.bowlerId;
      inn.bowlerId = p.playerId;
      if (!inn.bowlers[p.playerId]) inn.bowlers[p.playerId] = newBowler(p.playerId);
      return setCur({ ...s, needsNewBowler: false }, inn);
    }
    case "INNINGS_END":
      return closeInnings(s);
    case "MATCH_END":
      return {
        ...s,
        phase: "completed",
        resultSummary:
          (e.payload as { summary?: string }).summary ?? s.resultSummary,
      };
    default:
      return s; // unknown events never crash derivation
  }
}

function applyBall(s: CricketState, p: BallPayload): CricketState {
  const f = s.format;
  const inn = clone(cur(s));
  const isWide = p.extra?.kind === "wide";
  const isNoBall = p.extra?.kind === "no_ball";
  const isLegal = !isWide && !isNoBall;
  const extraRan = p.extra?.runs ?? 0;
  const penalty = isWide ? f.wideRuns : isNoBall ? f.noBallRuns : 0;

  // 1. team runs + extras
  inn.runs += p.batRuns + extraRan + penalty;
  inn.extras += penalty + extraRan;

  // 2. striker card
  const striker = inn.batters[inn.strikerId];
  if (striker) {
    if (!isWide) striker.balls += 1; // no-ball counts as faced, wide doesn't
    striker.runs += p.batRuns;
    if (p.batRuns === 4) striker.fours += 1;
    if (p.batRuns === 6) striker.sixes += 1;
  }

  // 3. bowler figures
  const bowler = inn.bowlers[inn.bowlerId];
  if (bowler) {
    if (isLegal) bowler.balls += 1;
    let charged = p.batRuns;
    if (isWide) charged += penalty + extraRan;
    else if (isNoBall) charged += penalty; // byes off a no-ball not charged
    bowler.runsConceded += charged;
  }

  // 4. over progression
  if (isLegal) inn.legalBalls += 1;
  const overComplete = isLegal && inn.legalBalls % f.ballsPerOver === 0;

  // 5. wicket
  let needsNewBatter = false;
  if (p.wicket) {
    inn.wickets += 1;
    const outId = p.wicket.batterOut === "striker" ? inn.strikerId : inn.nonStrikerId;
    if (outId && inn.batters[outId]) {
      inn.batters[outId].out = true;
      inn.batters[outId].outBy = p.wicket.kind;
    }
    inn.fallOfWickets.push({
      score: inn.runs,
      over: overStr(inn.legalBalls, f.ballsPerOver),
      playerId: outId ?? "",
    });
    if (!["run_out", "retired"].includes(p.wicket.kind) && bowler) bowler.wickets += 1;

    const lastMan = f.lastManStands && inn.wickets === f.playersPerSide - 1;
    if (lastMan) {
      // last batter stands alone — keep the survivor on strike, no new batter
      const survivor =
        p.wicket.batterOut === "striker" ? inn.nonStrikerId : inn.strikerId;
      inn.strikerId = survivor ?? "";
      inn.nonStrikerId = null;
    } else {
      if (p.wicket.batterOut === "striker") inn.strikerId = "";
      else inn.nonStrikerId = "";
      needsNewBatter = true;
    }
  }

  // 6. strike rotation
  const ran = p.batRuns + extraRan;
  if (!p.wicket) {
    const rotate = (ran % 2 === 1) !== overComplete; // XOR
    if (rotate && inn.nonStrikerId !== null) swapEnds(inn);
  } else if (overComplete && inn.nonStrikerId !== null) {
    swapEnds(inn);
  }

  // 7. ticker glyph
  inn.recentBalls = [...inn.recentBalls, glyph(p)].slice(-8);

  // 8. termination
  if (overComplete) inn.prevOverBowlerId = inn.bowlerId;

  let next: CricketState = setCur(
    {
      ...s,
      needsNewBatter,
      needsNewBowler: overComplete,
      lastHighlight: p.wicket ? "wicket" : p.batRuns >= 4 ? "boundary" : null,
    },
    inn,
  );

  const wicketsLimit = f.lastManStands ? f.playersPerSide : f.playersPerSide - 1;
  const allOut = inn.wickets >= wicketsLimit;
  const oversDone = inn.legalBalls >= f.oversPerInnings * f.ballsPerOver;
  const chased = s.current === 1 && s.target !== null && inn.runs >= s.target;

  if (allOut || oversDone || chased) {
    next = closeInnings(next);
  }
  return next;
}

function sideLabel(side: "A" | "B"): string {
  return side === "A" ? "Team A" : "Team B";
}

function closeInnings(s: CricketState): CricketState {
  const inn = clone(cur(s));
  inn.closed = true;
  const next = setCur(s, inn);

  if (s.current === 0) {
    return {
      ...next,
      target: inn.runs + 1,
      phase: "between_innings",
      needsNewBatter: false,
      needsNewBowler: false,
    };
  }

  // second innings closed → result
  const first = next.innings[0];
  const second = inn;
  const f = next.format;
  let summary: string;
  if (second.runs >= (next.target ?? Infinity)) {
    const wktsLeft =
      (f.lastManStands ? f.playersPerSide : f.playersPerSide - 1) - second.wickets;
    summary = `${sideLabel(second.battingSide)} won by ${wktsLeft} wicket${wktsLeft === 1 ? "" : "s"}`;
  } else if (second.runs === first.runs) {
    summary = "Match tied";
  } else {
    summary = `${sideLabel(first.battingSide)} won by ${first.runs - second.runs} runs`;
  }
  return { ...next, phase: "completed", resultSummary: summary };
}
