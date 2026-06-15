import { type NextRequest } from "next/server";
import { ok, fail, handle } from "@/lib/api";
import { computeAvailability } from "@/lib/core/booking/availability";
import {
  getCourtsForSport,
  getCourtWithVenue,
  getScheduleForDay,
  getLiveBookingsAround,
  getBlocksAround,
  getActivePricingRules,
  getActiveMembershipByPhone,
} from "@/lib/db/queries/booking";
import { dayOfWeekInTz } from "@/lib/core/booking/slots";

export async function GET(req: NextRequest) {
  return handle(async () => {
    const sp = req.nextUrl.searchParams;
    const sportId = sp.get("sportId");
    const dateISO = sp.get("date"); // YYYY-MM-DD
    const phone = sp.get("phone") ?? undefined;
    let courtId = sp.get("courtId") ?? undefined;

    if (!sportId || !dateISO) return fail("VALIDATION", "sportId and date are required");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateISO)) return fail("VALIDATION", "date must be YYYY-MM-DD");

    if (!courtId) {
      const courts = await getCourtsForSport(sportId);
      if (!courts.length) return ok({ slots: [], courtId: null });
      courtId = courts[0].id;
    }

    const court = await getCourtWithVenue(courtId);
    if (!court) return fail("NOT_FOUND", "Court not found", 404);

    const dow = dayOfWeekInTz(dateISO);
    const schedule = await getScheduleForDay(courtId, dow);

    const dayStart = new Date(`${dateISO}T00:00:00Z`);
    const fromISO = new Date(dayStart.getTime() - 24 * 3600_000).toISOString();
    const toISO = new Date(dayStart.getTime() + 48 * 3600_000).toISOString();

    const [busy, blocks, rules, membership] = await Promise.all([
      getLiveBookingsAround(courtId, fromISO, toISO),
      getBlocksAround(courtId, fromISO, toISO),
      getActivePricingRules(court.venue.id),
      phone ? getActiveMembershipByPhone(phone) : Promise.resolve(null),
    ]);

    const slots = computeAvailability({
      courtId,
      sportId,
      dateISO,
      timezone: court.venue.timezone,
      schedule: schedule
        ? { opens: schedule.opens, closes: schedule.closes, slotMinutes: schedule.slot_minutes }
        : null,
      busy,
      blocks,
      rules,
      membership,
      now: new Date(),
    });

    return ok({
      courtId,
      courtName: court.name,
      timezone: court.venue.timezone,
      slots,
    });
  });
}
