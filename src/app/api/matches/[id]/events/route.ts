import { type NextRequest } from "next/server";
import { z } from "zod";
import { ok, fail, handle } from "@/lib/api";
import { authorizeScoring } from "@/lib/auth/scoring-auth";
import { appendMatchEvent, getEventsFrom } from "@/lib/db/queries/match";

type Ctx = { params: Promise<{ id: string }> };

/** Event log (replay / catch-up). Public. */
export async function GET(req: NextRequest, { params }: Ctx) {
  return handle(async () => {
    const { id } = await params;
    const fromSeq = Number(req.nextUrl.searchParams.get("fromSeq") ?? "0");
    return ok({ events: await getEventsFrom(id, isNaN(fromSeq) ? 0 : fromSeq) });
  });
}

const Body = z.object({ type: z.string().min(1), payload: z.record(z.string(), z.unknown()).default({}) });

/** Append an event. Dual auth: staff session or manage token (within window). */
export async function POST(req: NextRequest, { params }: Ctx) {
  return handle(async () => {
    const { id } = await params;
    const who = await authorizeScoring(req, id);
    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) return fail("VALIDATION", "type and payload required");
    const result = await appendMatchEvent(
      id,
      { type: parsed.data.type, payload: parsed.data.payload as Record<string, unknown> },
      who.staffId,
      who.via,
    );
    return ok(result, 201);
  });
}
