export interface CricketFormat {
  oversPerInnings: number;
  playersPerSide: number;
  ballsPerOver: number;
  lastManStands: boolean; // indoor variant: last batter bats alone
  wideRuns: number; // penalty for a wide (often 1 or 2 indoors)
  noBallRuns: number; // penalty for a no-ball
  maxOversPerBowler: number | null;
}

export type ExtraKind = "wide" | "no_ball" | "bye" | "leg_bye";

export type WicketKind =
  | "bowled"
  | "caught"
  | "lbw"
  | "stumped"
  | "run_out"
  | "hit_wicket"
  | "retired";

export interface BallPayload {
  batRuns: number; // runs off the bat (0,1,2,3,4,6)
  extra?: { kind: ExtraKind; runs: number }; // runs RAN on the extra, excl. penalty
  wicket?: {
    kind: WicketKind;
    batterOut: "striker" | "non_striker";
    fielderId?: string;
  };
}

export interface BatterCard {
  playerId: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  out: boolean;
  outBy?: string; // dismissal kind
}

export interface BowlerCard {
  playerId: string;
  balls: number; // legal balls bowled
  runsConceded: number;
  wickets: number;
}

export interface FallOfWicket {
  score: number;
  over: string; // 'X.Y'
  playerId: string;
}

export interface InningsState {
  battingSide: "A" | "B";
  runs: number;
  wickets: number;
  legalBalls: number;
  extras: number;
  strikerId: string; // "" = vacancy awaiting NEW_BATTER
  nonStrikerId: string | null; // null = last man stands alone
  bowlerId: string;
  prevOverBowlerId: string | null;
  batters: Record<string, BatterCard>;
  bowlers: Record<string, BowlerCard>;
  battingOrder: string[];
  fallOfWickets: FallOfWicket[];
  recentBalls: string[];
  closed: boolean;
}

export type CricketPhase =
  | "setup"
  | "live"
  | "between_innings"
  | "completed";

export interface CricketState {
  format: CricketFormat;
  toss: { wonBy: "A" | "B"; decision: "bat" | "bowl" } | null;
  innings: InningsState[];
  current: number;
  target: number | null;
  needsNewBatter: boolean;
  needsNewBowler: boolean;
  phase: CricketPhase;
  resultSummary: string | null;
  lastHighlight: "wicket" | "boundary" | null;
}
