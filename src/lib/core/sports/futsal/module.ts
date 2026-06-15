import type {
  MatchContext,
  MatchEvent,
  MatchResult,
  ScoreboardModel,
  SportModule,
  ValidationResult,
} from "../contract";

export interface FutsalFormat {
  periodMinutes: number;
  periods: number;
  foulLimit: number; // e.g. 5 → 6th foul = direct penalty
}

export interface FutsalGoal {
  team: "A" | "B";
  playerId?: string;
  ownGoal?: boolean;
  atMs: number;
}

export interface FutsalCard {
  team: "A" | "B";
  playerId?: string;
  color: "yellow" | "red";
  atMs: number;
}

export interface FutsalState {
  format: FutsalFormat;
  score: { A: number; B: number };
  foulsThisPeriod: { A: number; B: number };
  cards: FutsalCard[];
  goals: FutsalGoal[];
  period: number;
  clock: { running: boolean; startedAt: string | null; bankedMs: number };
  phase: "setup" | "live" | "break" | "completed";
}

const T = (e: MatchEvent) => (e.payload as { team: "A" | "B" }).team;
const atOf = (e: MatchEvent) => {
  const at = (e.payload as { at?: string }).at;
  return at ? Date.parse(at) : 0;
};

function elapsedMs(s: FutsalState, e: MatchEvent): number {
  const banked = s.clock.bankedMs;
  if (s.clock.running && s.clock.startedAt) {
    return banked + Math.max(0, atOf(e) - Date.parse(s.clock.startedAt));
  }
  return banked;
}

function bank(s: FutsalState, e: MatchEvent): FutsalState["clock"] {
  if (s.clock.running && s.clock.startedAt) {
    const add = Math.max(0, atOf(e) - Date.parse(s.clock.startedAt));
    return { running: false, startedAt: null, bankedMs: s.clock.bankedMs + add };
  }
  return { ...s.clock, running: false, startedAt: null };
}

export function init(format: unknown): FutsalState {
  return {
    format: format as FutsalFormat,
    score: { A: 0, B: 0 },
    foulsThisPeriod: { A: 0, B: 0 },
    cards: [],
    goals: [],
    period: 0,
    clock: { running: false, startedAt: null, bankedMs: 0 },
    phase: "setup",
  };
}

export function reduce(s: FutsalState, e: MatchEvent): FutsalState {
  switch (e.type) {
    case "PERIOD_START":
      return {
        ...s,
        period: (e.payload as { period: number }).period,
        phase: "live",
        foulsThisPeriod: { A: 0, B: 0 },
        clock: { running: true, startedAt: (e.payload as { at: string }).at, bankedMs: s.clock.bankedMs },
      };
    case "GOAL": {
      const t = T(e);
      return {
        ...s,
        score: { ...s.score, [t]: s.score[t] + 1 },
        goals: [
          ...s.goals,
          {
            team: t,
            playerId: (e.payload as { playerId?: string }).playerId,
            ownGoal: (e.payload as { ownGoal?: boolean }).ownGoal,
            atMs: elapsedMs(s, e),
          },
        ],
      };
    }
    case "FOUL": {
      const t = T(e);
      return { ...s, foulsThisPeriod: { ...s.foulsThisPeriod, [t]: s.foulsThisPeriod[t] + 1 } };
    }
    case "CARD": {
      const t = T(e);
      return {
        ...s,
        cards: [
          ...s.cards,
          {
            team: t,
            playerId: (e.payload as { playerId?: string }).playerId,
            color: (e.payload as { color: "yellow" | "red" }).color,
            atMs: elapsedMs(s, e),
          },
        ],
      };
    }
    case "PAUSE":
      return { ...s, clock: bank(s, e) };
    case "RESUME":
      return { ...s, clock: { running: true, startedAt: (e.payload as { at: string }).at, bankedMs: s.clock.bankedMs } };
    case "PERIOD_END":
      return {
        ...s,
        phase: s.period >= s.format.periods ? "completed" : "break",
        clock: bank(s, e),
      };
    case "MATCH_END":
      return { ...s, phase: "completed", clock: bank(s, e) };
    default:
      return s;
  }
}

export function validate(s: FutsalState, e: MatchEvent): ValidationResult {
  if (s.phase === "completed") return { ok: false, reason: "Match is complete" };
  switch (e.type) {
    case "PERIOD_START":
      if (s.phase === "live") return { ok: false, reason: "A period is already live" };
      return { ok: true };
    case "GOAL":
    case "FOUL":
    case "CARD":
    case "PAUSE":
      if (s.phase !== "live") return { ok: false, reason: "No period in progress" };
      return { ok: true };
    case "RESUME":
      if (s.phase !== "live") return { ok: false, reason: "Nothing to resume" };
      return { ok: true };
    case "PERIOD_END":
      if (s.phase !== "live") return { ok: false, reason: "No period in progress" };
      return { ok: true };
    case "MATCH_END":
      return { ok: true };
    default:
      return { ok: false, reason: `Unknown event: ${e.type}` };
  }
}

