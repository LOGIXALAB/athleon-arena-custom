import { type NextRequest } from "next/server";
import { z } from "zod";
import { ok, fail, handle } from "@/lib/api";
import { publicEnv } from "@/lib/env";
import { feature } from "@/lib/config/features";
import { resolvePrice } from "@/lib/core/pricing/engine";
import { applyMembership } from "@/lib/core/memberships/apply";
import { initialStatus } from "@/lib/core/booking/transitions";
import { computeHoldExpiry } from "@/lib/core/booking/holds";
import {
  dayOfWeekInTz,
  instantToLocalDateISO,
  instantToLocalMinutes,
} from "@/lib/core/booking/slots";
import {
  getCourtsForSport,
  getCourtWithVenue,
  courtSupportsSport,
  getActivePricingRules,
  getActiveMembershipByPhone,
  upsertCustomerByPhone,
  insertBookingWithTeams,
} from "@/lib/db/queries/booking";
import { db } from "@/lib/db/server";
import { zUuid } from "@/lib/validation";

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

    // server-side price (never trust the client)
    const rules = await getActivePricingRules(court.venue.id);
    const localDate = instantToLocalDateISO(input.startsAt, tz);
    const price = resolvePrice(rules, {
      courtId,
      sportId: input.sportId,
      dow: dayOfWeekInTz(localDate),
      startMinutes: instantToLocalMinutes(input.startsAt, tz),
    });
    const membership = await getActiveMembershipByPhone(input.customer.phone);
    const amountDue = applyMembership(price.amount, membership);

    const customer = await upsertCustomerByPhone(input.customer.phone, input.customer.name);
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
        currency: price.currency,
        priceLabel: price.label,
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
