import "server-only";
import { fromZonedTime } from "date-fns-tz";
import { db } from "@/lib/db/server";
import { DomainError } from "@/lib/core/errors";
import { assertTransition, initialStatus, type BookingStatus } from "@/lib/core/booking/transitions";
import { computeHoldExpiry } from "@/lib/core/booking/holds";
import { resolvePrice } from "@/lib/core/pricing/engine";
import { dayOfWeekInTz, instantToLocalDateISO, instantToLocalMinutes } from "@/lib/core/booking/slots";
import { audit } from "@/lib/db/audit";
import { publishOps } from "@/lib/realtime/publish";
import {
  getActivePricingRules,
  getCourtWithVenue,
  insertBookingWithTeams,
  upsertCustomerByPhone,
} from "./booking";
import type { Booking, Court, Customer, Payment, PaymentProof, Venue } from "@/lib/db/tables";

export async function resolveStaffVenue(staffVenueId: string | null): Promise<Venue> {
  const sb = db();
  if (staffVenueId) {
    const { data } = await sb.from("venues").select("*").eq("id", staffVenueId).single();
    return data as Venue;
  }
  const { data } = await sb.from("venues").select("*").eq("is_active", true).order("created_at").limit(1).single();
  return data as Venue;
}

export interface OpsBooking {
  id: string;
  courtId: string;
  courtName: string;
  sportId: string;
  startsAt: string;
  endsAt: string;
  status: BookingStatus;
  source: string;
  paymentMethod: string;
  amountDue: number;
  currency: string;
  arrivedAt: string | null;
  customerName: string | null;
  customerPhone: string | null;
  managementToken: string;
  paymentStatus: string | null;
  proofCount: number;
  hasMatch: boolean;
}

export async function getOpsToday(venue: Venue, dateISO: string): Promise<{ courts: Court[]; bookings: OpsBooking[] }> {
  const sb = db();
  const tz = venue.timezone;
  const dayStart = fromZonedTime(`${dateISO}T00:00:00`, tz);
  const dayEnd = new Date(dayStart.getTime() + 24 * 3600_000);

  const { data: courts } = await sb.from("courts").select("*").eq("venue_id", venue.id).order("name");
  const { data: rows } = await sb
    .from("bookings")
    .select("*")
    .eq("venue_id", venue.id)
    .gte("starts_at", dayStart.toISOString())
    .lt("starts_at", dayEnd.toISOString())
    .order("starts_at");

  const bookings = (rows as Booking[]) ?? [];
  const courtList = (courts as Court[]) ?? [];
  const courtName = (id: string) => courtList.find((c) => c.id === id)?.name ?? "Court";

  // hydrate customer / payment / proof / match info
  const result: OpsBooking[] = [];
  for (const b of bookings) {
    const [cust, pays, proofs, match] = await Promise.all([
      b.customer_id
        ? sb.from("customers").select("full_name, phone").eq("id", b.customer_id).maybeSingle()
        : Promise.resolve({ data: null }),
      sb.from("payments").select("status").eq("booking_id", b.id).order("created_at", { ascending: false }).limit(1),
      sb.from("payment_proofs").select("id", { count: "exact", head: true }).eq("booking_id", b.id),
      sb.from("matches").select("id", { head: true, count: "exact" }).eq("booking_id", b.id),
    ]);
    const c = cust.data as Pick<Customer, "full_name" | "phone"> | null;
    result.push({
      id: b.id,
      courtId: b.court_id,
      courtName: courtName(b.court_id),
      sportId: b.sport_id,
      startsAt: b.starts_at,
      endsAt: b.ends_at,
      status: b.status,
      source: b.source,
      paymentMethod: b.payment_method,
      amountDue: Number(b.amount_due),
      currency: b.currency,
      arrivedAt: b.arrived_at,
      customerName: c?.full_name ?? null,
      customerPhone: c?.phone ?? null,
      managementToken: b.management_token,
      paymentStatus: (pays.data as Pick<Payment, "status">[])?.[0]?.status ?? null,
      proofCount: (proofs as { count: number | null }).count ?? 0,
      hasMatch: ((match as { count: number | null }).count ?? 0) > 0,
    });
  }
  return { courts: courtList, bookings: result };
}

async function loadBooking(id: string): Promise<Booking> {
  const { data } = await db().from("bookings").select("*").eq("id", id).maybeSingle();
  if (!data) throw new DomainError("NOT_FOUND", "Booking not found");
  return data as Booking;
}

async function setStatus(id: string, to: BookingStatus, from: BookingStatus, patch: Record<string, unknown> = {}) {
  assertTransition(from, to);
  await db().from("bookings").update({ status: to, ...patch }).eq("id", id);
}

export async function confirmPayment(bookingId: string, staffId: string) {
  const b = await loadBooking(bookingId);
  await setStatus(b.id, "confirmed", b.status);
  await db()
    .from("payments")
    .update({ status: "succeeded", verified_by: staffId, verified_at: new Date().toISOString() })
    .eq("booking_id", b.id)
    .neq("status", "succeeded");
  await audit(`staff:${staffId}`, "payment.confirm", "booking", b.id);
  await publishOps(b.venue_id, "booking_confirmed", { bookingId: b.id });
  return loadBooking(bookingId);
}

