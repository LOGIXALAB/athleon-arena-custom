import { type NextRequest } from "next/server";
import { z } from "zod";
import { ok, fail, handle } from "@/lib/api";
import { requireRole } from "@/lib/auth/staff";
import { db } from "@/lib/db/server";
import { audit } from "@/lib/db/audit";
import { zUuid } from "@/lib/validation";

export async function GET() {
  return handle(async () => {
    await requireRole("owner");
    const { data } = await db()
      .from("staff_users")
      .select("id, email, full_name, role, venue_id, is_active, created_at")
      .order("created_at");
    return ok({ staff: data ?? [] });
  });
}

const Body = z.object({
  email: z.string().email(),
  fullName: z.string().min(1).max(80),
  role: z.enum(["scorer", "ops_manager", "owner", "admin"]),
  password: z.string().min(8).max(72),
  venueId: zUuid.nullable().optional(),
});

export async function POST(req: NextRequest) {
  return handle(async () => {
    const actor = await requireRole("admin"); // staff accounts require admin
    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) return fail("VALIDATION", parsed.error.issues[0]?.message ?? "Invalid body");
    const sb = db();

    const { data: created, error } = await sb.auth.admin.createUser({
      email: parsed.data.email,
      password: parsed.data.password,
      email_confirm: true,
    });
    if (error || !created.user) return fail("VALIDATION", error?.message ?? "Could not create user");

    const { error: upErr } = await sb.from("staff_users").insert({
      id: created.user.id,
      email: parsed.data.email,
      full_name: parsed.data.fullName,
      role: parsed.data.role,
      venue_id: parsed.data.venueId ?? null,
      is_active: true,
    });
    if (upErr) return fail("VALIDATION", upErr.message);
    await audit(`staff:${actor.id}`, "staff.create", "staff_user", created.user.id, { role: parsed.data.role });
    return ok({ ok: true, id: created.user.id }, 201);
  });
}
