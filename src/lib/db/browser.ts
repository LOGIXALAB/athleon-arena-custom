"use client";
import { createBrowserClient } from "@supabase/ssr";
import { publicEnv } from "@/lib/env";

/**
 * Anon browser client — used for Supabase Realtime subscriptions on public
 * broadcast channels (display screens, scorer panels, manage-token customers).
 * Reads only what RLS/public broadcast permits; never holds privileged data.
 */
let cached: ReturnType<typeof createBrowserClient> | null = null;

export function browserClient() {
  if (cached) return cached;
  cached = createBrowserClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey);
  return cached;
}
