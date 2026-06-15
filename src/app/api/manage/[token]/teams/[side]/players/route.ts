import { type NextRequest } from "next/server";
import { z } from "zod";
import { ok, fail, handle } from "@/lib/api";
import { resolveToken } from "@/lib/auth/manage-token";
import { db } from "@/lib/db/server";
import { publishMatch } from "@/lib/realtime/publish";

type Ctx = { params: Promise<{ token: string; side: string }> };

const Body = z.object({
  name: z.string().min(1).max(60),
  jerseyNo: z.number().int().min(0).max(999).nullable().optional(),
  role: z.string().max(40).nullable().optional(),
});

/** Add a player to a team. */
export async function POST(req: NextRequest, { params }: Ctx) {
  return handle(async () => {
    const { token, side } = await params;
    if (side !== "A" && side !== "B") return fail("VALIDATION", "side must be A or B");
    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) return fail("VALIDATION", parsed.error.issues[0]?.message ?? "Invalid body");
    const b = await resolveToken(token);
    const team = b.teams.find((t) => t.side === side);
    if (!team) return fail("NOT_FOUND", "Team not found", 404);

    const nextSort = team.players.length;
    const { data, error } = await db()
      .from("players")
      .insert({
        team_id: team.id,
        name: parsed.data.name,
        jersey_no: parsed.data.jerseyNo ?? null,
        role: parsed.data.role ?? null,
        sort_order: nextSort,
      })
      .select("*")
      .single();
    if (error) throw error;

    if (b.match) await publishMatch(b.match.id, "roster_updated", { side });
    return ok({ player: data }, 201);
  });
}
