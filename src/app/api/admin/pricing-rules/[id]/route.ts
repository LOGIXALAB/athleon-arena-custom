import { type NextRequest } from "next/server";
import { z } from "zod";
import { ok, fail, handle } from "@/lib/api";
import { requireRole } from "@/lib/auth/staff";
import { db } from "@/lib/db/server";
import { audit } from "@/lib/db/audit";

type Ctx = { params: Promise<{ id: string }> };

const Body = z.object({
  pricePerSlot: z.number().positive().optional(),
  label: z.string().max(40).nullable().optional(),
  priority: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: Ctx) {
  return handle(async () => {
    const staff = await requireRole("owner");
    const { id } = await params;
    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) return fail("VALIDATION", "Invalid body");
    const patch: Record<string, unknown> = {};
    if (parsed.data.pricePerSlot !== undefined) patch.price_per_slot = parsed.data.pricePerSlot;
    if (parsed.data.label !== undefined) patch.label = parsed.data.label;
    if (parsed.data.priority !== undefined) patch.priority = parsed.data.priority;
    if (parsed.data.isActive !== undefined) patch.is_active = parsed.data.isActive;
    await db().from("pricing_rules").update(patch).eq("id", id);
    await audit(`staff:${staff.id}`, "pricing_rule.update", "pricing_rule", id, patch as Record<string, string | number | boolean>);
    return ok({ ok: true });
  });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  return handle(async () => {
    const staff = await requireRole("owner");
    const { id } = await params;
    await db().from("pricing_rules").delete().eq("id", id);
    await audit(`staff:${staff.id}`, "pricing_rule.delete", "pricing_rule", id);
    return ok({ ok: true });
  });
}
