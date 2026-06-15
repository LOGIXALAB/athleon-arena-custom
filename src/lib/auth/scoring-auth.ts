import "server-only";
import { DomainError } from "@/lib/core/errors";
import { getStaffUser, roleAtLeast } from "@/lib/auth/staff";
import { getBookingByToken } from "@/lib/db/queries/booking";
import { getMatchBooking } from "@/lib/db/queries/match";
import type { Booking } from "@/lib/db/tables";

export interface ScoringPrincipal {
  via: "staff" | "manage_token";
  staffId: string | null;
  booking: Booking | null;
}

const SCOREABLE = ["reserved", "confirmed", "checked_in", "in_progress"];
const UNLOCK_BEFORE_MS = 30 * 60_000;
const GRACE_AFTER_MS = 30 * 60_000;

function assertWindow(booking: Booking) {
  const now = Date.now();
  const open = new Date(booking.starts_at).getTime() - UNLOCK_BEFORE_MS;
  const close = new Date(booking.ends_at).getTime() + GRACE_AFTER_MS;
  if (now < open) throw new DomainError("SCORING_LOCKED", "Scoring unlocks 30 minutes before the slot.");
  if (now > close) throw new DomainError("SCORING_LOCKED", "Scoring has closed for this booking.");
}

/** Staff session (>= scorer) always allowed; else a valid manage token within window. */
async function authorizeToken(token: string | null, booking: Booking | null): Promise<ScoringPrincipal> {
  if (!token) throw new DomainError("FORBIDDEN", "Sign in or use your booking link to score.");
  const bundle = await getBookingByToken(token);
  if (!bundle) throw new DomainError("FORBIDDEN", "Invalid booking link");
  if (booking && bundle.booking.id !== booking.id)
    throw new DomainError("FORBIDDEN", "This link does not match the match");
  if (!SCOREABLE.includes(bundle.booking.status))
    throw new DomainError("SCORING_LOCKED", "This booking is not active.");
  assertWindow(bundle.booking);
  return { via: "manage_token", staffId: null, booking: bundle.booking };
}

/** Authorize scoring actions for an existing match. */
export async function authorizeScoring(req: Request, matchId: string): Promise<ScoringPrincipal> {
  const staff = await getStaffUser();
  if (staff && roleAtLeast(staff.role, "scorer")) {
    return { via: "staff", staffId: staff.id, booking: null };
  }
  const booking = await getMatchBooking(matchId);
  return authorizeToken(req.headers.get("x-manage-token"), booking);
}

/** Authorize match creation for a booking (no match yet). */
export async function authorizeBookingScoring(req: Request, booking: Booking): Promise<ScoringPrincipal> {
  const staff = await getStaffUser();
  if (staff && roleAtLeast(staff.role, "scorer")) {
    return { via: "staff", staffId: staff.id, booking };
  }
  return authorizeToken(req.headers.get("x-manage-token"), booking);
}
