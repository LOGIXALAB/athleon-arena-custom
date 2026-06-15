import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth/staff";
import { feature } from "@/lib/config/features";
import { db } from "@/lib/db/server";
import { MembershipsClient } from "./MembershipsClient";
import type { MembershipPlan } from "@/lib/db/tables";

export const dynamic = "force-dynamic";

export default async function MembershipsAdminPage() {
  await requireStaff("owner");
  if (!(await feature("memberships"))) notFound();
  const { data: plans } = await db().from("membership_plans").select("*").order("display_order");
  return (
    <div>
      <h1 className="numeral text-2xl font-bold uppercase">Memberships</h1>
      <p className="mt-1 text-sm text-fg-muted">Plans and member assignments. Discounts apply automatically at booking.</p>
      <MembershipsClient plans={(plans as MembershipPlan[]) ?? []} />
    </div>
  );
}
