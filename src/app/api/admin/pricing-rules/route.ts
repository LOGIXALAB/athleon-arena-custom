import { type NextRequest } from "next/server";
import { z } from "zod";
import { ok, fail, handle } from "@/lib/api";
import { requireRole } from "@/lib/auth/staff";
import { resolveStaffVenue } from "@/lib/db/queries/ops";
import { db } from "@/lib/db/server";
import { audit } from "@/lib/db/audit";
import { zUuid } from "@/lib/validation";

export async function GET() {
  return handle(async () => {
    await requireRole("owner");
    const venue = await resolveStaffVenue(null);
    const { data } = await db().from("pricing_rules").select("*").eq("venue_id", venue.id).order("priority", { ascending: false });
    return ok({ rules: data ?? [] });
  });
}

const Body = z.object({
  courtId: zUuid.nullable().optional(),
  sportId: z.string().nullable().optional(),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).nullable().optional(),
  timeFrom: z.string().nullable().optional(),
  timeTo: z.string().nullable().optional(),
  pricePerSlot: z.number().positive(),
  label: z.string().max(40).nullable().optional(),
  priority: z.number().int().default(0),
});

export async function POST(req: NextRequest) {
  return handle(async () => {
    const staff = await requireRole("owner");
    const venue = await resolveStaffVenue(null);
    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) return fail("VALIDATION", parsed.error.issues[0]?.message ?? "Invalid body");
    const d = parsed.data;
    const { data, error } = await db()
      .from("pricing_rules")
      .insert({
        venue_id: venue.id,
        court_id: d.courtId ?? null,
        sport_id: d.sportId ?? null,
        days_of_week: d.daysOfWeek && d.daysOfWeek.length ? d.daysOfWeek : null,
        time_from: d.timeFrom || null,
        time_to: d.timeTo || null,
        price_per_slot: d.pricePerSlot,
        label: d.label ?? null,
        priority: d.priority,
        is_active: true,
      })
      .select("*")
      .single();
    if (error) throw error;
    await audit(`staff:${staff.id}`, "pricing_rule.create", "pricing_rule", (data as { id: string }).id, d);
    return ok({ rule: data }, 201);
  });
}
