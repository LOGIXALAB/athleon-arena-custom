import "server-only";
import { db } from "@/lib/db/server";
import { DomainError } from "@/lib/core/errors";
import { isExclusionViolation } from "@/lib/api";
import { LIVE_STATUSES } from "@/lib/core/booking/transitions";
import type { ActiveMembership } from "@/lib/core/memberships/apply";
import type { PricingRuleInput } from "@/lib/core/pricing/engine";
import type {
  Booking,
  BookingSource,
  Court,
  CourtSchedule,
  Customer,
  Match,
  Payment,
  PaymentMethod,
  PaymentProof,
  Player,
  Team,
  Venue,
} from "@/lib/db/tables";

export interface CourtWithVenue extends Court {
  venue: Venue;
}

export async function getCourtsForSport(sportId: string): Promise<Court[]> {
  const sb = db();
  const { data: links } = await sb.from("court_sports").select("court_id").eq("sport_id", sportId);
  const ids = (links ?? []).map((l: { court_id: string }) => l.court_id);
  if (!ids.length) return [];
  const { data } = await sb.from("courts").select("*").in("id", ids).eq("is_active", true);
  return (data as Court[]) ?? [];
}

export async function getCourtWithVenue(courtId: string): Promise<CourtWithVenue | null> {
  const sb = db();
  const { data: court } = await sb.from("courts").select("*").eq("id", courtId).single();
  if (!court) return null;
  const { data: venue } = await sb.from("venues").select("*").eq("id", (court as Court).venue_id).single();
  return { ...(court as Court), venue: venue as Venue };
}

export async function courtSupportsSport(courtId: string, sportId: string): Promise<boolean> {
  const { count } = await db()
    .from("court_sports")
    .select("*", { count: "exact", head: true })
    .eq("court_id", courtId)
    .eq("sport_id", sportId);
  return (count ?? 0) > 0;
}

export async function getScheduleForDay(
  courtId: string,
  dayOfWeek: number,
): Promise<CourtSchedule | null> {
  const { data } = await db()
    .from("court_schedules")
    .select("*")
    .eq("court_id", courtId)
    .eq("day_of_week", dayOfWeek)
    .limit(1)
    .maybeSingle();
  return (data as CourtSchedule) ?? null;
}

export async function getLiveBookingsAround(
  courtId: string,
  fromISO: string,
  toISO: string,
): Promise<{ startsAt: string; endsAt: string }[]> {
  const { data } = await db()
    .from("bookings")
    .select("starts_at, ends_at, status")
    .eq("court_id", courtId)
    .in("status", LIVE_STATUSES)
    .gte("starts_at", fromISO)
    .lte("starts_at", toISO);
  return ((data as Pick<Booking, "starts_at" | "ends_at">[]) ?? []).map((b) => ({
    startsAt: b.starts_at,
    endsAt: b.ends_at,
  }));
}

export async function getBlocksAround(
  courtId: string,
  fromISO: string,
  toISO: string,
): Promise<{ startsAt: string; endsAt: string }[]> {
  const { data } = await db()
    .from("court_blocks")
    .select("starts_at, ends_at")
    .eq("court_id", courtId)
    .gte("starts_at", fromISO)
    .lte("starts_at", toISO);
  return ((data as { starts_at: string; ends_at: string }[]) ?? []).map((b) => ({
    startsAt: b.starts_at,
    endsAt: b.ends_at,
  }));
}

export async function getActivePricingRules(venueId: string): Promise<PricingRuleInput[]> {
  const { data } = await db()
    .from("pricing_rules")
    .select("*")
    .eq("venue_id", venueId)
    .eq("is_active", true);
  return (data as PricingRuleInput[]) ?? [];
}

export async function getActiveMembershipByPhone(phone: string): Promise<ActiveMembership | null> {
  const sb = db();
  const { data: customer } = await sb.from("customers").select("id").eq("phone", phone).maybeSingle();
  if (!customer) return null;
  const today = new Date().toISOString().slice(0, 10);
  const { data: m } = await sb
    .from("memberships")
    .select("plan_id, status, starts_on, ends_on")
    .eq("customer_id", (customer as { id: string }).id)
    .eq("status", "active")
    .lte("starts_on", today)
    .gte("ends_on", today)
    .limit(1)
    .maybeSingle();
  if (!m) return null;
  const { data: plan } = await sb
    .from("membership_plans")
    .select("discount_pct, priority_booking_days")
    .eq("id", (m as { plan_id: string }).plan_id)
    .single();
  if (!plan) return null;
  return {
    discountPct: Number((plan as { discount_pct: number }).discount_pct),
    priorityBookingDays: Number((plan as { priority_booking_days: number }).priority_booking_days),
  };
}

