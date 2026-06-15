import { type NextRequest } from "next/server";
import { z } from "zod";
import { ok, fail, handle } from "@/lib/api";
import { requireRole } from "@/lib/auth/staff";
import { db } from "@/lib/db/server";
import { upsertCustomerByPhone } from "@/lib/db/queries/booking";
import { audit } from "@/lib/db/audit";

export async function GET() {
  return handle(async () => {
    await requireRole("owner");
    const sb = db();
    const { data } = await sb
      .from("memberships")
      .select("id, plan_id, status, starts_on, ends_on, customer_id")
      .eq("status", "active")
      .order("ends_on", { ascending: false })
      .limit(200);
    const rows = (data as { id: string; plan_id: string; status: string; starts_on: string; ends_on: string; customer_id: string }[]) ?? [];
    const ids = [...new Set(rows.map((r) => r.customer_id))];
    const { data: custs } = ids.length ? await sb.from("customers").select("id, phone, full_name").in("id", ids) : { data: [] };
    const cmap = new Map((custs as { id: string; phone: string; full_name: string | null }[] ?? []).map((c) => [c.id, c]));
    return ok({
      members: rows.map((r) => ({
        id: r.id, planId: r.plan_id, status: r.status, startsOn: r.starts_on, endsOn: r.ends_on,
        phone: cmap.get(r.customer_id)?.phone ?? "", name: cmap.get(r.customer_id)?.full_name ?? null,
      })),
    });
  });
}

const Body = z.object({
  phone: z.string().min(6).max(20),
  name: z.string().max(80).optional(),
  planId: z.string().min(1),
  months: z.number().int().min(1).max(36).default(1),
});

export async function POST(req: NextRequest) {
  return handle(async () => {
    const staff = await requireRole("owner");
    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) return fail("VALIDATION", parsed.error.issues[0]?.message ?? "Invalid body");
    const d = parsed.data;
    const customer = await upsertCustomerByPhone(d.phone, d.name);
    const start = new Date();
    const end = new Date(start);
    end.setMonth(end.getMonth() + d.months);
    const { error } = await db().from("memberships").insert({
      customer_id: customer.id, plan_id: d.planId,
      starts_on: start.toISOString().slice(0, 10), ends_on: end.toISOString().slice(0, 10), status: "active",
    });
    if (error) return fail("VALIDATION", error.message);
    await audit(`staff:${staff.id}`, "membership.assign", "customer", customer.id, { planId: d.planId, months: d.months });
    return ok({ ok: true }, 201);
  });
}
