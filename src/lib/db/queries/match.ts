import "server-only";
import { db } from "@/lib/db/server";
import { DomainError } from "@/lib/core/errors";
import { SportRegistry } from "@/lib/core/sports/registry";
import { deriveState } from "@/lib/core/sports/engine";
import type { MatchContext, MatchEvent, StoredEvent } from "@/lib/core/sports/contract";
import { publishMatch, publishCourt } from "@/lib/realtime/publish";
import { audit } from "@/lib/db/audit";
import type { Booking, Match, Player, Team } from "@/lib/db/tables";

export async function getMatchRow(matchId: string): Promise<Match | null> {
  const { data } = await db().from("matches").select("*").eq("id", matchId).maybeSingle();
  return (data as Match) ?? null;
}

export async function getMatchBooking(matchId: string): Promise<Booking | null> {
  const m = await getMatchRow(matchId);
  if (!m) return null;
  const { data } = await db().from("bookings").select("*").eq("id", m.booking_id).maybeSingle();
  return (data as Booking) ?? null;
}

/** Builds the MatchContext (names resolved, placeholders as stored) for a match. */
export async function getMatchContext(matchId: string): Promise<MatchContext> {
  const sb = db();
  const m = await getMatchRow(matchId);
  if (!m) throw new DomainError("NOT_FOUND", "Match not found");
  const { data: teams } = await sb.from("teams").select("*").eq("booking_id", m.booking_id).order("side");
  const teamList = (teams as Team[]) ?? [];
  const byside = (s: "A" | "B") => teamList.find((t) => t.side === s);
  const players: { A: Player[]; B: Player[] } = { A: [], B: [] };
  for (const s of ["A", "B"] as const) {
    const t = byside(s);
    if (t) {
      const { data } = await sb.from("players").select("*").eq("team_id", t.id).order("sort_order");
      players[s] = (data as Player[]) ?? [];
    }
  }
  const toRef = (p: Player) => ({ id: p.id, name: p.name, jerseyNo: p.jersey_no ?? undefined, role: p.role ?? undefined });
  return {
    teams: {
      A: { side: "A", name: byside("A")?.name ?? "Team A", logoUrl: byside("A")?.logo_url ?? undefined },
      B: { side: "B", name: byside("B")?.name ?? "Team B", logoUrl: byside("B")?.logo_url ?? undefined },
    },
    players: { A: players.A.map(toRef), B: players.B.map(toRef) },
  };
}

async function loadStoredEvents(matchId: string): Promise<StoredEvent[]> {
  const { data } = await db()
    .from("match_events")
    .select("seq, type, payload, reverted_by_seq, created_at")
    .eq("match_id", matchId)
    .order("seq");
  return ((data as { seq: number; type: string; payload: Record<string, unknown>; reverted_by_seq: number | null; created_at: string }[]) ?? []).map((e) => ({
    type: e.type,
    payload: e.payload,
    seq: e.seq,
    revertedBySeq: e.reverted_by_seq,
    createdAt: e.created_at,
  }));
}

export interface MatchSnapshot {
  matchId: string;
  sportId: string;
  status: string;
  seq: number;
  scoreboard: ReturnType<ReturnType<typeof SportRegistry.get>["scoreboard"]>;
  summary: string;
  isComplete: boolean;
  scorerUI: ReturnType<typeof SportRegistry.get>["scorerUI"];
  defaultFormats: ReturnType<typeof SportRegistry.get>["defaultFormats"];
  context: MatchContext;
  state: unknown;
}

export async function deriveMatchSnapshot(matchId: string): Promise<MatchSnapshot> {
  const m = await getMatchRow(matchId);
  if (!m) throw new DomainError("NOT_FOUND", "Match not found");
  const mod = SportRegistry.get(m.sport_id);
  const ctx = await getMatchContext(matchId);
  const events = await loadStoredEvents(matchId);
  const state = deriveState(mod, m.format, ctx, events);
  const lastSeq = events.reduce((mx, e) => Math.max(mx, e.seq), 0);
  return {
    matchId,
    sportId: m.sport_id,
    status: m.status,
    seq: lastSeq,
    scoreboard: mod.scoreboard(state, ctx),
    summary: mod.summary(state, ctx),
    isComplete: mod.isComplete(state),
    scorerUI: mod.scorerUI,
    defaultFormats: mod.defaultFormats,
    context: ctx,
    state,
  };
}

export async function getEventsFrom(matchId: string, fromSeq: number): Promise<StoredEvent[]> {
  const all = await loadStoredEvents(matchId);
  return all.filter((e) => e.seq > fromSeq);
}

