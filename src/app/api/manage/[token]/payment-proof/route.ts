import { type NextRequest } from "next/server";
import { z } from "zod";
import { ok, fail, handle } from "@/lib/api";
import { resolveToken } from "@/lib/auth/manage-token";
import { db } from "@/lib/db/server";
import { holdAfterProof } from "@/lib/core/booking/holds";
import { publishOps } from "@/lib/realtime/publish";
import { audit } from "@/lib/db/audit";

type Ctx = { params: Promise<{ token: string }> };
const BUCKET = "payment-proofs";

const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("sign"), filename: z.string().max(120) }),
  z.object({ action: z.literal("confirm"), path: z.string().max(300), note: z.string().max(200).optional() }),
]);

export async function POST(req: NextRequest, { params }: Ctx) {
  return handle(async () => {
    const { token } = await params;
    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) return fail("VALIDATION", parsed.error.issues[0]?.message ?? "Invalid body");
    const b = await resolveToken(token);
    const sb = db();

    if (parsed.data.action === "sign") {
      const ext = parsed.data.filename.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
      const path = `${b.booking.id}/${b.booking.id}-${b.proofs.length + 1}.${ext}`;
      const { data, error } = await sb.storage.from(BUCKET).createSignedUploadUrl(path);
      if (error) throw error;
      return ok({ uploadUrl: data.signedUrl, token: data.token, path: data.path });
    }

    // confirm
    await sb.from("payment_proofs").insert({
      booking_id: b.booking.id,
      storage_path: parsed.data.path,
      note: parsed.data.note ?? null,
    });
    // a proof in hand should never expire before ops can look at it
    if (b.booking.payment_method === "bank_transfer" && b.booking.status === "pending_verification") {
      await sb
        .from("bookings")
        .update({ hold_expires_at: holdAfterProof(new Date(b.booking.starts_at)).toISOString() })
        .eq("id", b.booking.id);
    }
    await audit(`customer:${b.booking.customer_id ?? "?"}`, "payment.proof_uploaded", "booking", b.booking.id);
    await publishOps(b.booking.venue_id, "proof_uploaded", { bookingId: b.booking.id });
    return ok({ ok: true });
  });
}
