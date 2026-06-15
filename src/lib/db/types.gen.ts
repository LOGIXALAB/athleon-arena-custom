/**
 * Loose Database generic for the service-role client. The app's real type
 * safety comes from hand-authored row types in ./tables.ts (kept in sync with
 * supabase/migrations/0001_init.sql). To generate the full schema types later:
 *   supabase login && supabase link --project-ref <ref> && npm run db:types
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = any;
