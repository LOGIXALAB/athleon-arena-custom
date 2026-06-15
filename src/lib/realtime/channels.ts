/** Realtime channel name builders — shared by server publishers and client hooks. */
export const channels = {
  match: (matchId: string) => `match:${matchId}`,
  court: (courtId: string) => `court:${courtId}`,
  ops: (venueId: string) => `ops:${venueId}`,
};

export type MatchEventName =
  | "event_appended"
  | "event_reverted"
  | "roster_updated"
  | "match_completed";

export type CourtEventName = "display_mode" | "match_assigned" | "idle";

export type OpsEventName =
  | "booking_created"
  | "proof_uploaded"
  | "booking_confirmed"
  | "arrived"
  | "payment_received";
