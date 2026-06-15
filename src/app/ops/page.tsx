import { requireStaff } from "@/lib/auth/staff";
import { resolveStaffVenue, getOpsToday } from "@/lib/db/queries/ops";
import { getActiveSports } from "@/lib/db/queries/public";
import { instantToLocalDateISO } from "@/lib/core/booking/slots";
import { OpsBoard } from "./OpsBoard";

export default async function OpsPage() {
  const staff = await requireStaff("ops_manager");
  const venue = await resolveStaffVenue(staff.venue_id);
  const dateISO = instantToLocalDateISO(new Date().toISOString(), venue.timezone);
  const [{ courts, bookings }, sports] = await Promise.all([
    getOpsToday(venue, dateISO),
    getActiveSports(),
  ]);

  return (
    <OpsBoard
      venueId={venue.id}
      timezone={venue.timezone}
      dateISO={dateISO}
      courts={courts.map((c) => ({ id: c.id, name: c.name }))}
      sports={sports.map((s) => ({ id: s.id, name: s.name }))}
      initialBookings={bookings}
      siteUrl={process.env.NEXT_PUBLIC_SITE_URL ?? ""}
    />
  );
}