/** Create a match for a booking. Seeds placeholder players for roster-based sports. */
export async function createMatchForBooking(bookingId: string, formatId: string, actor: string): Promise<Match> {
  const sb = db();
  const { data: bookingData } = await sb.from("bookings").select("*").eq("id", bookingId).maybeSingle();
  const booking = bookingData as Booking | null;
  if (!booking) throw new DomainError("NOT_FOUND", "Booking not found");

  // A booking can hold more than one match. Reuse the current match while it's
  // still in progress; only start a fresh one once the previous has finished AND
  // there is still time left in the slot.
  const { data: latestRows } = await sb
    .from("matches")
    .select("*")
    .eq("booking_id", bookingId)
    .order("created_at", { ascending: false })
    .limit(1);
  const latest = (latestRows as Match[] | null)?.[0] ?? null;
  if (latest && latest.status !== "completed" && latest.status !== "abandoned") {
    return latest; // a match is already in progress for this booking
  }
  if (latest && new Date(booking.ends_at).getTime() <= Date.now()) {
    throw new DomainError("SCORING_LOCKED", "No time left in this slot to start a new match.");
  }

  const mod = SportRegistry.get(booking.sport_id);
  const fmt = mod.defaultFormats.find((f) => f.id === formatId) ?? mod.defaultFormats[0];
  const config = fmt.config as Record<string, unknown>;

  // ensure teams exist
  const { data: teamsData } = await sb.from("teams").select("*").eq("booking_id", bookingId).order("side");
  let teams = (teamsData as Team[]) ?? [];
  if (teams.length < 2) {
    await sb.from("teams").insert(
      (["A", "B"] as const).filter((s) => !teams.some((t) => t.side === s)).map((side) => ({ booking_id: bookingId, side })),
    );
    const { data } = await sb.from("teams").select("*").eq("booking_id", bookingId).order("side");
    teams = (data as Team[]) ?? [];
  }

  // seed placeholder players up to playersPerSide (roster-based sports only)
  const perSide = typeof config.playersPerSide === "number" ? config.playersPerSide : 0;
  if (perSide > 0) {
    for (const team of teams) {
      const { data: existingPlayers } = await sb.from("players").select("id").eq("team_id", team.id);
      const have = (existingPlayers as { id: string }[])?.length ?? 0;
      const toAdd = [];
      for (let i = have; i < perSide; i++) {
        toAdd.push({ team_id: team.id, name: `Player ${i + 1}`, sort_order: i });
      }
      if (toAdd.length) await sb.from("players").insert(toAdd);
    }
  }

  const { data: match, error } = await sb
    .from("matches")
    .insert({ booking_id: bookingId, sport_id: booking.sport_id, format: config, status: "scheduled" })
    .select("*")
    .single();
  if (error) throw error;

  await sb.from("court_display_state").upsert({ court_id: booking.court_id, match_id: (match as Match).id, mode: "headline" });
  await audit(actor, "match.create", "match", (match as Match).id, { formatId: fmt.id });
  await publishCourt(booking.court_id, "match_assigned", { matchId: (match as Match).id });
  return match as Match;
}

export async function appendMatchEvent(
  matchId: string,
  incoming: MatchEvent,
  recordedBy: string | null,
  recordedVia: "staff" | "manage_token" | "system",
) {
  const m = await getMatchRow(matchId);
  if (!m) throw new DomainError("NOT_FOUND", "Match not found");
  const mod = SportRegistry.get(m.sport_id);
  const ctx = await getMatchContext(matchId);
  const events = await loadStoredEvents(matchId);
  const state = deriveState(mod, m.format, ctx, events);

  const v = mod.validate(state, incoming, ctx);
  if (!v.ok) throw new DomainError("INVALID_EVENT", v.reason);

  const sb = db();
  const { data: saved, error } = await sb.rpc("append_match_event", {
    p_match_id: matchId,
    p_type: incoming.type,
    p_payload: incoming.payload,
    p_recorded_by: recordedBy,
    p_recorded_via: recordedVia,
  });
  if (error) throw error;
  const seq = (saved as { seq: number }).seq;

  const next = mod.reduce(state, incoming);
  if (m.status === "scheduled") await sb.from("matches").update({ status: "live" }).eq("id", matchId);

  const scoreboard = mod.scoreboard(next, ctx);
  const summary = mod.summary(next, ctx);

  if (mod.isComplete(next)) {
    const result = mod.result(next, ctx);
    await sb.from("matches").update({ status: "completed", result: result ?? null }).eq("id", matchId);
    await publishMatch(matchId, "match_completed", { result });
  }
  await publishMatch(matchId, "event_appended", { seq, scoreboard, summary });
  return { seq, scoreboard, summary, isComplete: mod.isComplete(next) };
}

export async function revertMatchEvent(matchId: string, targetSeq: number) {
  const sb = db();
  await sb.from("match_events").update({ reverted_by_seq: targetSeq }).eq("match_id", matchId).eq("seq", targetSeq);
  const snap = await deriveMatchSnapshot(matchId);
  await publishMatch(matchId, "event_reverted", { seq: targetSeq, scoreboard: snap.scoreboard, summary: snap.summary });
  return snap;
}

export async function setDisplayMode(matchId: string, mode: "headline" | "scorecard") {
  const sb = db();
  const m = await getMatchRow(matchId);
  if (!m) throw new DomainError("NOT_FOUND", "Match not found");
  const { data: booking } = await sb.from("bookings").select("court_id").eq("id", m.booking_id).single();
  const courtId = (booking as { court_id: string }).court_id;
  await sb.from("court_display_state").upsert({ court_id: courtId, match_id: matchId, mode });
  await publishCourt(courtId, "display_mode", { mode, matchId });
  return { mode, courtId };
}
