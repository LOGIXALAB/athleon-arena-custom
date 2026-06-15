import { requireStaff } from "@/lib/auth/staff";
import { resolveStaffVenue } from "@/lib/db/queries/ops";
import { getAnalytics } from "@/lib/db/queries/analytics";

export const dynamic = "force-dynamic";

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  await requireStaff("owner");
  const venue = await resolveStaffVenue(null);
  const sp = await searchParams;
  const days = Number(sp.days ?? "30") || 30;
  const to = new Date();
  const from = new Date(to.getTime() - days * 86400000);
  const a = await getAnalytics(venue.id, venue.timezone, from.toISOString(), to.toISOString());

  const maxDay = Math.max(1, ...a.revenueByDay.map((d) => d.amount));
  const maxHeat = Math.max(1, ...a.heatmap.map((h) => h.count));
  const heatAt = (dow: number, hour: number) => a.heatmap.find((h) => h.dow === dow && h.hour === hour)?.count ?? 0;

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="numeral text-2xl font-bold uppercase">Analytics</h1>
        <div className="flex gap-1 text-sm">
          {[7, 30, 90].map((d) => (
            <a key={d} href={`/admin/analytics?days=${d}`} className={"rounded-md border px-3 py-1 transition " + (days === d ? "border-volt bg-volt/10 text-volt" : "border-border-strong hover:bg-surface-2")}>
              {d}d
            </a>
          ))}
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-4">
        <Stat label="Revenue" value={`PKR ${a.totals.revenue.toLocaleString()}`} />
        <Stat label="Bookings" value={String(a.totals.bookings)} />
        <Stat label="Occupancy" value={`${a.occupancy.pct}%`} />
        <Stat label="No-shows" value={`${a.totals.noShows}`} sub={`PKR ${a.totals.noShowLostRevenue.toLocaleString()} lost`} />
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <Card title="Revenue by day">
          <div className="flex h-40 items-end gap-1">
            {a.revenueByDay.length === 0 && <p className="text-sm text-fg-faint">No data in range.</p>}
            {a.revenueByDay.map((d) => (
              <div key={d.date} className="flex flex-1 flex-col items-center justify-end" title={`${d.date}: ${d.amount}`}>
                <div className="w-full rounded-t bg-volt" style={{ height: `${(d.amount / maxDay) * 100}%` }} />
              </div>
            ))}
          </div>
        </Card>

        <Card title="Peak vs Off-peak">
          <BarList items={a.peakSplit.map((p) => ({ label: p.label, value: p.amount, sub: `${p.count} bookings` }))} unit="PKR" />
        </Card>

        <Card title="Online vs Walk-in">
          <BarList items={a.sourceSplit.map((s) => ({ label: s.source.replace("_", " "), value: s.amount, sub: `${s.count} bookings` }))} unit="PKR" />
        </Card>

        <Card title="Sports mix">
          <BarList items={a.sportsMix.map((s) => ({ label: s.sport, value: s.amount, sub: `${s.count} bookings` }))} unit="PKR" />
        </Card>

        <Card title="Payment methods">
          <BarList items={a.methodSplit.map((m) => ({ label: m.method.replace(/_/g, " "), value: m.amount, sub: `${m.count}` }))} unit="PKR" />
        </Card>

        <Card title="Memberships (MRR)">
          <BarList items={a.memberships.map((m) => ({ label: m.plan, value: m.mrr, sub: `${m.members} members` }))} unit="PKR" />
        </Card>
      </div>

      <Card title="Booking heatmap (day × hour)" className="mt-5">
        <div className="overflow-x-auto">
          <div className="min-w-[640px]">
            <div className="flex">
              <div className="w-10" />
              {Array.from({ length: 15 }, (_, i) => i + 9).map((h) => (
                <div key={h} className="flex-1 text-center text-[10px] text-fg-faint">{h}</div>
              ))}
            </div>
            {DOW.map((d, dow) => (
              <div key={d} className="flex items-center">
                <div className="w-10 text-xs text-fg-muted">{d}</div>
                {Array.from({ length: 15 }, (_, i) => i + 9).map((h) => {
                  const c = heatAt(dow, h);
                  return <div key={h} className="m-[1px] h-5 flex-1 rounded-sm" style={{ background: c ? `rgba(200,245,66,${0.15 + (c / maxHeat) * 0.85})` : "var(--surface-2)" }} title={`${d} ${h}:00 — ${c}`} />;
                })}
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card p-4">
      <div className="text-sm text-fg-muted">{label}</div>
      <div className="numeral mt-1 text-2xl font-bold text-volt">{value}</div>
      {sub && <div className="text-xs text-fg-faint">{sub}</div>}
    </div>
  );
}

function Card({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={"card p-5 " + (className ?? "")}>
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-fg-muted">{title}</h3>
      {children}
    </div>
  );
}

function BarList({ items, unit }: { items: { label: string; value: number; sub?: string }[]; unit: string }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  if (items.length === 0) return <p className="text-sm text-fg-faint">No data.</p>;
  return (
    <div className="space-y-2">
      {items.map((i) => (
        <div key={i.label}>
          <div className="flex justify-between text-sm">
            <span className="capitalize">{i.label}</span>
            <span className="text-fg-muted">{unit} {i.value.toLocaleString()}{i.sub ? ` · ${i.sub}` : ""}</span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-surface-3">
            <div className="h-full bg-volt" style={{ width: `${(i.value / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
