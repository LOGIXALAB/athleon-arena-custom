import { type NextRequest } from "next/server";
import { z } from "zod";
import { ok, fail, handle } from "@/lib/api";
import { publicEnv } from "@/lib/env";
import { feature } from "@/lib/config/features";
import { computeAvailability } from "@/lib/core/booking/availability";
import { initialStatus } from "@/lib/core/booking/transitions";
import { computeHoldExpiry } from "@/lib/core/booking/holds";
import { dayOfWeekInTz, instantToLocalDateISO } from "@/lib/core/booking/slots";
import {
  getCourtsForSport,
  getCourtWithVenue,
  courtSupportsSport,
  getScheduleForDay,
  getLiveBookingsAround,
  getBlocksAround,
  getActivePricingRules,
  getActiveMembershipByPhone,
  upsertCustomerByPhone,
  insertBookingWithTeams,
} from "@/lib/db/queries/booking";
import { db } from "@/lib/db/server";
import { zUuid } from "@/lib/validation";
import { rateLimit, clientIp } from "@/lib/rate-limit";

const Body = z.object({
  courtId: zUuid.optional(),
  sportId: z.string().min(1),
  startsAt: z.string().datetime({ offset: true }),
  endsAt: z.string().datetime({ offset: true }),
  matchType: z.string().optional(),
  paymentMethod: z.enum(["online", "bank_transfer", "cash_on_arrival"]),
  customer: z.object({
    phone: z.string().min(6).max(20),
    name: z.string().max(80).optional(),
  }),
});

export async function POST(req: NextRequest) {
  return handle(async () => {
    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) return fail("VALIDATION", parsed.error.issues[0]?.message ?? "Invalid body");
    const input = parsed.data;

    // rate limit public bookings per IP + phone
    if (!rateLimit(`book:${clientIp(req)}:${input.customer.phone}`, 6, 10 * 60_000)) {
      return fail("VALIDATION", "Too many booking attempts. Please wait a few minutes.", 429);
    }

    if (input.paymentMethod === "online" && !(await feature("online_payments"))) {
      return fail("VALIDATION", "Online payments are not available yet. Choose bank transfer or pay on arrival.");
    }

    // resolve court
    let courtId = input.courtId;
    if (!courtId) {
      const courts = await getCourtsForSport(input.sportId);
      if (!courts.length) return fail("NOT_FOUND", "No court hosts that sport", 404);
      courtId = courts[0].id;
    }
    const court = await getCourtWithVenue(courtId);
    if (!court) return fail("NOT_FOUND", "Court not found", 404);
    if (!(await courtSupportsSport(courtId, input.sportId)))
      return fail("VALIDATION", "That sport is not played on this court");

    const tz = court.venue.timezone;
    if (new Date(input.startsAt) <= new Date())
      return fail("VALIDATION", "That slot is in the past");
    if (new Date(input.endsAt) <= new Date(input.startsAt))
      return fail("VALIDATION", "End time must be after start time");

    // server-side pricing over the FULL range (never trust the client). Reuse the
    // availability engine so a multi-hour booking is priced slot-by-slot (peak +
    // off-peak summed) and we re-validate the range is whole, consecutive & free.
    const localDate = instantToLocalDateISO(input.startsAt, tz);
    const dow = dayOfWeekInTz(localDate);
    const dayStart = new Date(`${localDate}T00:00:00Z`);
    const fromISO = new Date(dayStart.getTime() - 24 * 3600_000).toISOString();
    const toISO = new Date(dayStart.getTime() + 48 * 3600_000).toISOString();
    const [schedule, busy, blocks, rules, membership] = await Promise.all([
      getScheduleForDay(courtId, dow),
      getLiveBookingsAround(courtId, fromISO, toISO),
      getBlocksAround(courtId, fromISO, toISO),
      getActivePricingRules(court.venue.id),
      getActiveMembershipByPhone(input.customer.phone),
    ]);
    const daySlots = computeAvailability({
      courtId,
      sportId: input.sportId,
      dateISO: localDate,
      timezone: tz,
      schedule: schedule
        ? { opens: schedule.opens, closes: schedule.closes, slotMinutes: schedule.slot_minutes }
        : null,
      busy,
      blocks,
      rules,
      membership,
      now: new Date(),
    });
    // the slots that make up the requested [startsAt, endsAt) range
    const within = daySlots.filter(
      (s) => s.startsAt >= input.startsAt && s.endsAt <= input.endsAt,
    );
    const contiguous =
      within.length > 0 &&
      within[0].startsAt === input.startsAt &&
      within[within.length - 1].endsAt === input.endsAt &&
      within.every((s, i) => i === 0 || s.startsAt === within[i - 1].endsAt);
    if (!contiguous) return fail("VALIDATION", "Please pick consecutive available slots");
    if (!within.every((s) => s.available))
      return fail("SLOT_TAKEN", "One or more of those slots are no longer available", 409);

    const amountDue = within.reduce((sum, s) => sum + s.price, 0);
    const currency = within[0].currency;
    const priceLabel = within.length > 1 ? `${within.length} hours` : within[0].priceLabel;

    const customer = await upsertCustomerByPhone(input.customer.phone, input.customer.name);

    // cap open unpaid reservations per customer (anti-squatting on prime slots)
    const { count: openCount } = await db()
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .eq("customer_id", customer.id)
      .in("status", ["reserved", "pending_payment", "pending_verification"])
      .gt("starts_at", new Date().toISOString());
    if ((openCount ?? 0) >= 3) {
      return fail("VALIDATION", "You have too many unconfirmed bookings. Please complete or cancel one first.", 429);
    }

    const now = new Date();
    const status = initialStatus(input.paymentMethod, "online");
    const hold = computeHoldExpiry(input.paymentMethod, now, new Date(input.startsAt));

    const booking = await insertBookingWithTeams({
      venueId: court.venue.id,
      courtId,
      sportId: input.sportId,
      customerId: customer.id,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      status,
      source: "online",
      paymentMethod: input.paymentMethod,
      holdExpiresAt: hold ? hold.toISOString() : null,
      amountDue,
    });

    // record a payment intent row for manual methods so ops can see it
    if (input.paymentMethod !== "online") {
      await db().from("payments").insert({
        booking_id: booking.id,
        provider: input.paymentMethod === "bank_transfer" ? "bank_transfer" : "cash",
        amount: amountDue,
        status: input.paymentMethod === "bank_transfer" ? "pending_verification" : "initiated",
        method: input.paymentMethod === "bank_transfer" ? "bank" : "cash",
      });
    }

    return ok(
      {
        bookingId: booking.id,
        status: booking.status,
        amountDue,
        currency,
        priceLabel,
        paymentMethod: input.paymentMethod,
        manageToken: booking.management_token,
        manageUrl: `${publicEnv.siteUrl}/manage/${booking.management_token}`,
        holdExpiresAt: booking.hold_expires_at,
        bank: court.venue.settings.bank ?? null,
        whatsappNumber: court.venue.settings.whatsappNumber ?? null,
      },
      201,
    );
  });
}
