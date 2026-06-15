import { type NextRequest } from "next/server";
import { ok, fail, handle } from "@/lib/api";
import { authorizeScoring } from "@/lib/auth/scoring-auth";
import { revertMatchEvent } from "@/lib/db/queries/match";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string; seq: string }> }) {
  return handle(async () => {
    const { id, seq } = await params;
    await authorizeScoring(req, id);
    const target = Number(seq);
    if (isNaN(target)) return fail("VALIDATION", "Invalid seq");
    const snap = await revertMatchEvent(id, target);
    return ok({ seq: snap.seq, scoreboard: snap.scoreboard, summary: snap.summary });
  });
}
