/**
 * Placeholder Supabase types. Regenerated in Phase 1 via:
 *   npm run db:types   (supabase gen types typescript --linked)
 * Until the schema is pushed, this keeps the service-role client typed loosely.
 */
// deno-lint-ignore-file
/* eslint-disable @typescript-eslint/no-explicit-any */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = any;
