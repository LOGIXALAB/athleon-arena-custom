"use client";
import { useMemo, useState } from "react";
import { apiFetch } from "@/lib/client";
import { resolvePrice, type PricingRuleInput } from "@/lib/core/pricing/engine";
import type { PricingRule } from "@/lib/db/tables";

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function PricingClient({
  initial,
  courts,
  sports,
}: {
  initial: PricingRule[];
  courts: { id: string; name: string }[];
  sports: { id: string; name: string }[];
}) {
  const [rules, setRules] = useState(initial);
  const [form, setForm] = useState({ sportId: "", days: [] as number[], timeFrom: "", timeTo: "", price: "", label: "", priority: "0" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // live preview
  const [pvSport, setPvSport] = useState(sports[0]?.id ?? "");
  const [pvDow, setPvDow] = useState(5);
  const [pvTime, setPvTime] = useState("19:00");

  const preview = useMemo(() => {
    const input: PricingRuleInput[] = rules.map((r) => ({
      id: r.id, court_id: r.court_id, sport_id: r.sport_id, days_of_week: r.days_of_week,
      time_from: r.time_from, time_to: r.time_to, price_per_slot: Number(r.price_per_slot),
      currency: r.currency, label: r.label, priority: r.priority, is_active: r.is_active,
    }));
    try {
      const [h, m] = pvTime.split(":").map(Number);
      const r = resolvePrice(input, { courtId: courts[0]?.id ?? "", sportId: pvSport, dow: pvDow, startMinutes: h * 60 + (m || 0) });
      return `PKR ${r.amount.toLocaleString()}${r.label ? ` · ${r.label}` : ""}`;
    } catch {
      return "No rule matches";
    }
  }, [rules, pvSport, pvDow, pvTime, courts]);

  async function add() {
    setBusy(true);
    setError(null);
    try {
      const { rule } = await apiFetch<{ rule: PricingRule }>(`/api/admin/pricing-rules`, {
        method: "POST",
        json: {
          sportId: form.sportId || null,
          daysOfWeek: form.days.length ? form.days : null,
          timeFrom: form.timeFrom ? `${form.timeFrom}:00` : null,
          timeTo: form.timeTo ? `${form.timeTo}:00` : null,
          pricePerSlot: Number(form.price),
          label: form.label || null,
          priority: Number(form.priority) || 0,
        },
      });
      setRules((r) => [rule, ...r]);
      setForm({ sportId: "", days: [], timeFrom: "", timeTo: "", price: "", label: "", priority: "0" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setRules((r) => r.filter((x) => x.id !== id));
    await apiFetch(`/api/admin/pricing-rules/${id}`, { method: "DELETE" }).catch(() => {});
  }

  return (
    <div className="mt-5 grid gap-5 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface-2 text-left text-xs uppercase text-fg-muted">
              <tr><th className="px-3 py-2">Label</th><th className="px-3 py-2">Sport</th><th className="px-3 py-2">Days</th><th className="px-3 py-2">Window</th><th className="px-3 py-2">Price</th><th className="px-3 py-2">Pri</th><th /></tr>
            </thead>
            <tbody>
              {rules.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="px-3 py-2 font-medium">{r.label ?? "—"}</td>
                  <td className="px-3 py-2 capitalize">{r.sport_id ?? "any"}</td>
                  <td className="px-3 py-2">{r.days_of_week ? r.days_of_week.map((d) => DOW[d]).join(",") : "all"}</td>
                  <td className="px-3 py-2">{r.time_from ? `${r.time_from.slice(0, 5)}–${r.time_to?.slice(0, 5)}` : "all day"}</td>
                  <td className="px-3 py-2 font-medium">{Number(r.price_per_slot).toLocaleString()}</td>
                  <td className="px-3 py-2">{r.priority}</td>
                  <td className="px-3 py-2 text-right"><button onClick={() => remove(r.id)} className="text-xs text-fg-faint hover:text-danger">Delete</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card mt-5 p-4">
          <h3 className="mb-3 text-sm font-semibold uppercase text-fg-muted">Add rule</h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <select className="input" value={form.sportId} onChange={(e) => setForm({ ...form, sportId: e.target.value })}>
              <option value="">Any sport</option>
              {sports.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <input className="input" placeholder="Label (Peak)" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
            <input className="input" placeholder="Price (PKR)" inputMode="numeric" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value.replace(/\D/g, "") })} />
            <input className="input" type="time" value={form.timeFrom} onChange={(e) => setForm({ ...form, timeFrom: e.target.value })} />
            <input className="input" type="time" value={form.timeTo} onChange={(e) => setForm({ ...form, timeTo: e.target.value })} />
            <input className="input" placeholder="Priority" inputMode="numeric" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value.replace(/\D/g, "") })} />
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {DOW.map((d, i) => (
              <button key={d} onClick={() => setForm({ ...form, days: form.days.includes(i) ? form.days.filter((x) => x !== i) : [...form.days, i] })} className={"rounded-md border px-2 py-1 text-xs transition " + (form.days.includes(i) ? "border-volt bg-volt/10 text-volt" : "border-border-strong")}>
                {d}
              </button>
            ))}
            <span className="ml-2 self-center text-xs text-fg-faint">{form.days.length === 0 ? "all days" : ""}</span>
          </div>
          {error && <p className="mt-2 text-sm text-danger">{error}</p>}
          <button onClick={add} disabled={busy || !form.price} className="mt-3 rounded-md bg-volt px-4 py-2 text-sm font-semibold text-[#07090a] disabled:opacity-40">Add rule</button>
        </div>
      </div>

      <div className="card h-fit p-4">
        <h3 className="mb-3 text-sm font-semibold uppercase text-fg-muted">Price preview</h3>
        <div className="space-y-2">
          <select className="input" value={pvSport} onChange={(e) => setPvSport(e.target.value)}>
            {sports.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select className="input" value={pvDow} onChange={(e) => setPvDow(Number(e.target.value))}>
            {DOW.map((d, i) => <option key={d} value={i}>{d}</option>)}
          </select>
          <input className="input" type="time" value={pvTime} onChange={(e) => setPvTime(e.target.value)} />
        </div>
        <div className="mt-4 rounded-lg border border-volt/30 bg-volt/5 p-4 text-center">
          <div className="text-xs uppercase tracking-wide text-fg-muted">Would cost</div>
          <div className="numeral mt-1 text-2xl font-bold text-volt">{preview}</div>
        </div>
      </div>
    </div>
  );
}
