import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { requireServerEnv } from "@/lib/env";
import type { Database } from "./types.gen";

/**
 * Service-role Supabase client. Bypasses RLS — NEVER import this into a
 * client component. All customer/public data access goes through API routes
 * or server components that use this client.
 */
let cached: SupabaseClient<Database> | null = null;

export function db(): SupabaseClient<Database> {
  if (cached) return cached;
  const { url, serviceRole } = requireServerEnv();
  cached = createClient<Database>(url, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
