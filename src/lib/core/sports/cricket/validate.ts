import type { MatchEvent, ValidationResult } from "../contract";
import type { CricketState } from "./types";

const fail = (reason: string): ValidationResult => ({ ok: false, reason });
const pass: ValidationResult = { ok: true };

export function validate(s: CricketState, e: MatchEvent): ValidationResult {
  if (s.phase === "completed") return fail("Match is complete");

  switch (e.type) {
    case "TOSS":
      if (s.phase !== "setup") return fail("Toss only before the first innings");
      return pass;

    case "INNINGS_START":
      if (s.phase !== "setup" && s.phase !== "between_innings")
        return fail("Cannot start an innings now");
      if (s.innings.length >= 2) return fail("Both innings already started");
      return pass;

    case "BALL": {
      if (s.phase !== "live") return fail("No innings in progress");
      if (s.needsNewBatter) return fail("A new batter is required first");
      if (s.needsNewBowler) return fail("A new bowler is required for the next over");
      const inn = s.innings[s.current];
      if (!inn || !inn.strikerId) return fail("No striker set");
      if (!inn.bowlerId) return fail("No bowler set");
      return pass;
    }

    case "NEW_BATTER":
      if (!s.needsNewBatter) return fail("No batter is due");
      return pass;

    case "NEW_BOWLER": {
      if (!s.needsNewBowler) return fail("No new bowler is due");
      const inn = s.innings[s.current];
      const p = e.payload as { playerId: string };
      if (inn && inn.prevOverBowlerId === p.playerId)
        return fail("Same bowler cannot bowl consecutive overs");
      if (inn && s.format.maxOversPerBowler != null) {
        const balls = inn.bowlers[p.playerId]?.balls ?? 0;
        if (balls >= s.format.maxOversPerBowler * s.format.ballsPerOver)
          return fail("Bowler has bowled their maximum overs");
      }
      return pass;
    }

    case "INNINGS_END":
      if (s.phase !== "live") return fail("No innings in progress");
      return pass;

    case "MATCH_END":
      return pass;

    default:
      return fail(`Unknown event: ${e.type}`);
  }
}
