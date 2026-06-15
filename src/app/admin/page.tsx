import Link from "next/link";
import { requireStaff } from "@/lib/auth/staff";
import { resolveStaffVenue, getOpsToday } from "@/lib/db/queries/ops";
import { instantToLocalDateISO } from "@/lib/core/booking/slots";

export default async function AdminHome() {
  await requireStaff("owner");
  const venue = await resolveStaffVenue(null);
  const dateISO = instantToLocalDateISO(new Date().toISOString(), venue.timezone);
  const { bookings } = await getOpsToday(venue, dateISO);
  const revenue = bookings
    .filter((b) => ["confirmed", "checked_in", "in_progress", "completed"].includes(b.status))
    .reduce((n, b) => n + b.amountDue, 0);

  const cards = [
    { label: "Bookings today", value: String(bookings.length) },
    { label: "Confirmed revenue today", value: `PKR ${revenue.toLocaleString()}` },
    { label: "Awaiting verification", value: String(bookings.filter((b) => b.status === "pending_verification").length) },
  ];

  return (
    <div>
      <h1 className="numeral text-3xl font-bold uppercase">{venue.name}</h1>
      <p className="mt-1 text-sm text-fg-muted">Owner dashboard</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="card p-5">
            <div className="text-sm text-fg-muted">{c.label}</div>
            <div className="numeral mt-1 text-3xl font-bold text-volt">{c.value}</div>
          </div>
        ))}
      </div>
      <div className="mt-6 flex flex-wrap gap-3 text-sm">
        <Link href="/admin/flags" className="rounded-md border border-border-strong bg-surface-2 px-4 py-2 transition hover:bg-surface-3">Feature flags</Link>
        <Link href="/admin/staff" className="rounded-md border border-border-strong bg-surface-2 px-4 py-2 transition hover:bg-surface-3">Manage staff</Link>
        <Link href="/ops" className="rounded-md border border-border-strong bg-surface-2 px-4 py-2 transition hover:bg-surface-3">Open ops console</Link>
      </div>
    </div>
  );
}
