import { type NextRequest } from "next/server";
import { z } from "zod";
import { ok, fail, handle } from "@/lib/api";
import { resolveToken } from "@/lib/auth/manage-token";
import { db } from "@/lib/db/server";
import { publishMatch } from "@/lib/realtime/publish";

type Ctx = { params: Promise<{ token: string; playerId: string }> };

const Body = z.object({
  name: z.string().min(1).max(60).optional(),
  jerseyNo: z.number().int().min(0).max(999).nullable().optional(),
  role: z.string().max(40).nullable().optional(),
});

function playerBelongs(b: Awaited<ReturnType<typeof resolveToken>>, playerId: string) {
  return b.teams.some((t) => t.players.some((p) => p.id === playerId));
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  return handle(async () => {
    const { token, playerId } = await params;
    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) return fail("VALIDATION", parsed.error.issues[0]?.message ?? "Invalid body");
    const b = await resolveToken(token);
    if (!playerBelongs(b, playerId)) return fail("NOT_FOUND", "Player not found", 404);

    const patch: Record<string, unknown> = {};
    if (parsed.data.name !== undefined) patch.name = parsed.data.name;
    if (parsed.data.jerseyNo !== undefined) patch.jersey_no = parsed.data.jerseyNo;
    if (parsed.data.role !== undefined) patch.role = parsed.data.role;
    await db().from("players").update(patch).eq("id", playerId);

    if (b.match) await publishMatch(b.match.id, "roster_updated", { playerId });
    return ok({ ok: true });
  });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  return handle(async () => {
    const { token, playerId } = await params;
    const b = await resolveToken(token);
    if (!playerBelongs(b, playerId)) return fail("NOT_FOUND", "Player not found", 404);
    await db().from("players").delete().eq("id", playerId);
    if (b.match) await publishMatch(b.match.id, "roster_updated", { playerId });
    return ok({ ok: true });
  });
}
