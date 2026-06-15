import { requireStaff } from "@/lib/auth/staff";
import { resolveStaffVenue } from "@/lib/db/queries/ops";
import { db } from "@/lib/db/server";
import { getActiveSports } from "@/lib/db/queries/public";
import { PricingClient } from "./PricingClient";
import type { Court, PricingRule } from "@/lib/db/tables";

export const dynamic = "force-dynamic";

export default async function PricingPage() {
  await requireStaff("owner");
  const venue = await resolveStaffVenue(null);
  const [{ data: rules }, { data: courts }, sports] = await Promise.all([
    db().from("pricing_rules").select("*").eq("venue_id", venue.id).order("priority", { ascending: false }),
    db().from("courts").select("*").eq("venue_id", venue.id),
    getActiveSports(),
  ]);
  return (
    <div>
      <h1 className="numeral text-2xl font-bold uppercase">Pricing</h1>
      <p className="mt-1 text-sm text-fg-muted">Most-specific rule wins. Add peak overrides and per-sport rates.</p>
      <PricingClient
        initial={(rules as PricingRule[]) ?? []}
        courts={(courts as Court[])?.map((c) => ({ id: c.id, name: c.name })) ?? []}
        sports={sports.map((s) => ({ id: s.id, name: s.name }))}
      />
    </div>
  );
}
