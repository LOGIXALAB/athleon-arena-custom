import { NextResponse } from "next/server";
import { db } from "@/lib/db/server";
import { isSupabaseConfigured } from "@/lib/env";

/** Phase 1 verification: confirms DB connectivity + seed counts. */
export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { ok: false, reason: "Supabase not configured (.env.local missing keys)" },
      { status: 503 },
    );
  }
  try {
    const sb = db();
    const tables = ["venues", "sports", "courts", "pricing_rules", "membership_plans", "bookings", "feature_flags"] as const;
    const counts: Record<string, number> = {};
    for (const t of tables) {
      const { count, error } = await sb.from(t).select("*", { count: "exact", head: true });
      if (error) throw error;
      counts[t] = count ?? 0;
    }
    return NextResponse.json({ ok: true, counts });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
