import { type NextRequest } from "next/server";
import { ok, handle } from "@/lib/api";
import { requireRole } from "@/lib/auth/staff";
import { resolveStaffVenue, getOpsToday, getOpsRange } from "@/lib/db/queries/ops";
import { instantToLocalDateISO } from "@/lib/core/booking/slots";

export async function GET(req: NextRequest) {
  return handle(async () => {
    const staff = await requireRole("ops_manager");
    const venue = await resolveStaffVenue(staff.venue_id);
    const sp = req.nextUrl.searchParams;
    const from = sp.get("from");
    const to = sp.get("to");
    // range (week/month calendar) when both from & to provided; else a single day
    if (from && to) {
      const { courts, bookings } = await getOpsRange(venue, from, to);
      return ok({ venueId: venue.id, timezone: venue.timezone, from, to, courts, bookings });
    }
    const dateISO = sp.get("date") ?? instantToLocalDateISO(new Date().toISOString(), venue.timezone);
    const { courts, bookings } = await getOpsToday(venue, dateISO);
    return ok({ venueId: venue.id, timezone: venue.timezone, dateISO, courts, bookings });
  });
}
