import { type NextRequest } from "next/server";
import { ok, handle } from "@/lib/api";
import { requireRole } from "@/lib/auth/staff";
import { resolveStaffVenue, getOpsToday } from "@/lib/db/queries/ops";
import { instantToLocalDateISO } from "@/lib/core/booking/slots";

export async function GET(req: NextRequest) {
  return handle(async () => {
    const staff = await requireRole("ops_manager");
    const venue = await resolveStaffVenue(staff.venue_id);
    const dateParam = req.nextUrl.searchParams.get("date");
    const dateISO = dateParam ?? instantToLocalDateISO(new Date().toISOString(), venue.timezone);
    const { courts, bookings } = await getOpsToday(venue, dateISO);
    return ok({ venueId: venue.id, timezone: venue.timezone, dateISO, courts, bookings });
  });
}
