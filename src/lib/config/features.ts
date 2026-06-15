import { db } from "@/lib/db/server";
import { isSupabaseConfigured } from "@/lib/env";
import type { FeatureFlag } from "@/lib/db/tables";

export type FeatureKey =
  | "memberships"
  | "online_payments"
  | "gallery_uploads"
  | "tournaments"
  | "streaming"
  | "fantasy";

const FALLBACK: Record<FeatureKey, boolean> = {
  memberships: true,
  online_payments: false,
  gallery_uploads: true,
  tournaments: false,
  streaming: false,
  fantasy: false,
};

/** Reads all flags (server-side). Falls back to launch defaults when no DB. */
export async function getFeatureFlags(): Promise<Record<FeatureKey, boolean>> {
  if (!isSupabaseConfigured()) return { ...FALLBACK };
  try {
    const { data } = await db().from("feature_flags").select("key, enabled");
    const flags = { ...FALLBACK };
    for (const row of (data ?? []) as Pick<FeatureFlag, "key" | "enabled">[]) {
      if (row.key in flags) flags[row.key as FeatureKey] = row.enabled;
    }
    return flags;
  } catch {
    return { ...FALLBACK };
  }
}

export async function feature(key: FeatureKey): Promise<boolean> {
  return (await getFeatureFlags())[key];
}
