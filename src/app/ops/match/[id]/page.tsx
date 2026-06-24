import { redirect } from "next/navigation";
import Link from "next/link";
import { requireStaff } from "@/lib/auth/staff";
import { db } from "@/lib/db/server";
import { SportRegistry } from "@/lib/core/sports/registry";
import { StartMatch } from "./StartMatch";
import type { Booking, Match } from "@/lib/db/tables";

/** Ops match control: starts a match for a checked-in booking, then hands off to /score. */
export default async function OpsMatchPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff("ops_manager");
  const { id } = await params;
  const { data: bookingData } = await db().from("bookings").select("*").eq("id", id).maybeSingle();
  const booking = bookingData as Booking | null;
  if (!booking) redirect("/ops");

  const { data: matchRows } = await db()
    .from("matches")
    .select("*")
    .eq("booking_id", id)
    .order("created_at", { ascending: false })
    .limit(1);
  const latest = (matchRows as Match[] | null)?.[0] ?? null;
  // Active match → hand off to scoring. A finished match → fall through to the
  // format picker so staff can start a fresh match (allowed while time remains).
  if (latest && latest.status !== "completed" && latest.status !== "abandoned") {
    redirect(`/score/${latest.id}`);
  }

  const formats = SportRegistry.has(booking.sport_id)
    ? SportRegistry.get(booking.sport_id).defaultFormats.map((f) => ({ id: f.id, label: f.label }))
    : [];

  return (
    <main className="mx-auto max-w-md px-5 py-10">
      <Link href="/ops" className="text-sm text-fg-muted transition hover:text-fg">← Ops</Link>
      <h1 className="numeral mb-1 mt-2 text-2xl font-bold uppercase">Start match</h1>
      <p className="mb-6 text-sm text-fg-muted capitalize">{booking.sport_id} · pick a format</p>
      <StartMatch bookingId={id} formats={formats} />
    </main>
  );
}
