import { type NextRequest } from "next/server";
import { z } from "zod";
import { ok, fail, handle } from "@/lib/api";
import { authorizeScoring } from "@/lib/auth/scoring-auth";
import { setDisplayMode } from "@/lib/db/queries/match";

const Body = z.object({ mode: z.enum(["headline", "scorecard"]) });

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const { id } = await params;
    await authorizeScoring(req, id);
    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) return fail("VALIDATION", "mode must be headline or scorecard");
    const r = await setDisplayMode(id, parsed.data.mode);
    return ok(r);
  });
}