export async function markArrived(bookingId: string, staffId: string, opts: { withCash?: boolean } = {}) {
  const b = await loadBooking(bookingId);
  const now = new Date().toISOString();
  // reserved (pay cash on arrival): record cash, reserved→confirmed→checked_in
  if (b.status === "reserved") {
    if (opts.withCash) {
      await db().from("payments").insert({
        booking_id: b.id,
        provider: "cash",
        amount: b.amount_due,
        status: "succeeded",
        method: "cash",
        verified_by: staffId,
        verified_at: now,
      });
    }
    await setStatus(b.id, "confirmed", "reserved");
    await setStatus(b.id, "checked_in", "confirmed", { arrived_at: now, arrival_marked_by: staffId });
  } else if (b.status === "confirmed") {
    await setStatus(b.id, "checked_in", "confirmed", { arrived_at: now, arrival_marked_by: staffId });
  } else {
    throw new DomainError("ILLEGAL_TRANSITION", `Cannot mark arrived from ${b.status}`);
  }
  await audit(`staff:${staffId}`, "booking.arrived", "booking", b.id, { withCash: opts.withCash ?? false });
  await publishOps(b.venue_id, "arrived", { bookingId: b.id });
  return loadBooking(bookingId);
}

export async function recordCash(bookingId: string, amount: number, staffId: string) {
  const b = await loadBooking(bookingId);
  await db().from("payments").insert({
    booking_id: b.id,
    provider: "cash",
    amount,
    status: "succeeded",
    method: "cash",
    verified_by: staffId,
    verified_at: new Date().toISOString(),
  });
  if (b.status === "pending_payment" || b.status === "pending_verification" || b.status === "reserved") {
    await setStatus(b.id, "confirmed", b.status);
  }
  await audit(`staff:${staffId}`, "payment.cash", "booking", b.id, { amount });
  return loadBooking(bookingId);
}

export async function cancelBooking(bookingId: string, staffId: string) {
  const b = await loadBooking(bookingId);
  await setStatus(b.id, "cancelled", b.status);
  await audit(`staff:${staffId}`, "booking.cancel", "booking", b.id);
  return loadBooking(bookingId);
}

export async function markNoShow(bookingId: string, staffId: string) {
  const b = await loadBooking(bookingId);
  await setStatus(b.id, "no_show", b.status);
  await audit(`staff:${staffId}`, "booking.no_show", "booking", b.id);
  return loadBooking(bookingId);
}

export async function extendBooking(bookingId: string, minutes: number, staffId: string) {
  const b = await loadBooking(bookingId);
  const newEnds = new Date(new Date(b.ends_at).getTime() + minutes * 60_000).toISOString();
  try {
    await db().from("bookings").update({ ends_at: newEnds }).eq("id", b.id);
  } catch (e) {
    if (typeof e === "object" && e && "code" in e && (e as { code?: string }).code === "23P01")
      throw new DomainError("SLOT_TAKEN", "The next slot is already booked.");
    throw e;
  }
  await audit(`staff:${staffId}`, "booking.extend", "booking", b.id, { minutes });
  return loadBooking(bookingId);
}

export interface WalkInInput {
  courtId: string;
  sportId: string;
  startsAt: string;
  endsAt: string;
  phone: string;
  name?: string;
  amount?: number;
}

export async function createWalkIn(input: WalkInInput, staffId: string) {
  const court = await getCourtWithVenue(input.courtId);
  if (!court) throw new DomainError("NOT_FOUND", "Court not found");
  const tz = court.venue.timezone;
  let amount = input.amount;
  if (amount == null) {
    const rules = await getActivePricingRules(court.venue.id);
    const localDate = instantToLocalDateISO(input.startsAt, tz);
    amount = resolvePrice(rules, {
      courtId: input.courtId,
      sportId: input.sportId,
      dow: dayOfWeekInTz(localDate),
      startMinutes: instantToLocalMinutes(input.startsAt, tz),
    }).amount;
  }
  const customer = await upsertCustomerByPhone(input.phone, input.name);
  const hold = computeHoldExpiry("cash_on_arrival", new Date(), new Date(input.startsAt));
  const booking = await insertBookingWithTeams({
    venueId: court.venue.id,
    courtId: input.courtId,
    sportId: input.sportId,
    customerId: customer.id,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    status: initialStatus("cash_on_arrival", "walk_in"), // confirmed
    source: "walk_in",
    paymentMethod: "cash_on_arrival",
    holdExpiresAt: hold ? hold.toISOString() : null,
    amountDue: amount,
  });
  await db().from("payments").insert({
    booking_id: booking.id,
    provider: "cash",
    amount,
    status: "succeeded",
    method: "cash",
    verified_by: staffId,
    verified_at: new Date().toISOString(),
  });
  await audit(`staff:${staffId}`, "booking.walk_in", "booking", booking.id);
  await publishOps(court.venue.id, "booking_created", { bookingId: booking.id });
  return booking;
}

export async function getProofUrls(bookingId: string): Promise<string[]> {
  const sb = db();
  const { data } = await sb.from("payment_proofs").select("storage_path").eq("booking_id", bookingId);
  const proofs = (data as Pick<PaymentProof, "storage_path">[]) ?? [];
  const urls: string[] = [];
  for (const p of proofs) {
    const { data: signed } = await sb.storage.from("payment-proofs").createSignedUrl(p.storage_path, 600);
    if (signed?.signedUrl) urls.push(signed.signedUrl);
  }
  return urls;
}
