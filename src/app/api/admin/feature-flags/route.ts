import { type NextRequest } from "next/server";
import { z } from "zod";
import { ok, fail, handle } from "@/lib/api";
import { requireRole } from "@/lib/auth/staff";
import { db } from "@/lib/db/server";
import { audit } from "@/lib/db/audit";

export async function GET() {
  return handle(async () => {
    await requireRole("owner");
    const { data } = await db().from("feature_flags").select("*").order("key");
    return ok({ flags: data ?? [] });
  });
}

const Body = z.object({ key: z.string().min(1), enabled: z.boolean() });

export async function PUT(req: NextRequest) {
  return handle(async () => {
    const staff = await requireRole("owner");
    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) return fail("VALIDATION", "key and enabled required");
    await db().from("feature_flags").update({ enabled: parsed.data.enabled }).eq("key", parsed.data.key);
    await audit(`staff:${staff.id}`, "feature_flag.update", "feature_flag", parsed.data.key, { enabled: parsed.data.enabled });
    return ok({ ok: true });
  });
}
