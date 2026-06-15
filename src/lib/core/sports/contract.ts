/**
 * The SportModule contract. Every sport implements this with PURE functions
 * only — no IO, no framework imports. Modules are unit-testable and run on
 * server OR client (the display re-derives state from the same event stream).
 */

export interface MatchEvent {
  type: string;
  payload: Record<string, unknown>;
}

export interface StoredEvent extends MatchEvent {
  seq: number;
  revertedBySeq: number | null;
  createdAt: string;
}

export interface TeamRef {
  side: "A" | "B";
  name: string; // resolved (real or "Team A")
  logoUrl?: string;
}

export interface PlayerRef {
  id: string;
  name: string; // resolved (real or "Player 3")
  jerseyNo?: number;
  role?: string;
}

export interface MatchContext {
  teams: { A: TeamRef; B: TeamRef };
  players: { A: PlayerRef[]; B: PlayerRef[] };
}

export type ValidationResult = { ok: true } | { ok: false; reason: string };

export interface ScoreboardModel {
  headline: {
    home: { name: string; logoUrl?: string; score: string };
    away: { name: string; logoUrl?: string; score: string };
  };
  status: string; // 'LIVE · 2nd Innings' | 'HT' | 'FT'
  lines: { label: string; value: string }[];
  ticker?: string[];
  progress?: { label: string; value: number; max: number };
  highlight?: "wicket" | "goal" | "boundary" | null;
  /** Drives the 'scorecard' display mode — sport-agnostic tabular sections. */
  detail: {
    sections: {
      title: string;
      columns: string[];
      rows: string[][];
      footer?: string;
    }[];
  };
}

export interface MatchResult {
  winner: "A" | "B" | "tie" | null;
  summary: string;
}

export interface NamedFormat {
  id: string;
  label: string;
  config: unknown;
}

export interface PadAction {
  label: string;
  /** Template builder — produces the event to append. */
  event: (state: unknown) => MatchEvent;
  enabledWhen?: (state: unknown) => boolean;
  style?: "primary" | "danger" | "neutral";
}

export type ScorerUI =
  | { kind: "pad"; actions: PadAction[] }
  | { kind: "custom"; componentKey: string };

export interface SportModule<S = unknown> {
  key: string; // 'cricket' | 'futsal' | 'padel'
  name: string;
  defaultFormats: NamedFormat[];
  rosterRoles: string[];

  init(format: unknown, ctx?: MatchContext): S;
  validate(state: S, event: MatchEvent, ctx: MatchContext): ValidationResult;
  reduce(state: S, event: MatchEvent): S; // PURE (state, event) -> newState

  scoreboard(state: S, ctx: MatchContext): ScoreboardModel;
  summary(state: S, ctx: MatchContext): string;
  isComplete(state: S): boolean;
  result(state: S, ctx: MatchContext): MatchResult | null;

  scorerUI: ScorerUI;
}
