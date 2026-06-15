import { type NextRequest } from "next/server";
import { ok, handle } from "@/lib/api";
import { deriveMatchSnapshot, getMatchRow } from "@/lib/db/queries/match";
import { db } from "@/lib/db/server";

/** Public derived snapshot — late joiners (display, viewers) catch up here. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const { id } = await params;
    const snap = await deriveMatchSnapshot(id);
    const m = await getMatchRow(id);
    let displayMode = "headline";
    if (m) {
      const { data } = await db().from("court_display_state").select("mode").eq("match_id", id).maybeSingle();
      displayMode = (data as { mode: string } | null)?.mode ?? "headline";
    }
    return ok({
      matchId: snap.matchId,
      sportId: snap.sportId,
      status: snap.status,
      seq: snap.seq,
      scoreboard: snap.scoreboard,
      summary: snap.summary,
      isComplete: snap.isComplete,
      scorerUI: snap.scorerUI,
      defaultFormats: snap.defaultFormats,
      context: snap.context,
      state: snap.state,
      displayMode,
    });
  });
}
