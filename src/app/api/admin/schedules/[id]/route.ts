import { type NextRequest } from "next/server";
import { z } from "zod";
import { ok, fail, handle } from "@/lib/api";
import { requireRole } from "@/lib/auth/staff";
import { db } from "@/lib/db/server";
import { audit } from "@/lib/db/audit";

const Body = z.object({
  opens: z.string().optional(),
  closes: z.string().optional(),
  slotMinutes: z.number().int().min(15).max(240).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const staff = await requireRole("owner");
    const { id } = await params;
    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) return fail("VALIDATION", "Invalid body");
    const patch: Record<string, unknown> = {};
    if (parsed.data.opens) patch.opens = parsed.data.opens;
    if (parsed.data.closes) patch.closes = parsed.data.closes;
    if (parsed.data.slotMinutes) patch.slot_minutes = parsed.data.slotMinutes;
    await db().from("court_schedules").update(patch).eq("id", id);
    await audit(`staff:${staff.id}`, "schedule.update", "court_schedule", id, patch as Record<string, string | number>);
    return ok({ ok: true });
  });
}