function fmtClock(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const sec = total % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

function teamName(ctx: MatchContext, side: "A" | "B"): string {
  return ctx.teams[side]?.name ?? `Team ${side}`;
}

function nameOf(ctx: MatchContext, playerId?: string): string {
  if (!playerId) return "—";
  for (const side of ["A", "B"] as const) {
    const p = ctx.players[side].find((x) => x.id === playerId);
    if (p) return p.name;
  }
  return "Player";
}

export function summary(s: FutsalState, ctx: MatchContext): string {
  const a = teamName(ctx, "A");
  const b = teamName(ctx, "B");
  if (s.phase === "completed") {
    const res = result(s, ctx);
    return res?.summary ?? `${a} ${s.score.A} – ${s.score.B} ${b}`;
  }
  return `${a} ${s.score.A} – ${s.score.B} ${b} · P${s.period || 1}`;
}

function result(s: FutsalState, ctx: MatchContext): MatchResult | null {
  if (s.phase !== "completed") return null;
  const a = teamName(ctx, "A");
  const b = teamName(ctx, "B");
  if (s.score.A === s.score.B)
    return { winner: "tie", summary: `Match drawn ${s.score.A}–${s.score.B}` };
  const winner = s.score.A > s.score.B ? "A" : "B";
  const wName = winner === "A" ? a : b;
  return { winner, summary: `${wName} won ${Math.max(s.score.A, s.score.B)}–${Math.min(s.score.A, s.score.B)}` };
}

export function scoreboard(s: FutsalState, ctx: MatchContext): ScoreboardModel {
  const overFoulLimit = (t: "A" | "B") => s.foulsThisPeriod[t] > s.format.foulLimit;
  const lines: { label: string; value: string }[] = [
    { label: "Period", value: `${s.period || 1} / ${s.format.periods}` },
    { label: "Clock", value: fmtClock(s.clock.bankedMs) + (s.clock.running ? " ▸" : "") },
    {
      label: "Fouls A",
      value: `${s.foulsThisPeriod.A}${overFoulLimit("A") ? " ⚠ penalty" : ""}`,
    },
    {
      label: "Fouls B",
      value: `${s.foulsThisPeriod.B}${overFoulLimit("B") ? " ⚠ penalty" : ""}`,
    },
  ];

  const goalRows = (side: "A" | "B") =>
    s.goals
      .filter((g) => g.team === side)
      .map((g) => [nameOf(ctx, g.playerId) + (g.ownGoal ? " (OG)" : ""), fmtClock(g.atMs)]);

  const sections: ScoreboardModel["detail"]["sections"] = [
    {
      title: `${teamName(ctx, "A")} — Goals`,
      columns: ["Scorer", "Time"],
      rows: goalRows("A"),
      footer: `${s.score.A} goal${s.score.A === 1 ? "" : "s"}`,
    },
    {
      title: `${teamName(ctx, "B")} — Goals`,
      columns: ["Scorer", "Time"],
      rows: goalRows("B"),
      footer: `${s.score.B} goal${s.score.B === 1 ? "" : "s"}`,
    },
    {
      title: "Cards",
      columns: ["Player", "Team", "Card", "Time"],
      rows: s.cards.map((c) => [
        nameOf(ctx, c.playerId),
        teamName(ctx, c.team),
        c.color,
        fmtClock(c.atMs),
      ]),
    },
  ];

  let status: string;
  if (s.phase === "completed") status = result(s, ctx)?.summary ?? "Full time";
  else if (s.phase === "break") status = "Break";
  else if (s.phase === "setup") status = "Starting soon";
  else status = `LIVE · Period ${s.period}`;

  return {
    headline: {
      home: { name: teamName(ctx, "A"), logoUrl: ctx.teams.A?.logoUrl, score: String(s.score.A) },
      away: { name: teamName(ctx, "B"), logoUrl: ctx.teams.B?.logoUrl, score: String(s.score.B) },
    },
    status,
    lines,
    highlight: null,
    detail: { sections },
  };
}

export const FUTSAL_2x20: FutsalFormat = { periodMinutes: 20, periods: 2, foulLimit: 5 };

export const futsal: SportModule<FutsalState> = {
  key: "futsal",
  name: "Futsal",
  defaultFormats: [
    { id: "2x20", label: "2 × 20 min", config: FUTSAL_2x20 },
    { id: "2x15", label: "2 × 15 min", config: { periodMinutes: 15, periods: 2, foulLimit: 5 } },
    { id: "2x10", label: "2 × 10 min", config: { periodMinutes: 10, periods: 2, foulLimit: 5 } },
  ],
  rosterRoles: ["Goalkeeper", "Defender", "Pivot", "Winger"],
  init: (format) => init(format),
  validate: (state, event) => validate(state, event),
  reduce,
  scoreboard: (state, ctx) => scoreboard(state, ctx),
  summary: (state, ctx) => summary(state, ctx),
  isComplete: (state) => state.phase === "completed",
  result,
  scorerUI: {
    kind: "pad",
    actions: [
      { label: "Goal A", event: () => ({ type: "GOAL", payload: { team: "A" } }), style: "primary" },
      { label: "Goal B", event: () => ({ type: "GOAL", payload: { team: "B" } }), style: "primary" },
      { label: "Foul A", event: () => ({ type: "FOUL", payload: { team: "A" } }), style: "neutral" },
      { label: "Foul B", event: () => ({ type: "FOUL", payload: { team: "B" } }), style: "neutral" },
      { label: "Yellow A", event: () => ({ type: "CARD", payload: { team: "A", color: "yellow" } }), style: "neutral" },
      { label: "Yellow B", event: () => ({ type: "CARD", payload: { team: "B", color: "yellow" } }), style: "neutral" },
      { label: "Red A", event: () => ({ type: "CARD", payload: { team: "A", color: "red" } }), style: "danger" },
      { label: "Red B", event: () => ({ type: "CARD", payload: { team: "B", color: "red" } }), style: "danger" },
    ],
  },
};
