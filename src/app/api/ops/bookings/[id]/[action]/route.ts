import { type NextRequest } from "next/server";
import { ok, fail, handle } from "@/lib/api";
import { requireRole } from "@/lib/auth/staff";
import {
  confirmPayment,
  markArrived,
  recordCash,
  cancelBooking,
  markNoShow,
  extendBooking,
} from "@/lib/db/queries/ops";

type Ctx = { params: Promise<{ id: string; action: string }> };

export async function POST(req: NextRequest, { params }: Ctx) {
  return handle(async () => {
    const staff = await requireRole("ops_manager");
    const { id, action } = await params;
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

    switch (action) {
      case "confirm-payment":
        return ok({ booking: await confirmPayment(id, staff.id) });
      case "arrive":
        return ok({ booking: await markArrived(id, staff.id, { withCash: Boolean(body.withCash) }) });
      case "cash-payment": {
        const amount = Number(body.amount);
        if (!amount || amount <= 0) return fail("VALIDATION", "amount required");
        return ok({ booking: await recordCash(id, amount, staff.id) });
      }
      case "cancel":
        return ok({ booking: await cancelBooking(id, staff.id) });
      case "no-show":
        return ok({ booking: await markNoShow(id, staff.id) });
      case "extend": {
        const minutes = Number(body.minutes);
        if (!minutes || minutes <= 0) return fail("VALIDATION", "minutes required");
        return ok({ booking: await extendBooking(id, minutes, staff.id) });
      }
      default:
        return fail("VALIDATION", `Unknown action: ${action}`);
    }
  });
}
