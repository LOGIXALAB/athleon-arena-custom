import { type NextRequest } from "next/server";
import { z } from "zod";
import { ok, fail, handle } from "@/lib/api";
import { requireRole } from "@/lib/auth/staff";
import { createWalkIn } from "@/lib/db/queries/ops";
import { zUuid } from "@/lib/validation";

const Body = z.object({
  courtId: zUuid,
  sportId: z.string().min(1),
  startsAt: z.string().datetime({ offset: true }),
  endsAt: z.string().datetime({ offset: true }),
  phone: z.string().min(6).max(20),
  name: z.string().max(80).optional(),
  amount: z.number().positive().optional(),
});

/** Walk-in: ops creates a confirmed booking + records cash. */
export async function POST(req: NextRequest) {
  return handle(async () => {
    const staff = await requireRole("ops_manager");
    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) return fail("VALIDATION", parsed.error.issues[0]?.message ?? "Invalid body");
    const booking = await createWalkIn(parsed.data, staff.id);
    return ok({ bookingId: booking.id, managementToken: booking.management_token }, 201);
  });
}
