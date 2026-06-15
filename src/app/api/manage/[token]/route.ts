import { type NextRequest } from "next/server";
import { ok, fail, handle } from "@/lib/api";
import { resolveToken } from "@/lib/auth/manage-token";
import { assertTransition } from "@/lib/core/booking/transitions";
import { db } from "@/lib/db/server";
import { audit } from "@/lib/db/audit";

type Ctx = { params: Promise<{ token: string }> };

/** Public-ish view of a booking, loaded purely by capability token. */
export async function GET(_req: NextRequest, { params }: Ctx) {
  return handle(async () => {
    const { token } = await params;
    const b = await resolveToken(token);
    const scoreUnlockAt = new Date(new Date(b.booking.starts_at).getTime() - 30 * 60_000);
    return ok({
      booking: {
        id: b.booking.id,
        status: b.booking.status,
        sportId: b.booking.sport_id,
        startsAt: b.booking.starts_at,
        endsAt: b.booking.ends_at,
        paymentMethod: b.booking.payment_method,
        amountDue: b.booking.amount_due,
        currency: b.booking.currency,
        managementToken: b.booking.management_token,
      },
      venue: { name: b.venue.name, timezone: b.venue.timezone, settings: b.venue.settings },
      court: { name: b.court.name },
      teams: b.teams.map((t) => ({
        side: t.side,
        name: t.name,
        captainName: t.captain_name,
        contactPhone: t.contact_phone,
        logoUrl: t.logo_url,
        players: t.players.map((p) => ({
          id: p.id,
          name: p.name,
          jerseyNo: p.jersey_no,
          role: p.role,
          sortOrder: p.sort_order,
        })),
      })),
      match: b.match ? { id: b.match.id, status: b.match.status, result: b.match.result } : null,
      payments: b.payments.map((p) => ({ provider: p.provider, status: p.status, amount: p.amount })),
      proofs: b.proofs.map((p) => ({ uploadedAt: p.uploaded_at })),
      scoreUnlockAt: scoreUnlockAt.toISOString(),
    });
  });
}

/** Cancel a booking (policy-gated by cancellation window). */
export async function PATCH(req: NextRequest, { params }: Ctx) {
  return handle(async () => {
    const { token } = await params;
    const body = (await req.json().catch(() => ({}))) as { action?: string };
    const b = await resolveToken(token);
    if (body.action !== "cancel") return fail("VALIDATION", "Unsupported action");

    assertTransition(b.booking.status, "cancelled");

    // cancellation window policy from venue settings
    const windowHours = b.venue.settings.cancellation?.windowHours ?? 0;
    if (windowHours > 0) {
      const cutoff = new Date(b.booking.starts_at).getTime() - windowHours * 3600_000;
      if (Date.now() > cutoff) {
        return fail("FORBIDDEN", `Cancellations must be made at least ${windowHours}h before the slot.`);
      }
    }

    await db().from("bookings").update({ status: "cancelled" }).eq("id", b.booking.id);
    await audit(`customer:${b.booking.customer_id ?? "?"}`, "booking.cancel", "booking", b.booking.id, {
      via: "manage_token",
    });
    return ok({ ok: true, status: "cancelled" });
  });
}
