import { type NextRequest } from "next/server";
import { z } from "zod";
import { ok, fail, handle } from "@/lib/api";
import { zUuid } from "@/lib/validation";
import { authorizeBookingScoring } from "@/lib/auth/scoring-auth";
import { createMatchForBooking } from "@/lib/db/queries/match";
import { db } from "@/lib/db/server";
import { DomainError } from "@/lib/core/errors";
import type { Booking } from "@/lib/db/tables";

const Body = z.object({ bookingId: zUuid, formatId: z.string().min(1) });

/** Create (or fetch) the match for a booking. Dual auth: staff or manage token. */
export async function POST(req: NextRequest) {
  return handle(async () => {
    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) return fail("VALIDATION", "bookingId and formatId required");
    const { data } = await db().from("bookings").select("*").eq("id", parsed.data.bookingId).maybeSingle();
    const booking = data as Booking | null;
    if (!booking) throw new DomainError("NOT_FOUND", "Booking not found");
    const who = await authorizeBookingScoring(req, booking);
    const match = await createMatchForBooking(parsed.data.bookingId, parsed.data.formatId, who.staffId ? `staff:${who.staffId}` : "customer:manage_token");
    return ok({ matchId: match.id, status: match.status }, 201);
  });
}
