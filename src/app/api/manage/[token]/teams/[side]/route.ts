import { type NextRequest } from "next/server";
import { z } from "zod";
import { ok, fail, handle } from "@/lib/api";
import { resolveToken } from "@/lib/auth/manage-token";
import { db } from "@/lib/db/server";
import { publishMatch } from "@/lib/realtime/publish";

type Ctx = { params: Promise<{ token: string; side: string }> };

const Body = z.object({
  name: z.string().max(80).nullable().optional(),
  captainName: z.string().max(80).nullable().optional(),
  contactPhone: z.string().max(20).nullable().optional(),
  logoUrl: z.string().max(400).nullable().optional(),
});

/** Upsert team A/B details. Optional — customers may skip the roster entirely. */
export async function PUT(req: NextRequest, { params }: Ctx) {
  return handle(async () => {
    const { token, side } = await params;
    if (side !== "A" && side !== "B") return fail("VALIDATION", "side must be A or B");
    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) return fail("VALIDATION", parsed.error.issues[0]?.message ?? "Invalid body");
    const b = await resolveToken(token);

    const patch: Record<string, unknown> = {};
    if (parsed.data.name !== undefined) patch.name = parsed.data.name;
    if (parsed.data.captainName !== undefined) patch.captain_name = parsed.data.captainName;
    if (parsed.data.contactPhone !== undefined) patch.contact_phone = parsed.data.contactPhone;
    if (parsed.data.logoUrl !== undefined) patch.logo_url = parsed.data.logoUrl;

    await db().from("teams").update(patch).eq("booking_id", b.booking.id).eq("side", side);

    // names update live everywhere if a match is in progress
    if (b.match) await publishMatch(b.match.id, "roster_updated", { side });
    return ok({ ok: true });
  });
}
