import { requireStaff } from "@/lib/auth/staff";
import { db } from "@/lib/db/server";
import { StaffClient } from "./StaffClient";
import type { StaffUser } from "@/lib/db/tables";

export default async function StaffPage() {
  const me = await requireStaff("owner");
  const { data } = await db()
    .from("staff_users")
    .select("id, email, full_name, role, venue_id, is_active, created_at")
    .order("created_at");
  return (
    <div>
      <h1 className="numeral text-2xl font-bold uppercase">Staff</h1>
      <p className="mt-1 text-sm text-fg-muted">
        {me.role === "admin" ? "Invite and manage staff accounts." : "Staff accounts (admin can add new ones)."}
      </p>
      <StaffClient initial={(data as StaffUser[]) ?? []} canManage={me.role === "admin"} />
    </div>
  );
}
