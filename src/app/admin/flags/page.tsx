import { requireStaff } from "@/lib/auth/staff";
import { db } from "@/lib/db/server";
import { FlagsClient } from "./FlagsClient";
import type { FeatureFlag } from "@/lib/db/tables";

export default async function FlagsPage() {
  await requireStaff("owner");
  const { data } = await db().from("feature_flags").select("*").order("key");
  return (
    <div>
      <h1 className="numeral text-2xl font-bold uppercase">Feature flags</h1>
      <p className="mt-1 text-sm text-fg-muted">Turn features on or off across the site instantly.</p>
      <FlagsClient initial={(data as FeatureFlag[]) ?? []} />
    </div>
  );
}
