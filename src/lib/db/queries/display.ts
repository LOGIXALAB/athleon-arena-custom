import "server-only";
import { db } from "@/lib/db/server";
import { deriveMatchSnapshot, type MatchSnapshot } from "./match";
import type { Court, Venue } from "@/lib/db/tables";

export interface NextBooking {
  startsAt: string;
  sportId: string;
  teamA: string;
  teamB: string;
}

export interface DisplayState {
  courtId: string;
  courtName: string;
  venueName: string;
  timezone: string;
  mode: "headline" | "scorecard";
  matchId: string | null;
  snapshot: MatchSnapshot | null;
  nextBooking: NextBooking | null;
}

export async function getDisplayState(courtId: string): Promise<DisplayState | null> {
  const sb = db();
  const { data: courtData } = await sb.from("courts").select("*").eq("id", courtId).maybeSingle();
  const court = courtData as Court | null;
  if (!court) return null;
  const { data: venueData } = await sb.from("venues").select("*").eq("id", court.venue_id).single();
  const venue = venueData as Venue;

  const { data: ds } = await sb
    .from("court_display_state")
    .select("mode, match_id")
    .eq("court_id", courtId)
    .maybeSingle();
  const mode = ((ds as { mode?: string } | null)?.mode as "headline" | "scorecard") ?? "headline";
  const matchId = (ds as { match_id?: string | null } | null)?.match_id ?? null;

  let snapshot: MatchSnapshot | null = null;
  if (matchId) {
    try {
      snapshot = await deriveMatchSnapshot(matchId);
    } catch {
      snapshot = null;
    }
  }

  // next upcoming booking for the idle screen
  const { data: nb } = await sb
    .from("bookings")
    .select("starts_at, sport_id, id")
    .eq("court_id", courtId)
    .in("status", ["confirmed", "checked_in", "reserved"])
    .gt("starts_at", new Date().toISOString())
    .order("starts_at")
    .limit(1)
    .maybeSingle();

  let nextBooking: NextBooking | null = null;
  if (nb) {
    const row = nb as { starts_at: string; sport_id: string; id: string };
    const { data: teams } = await sb.from("teams").select("side, name").eq("booking_id", row.id);
    const t = (teams as { side: string; name: string | null }[]) ?? [];
    nextBooking = {
      startsAt: row.starts_at,
      sportId: row.sport_id,
      teamA: t.find((x) => x.side === "A")?.name ?? "Team A",
      teamB: t.find((x) => x.side === "B")?.name ?? "Team B",
    };
  }

  return {
    courtId,
    courtName: court.name,
    venueName: venue.name,
    timezone: venue.timezone,
    mode,
    matchId,
    snapshot,
    nextBooking,
  };
}
