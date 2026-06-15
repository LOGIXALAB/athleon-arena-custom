import { type NextRequest } from "next/server";
import { z } from "zod";
import { ok, fail, handle } from "@/lib/api";
import { requireRole } from "@/lib/auth/staff";
import { db } from "@/lib/db/server";
import { audit } from "@/lib/db/audit";

const Body = z.object({
  isActive: z.boolean().optional(),
  role: z.enum(["scorer", "ops_manager", "owner", "admin"]).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const actor = await requireRole("admin");
    const { id } = await params;
    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) return fail("VALIDATION", "Invalid body");
    const patch: Record<string, string | boolean> = {};
    if (parsed.data.isActive !== undefined) patch.is_active = parsed.data.isActive;
    if (parsed.data.role !== undefined) patch.role = parsed.data.role;
    await db().from("staff_users").update(patch).eq("id", id);
    await audit(`staff:${actor.id}`, "staff.update", "staff_user", id, patch);
    return ok({ ok: true });
  });
}
