import { type NextRequest } from "next/server";
import { z } from "zod";
import { ok, fail, handle } from "@/lib/api";
import { requireRole } from "@/lib/auth/staff";
import { db } from "@/lib/db/server";
import { audit } from "@/lib/db/audit";
import { zUuid } from "@/lib/validation";

const Body = z.object({
  courtId: zUuid,
  startsAt: z.string().datetime({ offset: true }),
  endsAt: z.string().datetime({ offset: true }),
  reason: z.string().max(120).optional(),
});

export async function POST(req: NextRequest) {
  return handle(async () => {
    const staff = await requireRole("owner");
    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) return fail("VALIDATION", parsed.error.issues[0]?.message ?? "Invalid body");
    const { data, error } = await db()
      .from("court_blocks")
      .insert({ court_id: parsed.data.courtId, starts_at: parsed.data.startsAt, ends_at: parsed.data.endsAt, reason: parsed.data.reason ?? null })
      .select("*")
      .single();
    if (error) throw error;
    await audit(`staff:${staff.id}`, "block.create", "court_block", (data as { id: string }).id);
    return ok({ block: data }, 201);
  });
}

export async function DELETE(req: NextRequest) {
  return handle(async () => {
    const staff = await requireRole("owner");
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return fail("VALIDATION", "id required");
    await db().from("court_blocks").delete().eq("id", id);
    await audit(`staff:${staff.id}`, "block.delete", "court_block", id);
    return ok({ ok: true });
  });
}
