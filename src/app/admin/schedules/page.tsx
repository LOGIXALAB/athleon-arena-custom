import { requireStaff } from "@/lib/auth/staff";
import { resolveStaffVenue } from "@/lib/db/queries/ops";
import { db } from "@/lib/db/server";
import { SchedulesClient } from "./SchedulesClient";
import type { Court, CourtBlock, CourtSchedule } from "@/lib/db/tables";

export const dynamic = "force-dynamic";

export default async function SchedulesPage() {
  await requireStaff("owner");
  const venue = await resolveStaffVenue(null);
  const { data: courts } = await db().from("courts").select("*").eq("venue_id", venue.id);
  const courtList = (courts as Court[]) ?? [];
  const courtIds = courtList.map((c) => c.id);
  const [{ data: scheds }, { data: blocks }] = await Promise.all([
    db().from("court_schedules").select("*").in("court_id", courtIds).order("day_of_week"),
    db().from("court_blocks").select("*").in("court_id", courtIds).gte("ends_at", new Date().toISOString()).order("starts_at"),
  ]);
  return (
    <div>
      <h1 className="numeral text-2xl font-bold uppercase">Schedules &amp; blocks</h1>
      <p className="mt-1 text-sm text-fg-muted">Court opening hours and maintenance / event blocks.</p>
      <SchedulesClient
        courts={courtList.map((c) => ({ id: c.id, name: c.name }))}
        schedules={(scheds as CourtSchedule[]) ?? []}
        blocks={(blocks as CourtBlock[]) ?? []}
        timezone={venue.timezone}
      />
    </div>
  );
}