export async function upsertCustomerByPhone(phone: string, name?: string): Promise<Customer> {
  const sb = db();
  const { data: existing } = await sb.from("customers").select("*").eq("phone", phone).maybeSingle();
  if (existing) {
    if (name && !(existing as Customer).full_name) {
      await sb.from("customers").update({ full_name: name }).eq("id", (existing as Customer).id);
    }
    return existing as Customer;
  }
  const { data, error } = await sb
    .from("customers")
    .insert({ phone, full_name: name ?? null })
    .select("*")
    .single();
  if (error) throw error;
  return data as Customer;
}

export interface CreateBookingRow {
  venueId: string;
  courtId: string;
  sportId: string;
  customerId: string;
  startsAt: string;
  endsAt: string;
  status: Booking["status"];
  source: BookingSource;
  paymentMethod: PaymentMethod;
  holdExpiresAt: string | null;
  amountDue: number;
}

export async function insertBookingWithTeams(row: CreateBookingRow): Promise<Booking> {
  const sb = db();
  let booking: Booking;
  try {
    const { data, error } = await sb
      .from("bookings")
      .insert({
        venue_id: row.venueId,
        court_id: row.courtId,
        sport_id: row.sportId,
        customer_id: row.customerId,
        starts_at: row.startsAt,
        ends_at: row.endsAt,
        status: row.status,
        source: row.source,
        payment_method: row.paymentMethod,
        hold_expires_at: row.holdExpiresAt,
        amount_due: row.amountDue,
      })
      .select("*")
      .single();
    if (error) throw error;
    booking = data as Booking;
  } catch (e) {
    if (isExclusionViolation(e)) {
      throw new DomainError("SLOT_TAKEN", "That slot was just booked by someone else.");
    }
    throw e;
  }
  // empty A/B team shells (roster filled later, optionally)
  await sb.from("teams").insert([
    { booking_id: booking.id, side: "A" },
    { booking_id: booking.id, side: "B" },
  ]);
  return booking;
}

export interface BookingBundle {
  booking: Booking;
  venue: Venue;
  court: Court;
  teams: (Team & { players: Player[] })[];
  match: Match | null;
  payments: Payment[];
  proofs: PaymentProof[];
}

export async function getBookingByToken(token: string): Promise<BookingBundle | null> {
  const sb = db();
  const { data: booking } = await sb
    .from("bookings")
    .select("*")
    .eq("management_token", token)
    .maybeSingle();
  if (!booking) return null;
  return hydrateBooking(booking as Booking);
}

export async function getBookingById(id: string): Promise<BookingBundle | null> {
  const sb = db();
  const { data: booking } = await sb.from("bookings").select("*").eq("id", id).maybeSingle();
  if (!booking) return null;
  return hydrateBooking(booking as Booking);
}

async function hydrateBooking(booking: Booking): Promise<BookingBundle> {
  const sb = db();
  const [venueRes, courtRes, teamsRes, matchRes, payRes, proofRes] = await Promise.all([
    sb.from("venues").select("*").eq("id", booking.venue_id).single(),
    sb.from("courts").select("*").eq("id", booking.court_id).single(),
    sb.from("teams").select("*").eq("booking_id", booking.id).order("side"),
    sb.from("matches").select("*").eq("booking_id", booking.id).maybeSingle(),
    sb.from("payments").select("*").eq("booking_id", booking.id).order("created_at"),
    sb.from("payment_proofs").select("*").eq("booking_id", booking.id).order("uploaded_at"),
  ]);
  const teams = (teamsRes.data as Team[]) ?? [];
  const teamsWithPlayers = await Promise.all(
    teams.map(async (t) => {
      const { data: players } = await sb
        .from("players")
        .select("*")
        .eq("team_id", t.id)
        .order("sort_order");
      return { ...t, players: (players as Player[]) ?? [] };
    }),
  );
  return {
    booking,
    venue: venueRes.data as Venue,
    court: courtRes.data as Court,
    teams: teamsWithPlayers,
    match: (matchRes.data as Match) ?? null,
    payments: (payRes.data as Payment[]) ?? [],
    proofs: (proofRes.data as PaymentProof[]) ?? [],
  };
}
