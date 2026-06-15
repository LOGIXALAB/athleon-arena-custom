import { type NextRequest } from "next/server";
import { ok, fail, handle } from "@/lib/api";
import { db } from "@/lib/db/server";
import { requireServerEnv } from "@/lib/env";

/**
 * Runs the maintenance tick: expire stale holds, promote checked-in sessions to
 * in_progress, complete finished sessions, mark no-shows. Idempotent.
 *
 * In production this is also scheduled via pg_cron (see migration). This HTTP
 * entry point covers dev and platforms with external cron (e.g. Vercel Cron).
 * Guard: header `x-cron-secret` must match CRON_SECRET.
 */
async function runTick(req: NextRequest) {
  const { cronSecret } = requireServerEnv();
  // accept either x-cron-secret (manual/dev) or Authorization: Bearer (Vercel Cron)
  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const provided = req.headers.get("x-cron-secret") ?? bearer;
  if (!cronSecret || provided !== cronSecret) return fail("FORBIDDEN", "Bad cron secret", 403);
  const { error } = await db().rpc("athleon_tick");
  if (error) throw error;
  return ok({ ok: true, ranAt: new Date().toISOString() });
}

export async function POST(req: NextRequest) {
  return handle(() => runTick(req));
}

// Vercel Cron issues GET with Authorization: Bearer ${CRON_SECRET}
export async function GET(req: NextRequest) {
  return handle(() => runTick(req));
}
