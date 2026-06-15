import { type NextRequest } from "next/server";
import { z } from "zod";
import { ok, fail, handle } from "@/lib/api";
import { requireRole } from "@/lib/auth/staff";
import { db } from "@/lib/db/server";
import { audit } from "@/lib/db/audit";

export async function GET() {
  return handle(async () => {
    await requireRole("owner");
    const { data } = await db().from("membership_plans").select("*").order("display_order");
    return ok({ plans: data ?? [] });
  });
}

const Body = z.object({
  id: z.string().min(1).max(30).regex(/^[a-z0-9_]+$/, "lowercase id"),
  name: z.string().min(1).max(40),
  monthlyPrice: z.number().nonnegative(),
  discountPct: z.number().min(0).max(100),
  freePracticeHours: z.number().int().min(0).default(0),
  priorityBookingDays: z.number().int().min(0).default(0),
});

export async function POST(req: NextRequest) {
  return handle(async () => {
    const staff = await requireRole("owner");
    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) return fail("VALIDATION", parsed.error.issues[0]?.message ?? "Invalid body");
    const d = parsed.data;
    const { error } = await db().from("membership_plans").insert({
      id: d.id, name: d.name, monthly_price: d.monthlyPrice, discount_pct: d.discountPct,
      free_practice_hours: d.freePracticeHours, priority_booking_days: d.priorityBookingDays,
      perks: [`${d.discountPct}% off bookings`], display_order: 99, is_active: true,
    });
    if (error) return fail("VALIDATION", error.message);
    await audit(`staff:${staff.id}`, "membership_plan.create", "membership_plan", d.id, d);
    return ok({ ok: true }, 201);
  });
}
