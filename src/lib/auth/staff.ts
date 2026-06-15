import "server-only";
import { redirect } from "next/navigation";
import { supabaseServer } from "./supabase-server";
import { db } from "@/lib/db/server";
import { DomainError } from "@/lib/core/errors";
import type { StaffRole, StaffUser } from "@/lib/db/tables";

/** Role rank for `>=` comparisons. */
const RANK: Record<StaffRole, number> = { scorer: 1, ops_manager: 2, owner: 3, admin: 4 };

export function roleAtLeast(role: StaffRole, min: StaffRole): boolean {
  return RANK[role] >= RANK[min];
}

/** Returns the signed-in staff user, or null. */
export async function getStaffUser(): Promise<StaffUser | null> {
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return null;
  const { data } = await db().from("staff_users").select("*").eq("id", user.id).maybeSingle();
  const staff = data as StaffUser | null;
  if (!staff || !staff.is_active) return null;
  return staff;
}

/** Server-component guard: redirects to /login if not signed in or under-ranked. */
export async function requireStaff(min: StaffRole = "scorer"): Promise<StaffUser> {
  const staff = await getStaffUser();
  if (!staff) redirect(`/login`);
  if (!roleAtLeast(staff.role, min)) redirect(`/login?denied=1`);
  return staff;
}

/** API guard: throws FORBIDDEN instead of redirecting. */
export async function requireRole(min: StaffRole = "scorer"): Promise<StaffUser> {
  const staff = await getStaffUser();
  if (!staff) throw new DomainError("FORBIDDEN", "Sign in required");
  if (!roleAtLeast(staff.role, min)) throw new DomainError("FORBIDDEN", "Insufficient role");
  return staff;
}
