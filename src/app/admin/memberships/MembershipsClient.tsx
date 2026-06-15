"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/client";
import type { MembershipPlan } from "@/lib/db/tables";

interface Member {
  id: string;
  planId: string;
  phone: string;
  name: string | null;
  startsOn: string;
  endsOn: string;
}

export function MembershipsClient({ plans: initialPlans }: { plans: MembershipPlan[] }) {
  const [plans, setPlans] = useState(initialPlans);
  const [members, setMembers] = useState<Member[]>([]);
  const [assign, setAssign] = useState({ phone: "", name: "", planId: initialPlans[0]?.id ?? "", months: "1" });
  const [newPlan, setNewPlan] = useState({ id: "", name: "", monthlyPrice: "", discountPct: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    apiFetch<{ members: Member[] }>(`/api/admin/memberships`).then((d) => setMembers(d.members)).catch(() => {});
  }, []);

  async function assignMember() {
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/api/admin/memberships`, { method: "POST", json: { phone: assign.phone, name: assign.name || undefined, planId: assign.planId, months: Number(assign.months) || 1 } });
      const d = await apiFetch<{ members: Member[] }>(`/api/admin/memberships`);
      setMembers(d.members);
      setAssign({ ...assign, phone: "", name: "" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function addPlan() {
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/api/admin/membership-plans`, { method: "POST", json: { id: newPlan.id, name: newPlan.name, monthlyPrice: Number(newPlan.monthlyPrice), discountPct: Number(newPlan.discountPct) } });
      const { plans: p } = await apiFetch<{ plans: MembershipPlan[] }>(`/api/admin/membership-plans`);
      setPlans(p);
      setNewPlan({ id: "", name: "", monthlyPrice: "", discountPct: "" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  const planName = (id: string) => plans.find((p) => p.id === id)?.name ?? id;

  return (
    <div className="mt-5 grid gap-5 lg:grid-cols-2">
      <div className="card p-5">
        <h3 className="mb-3 text-sm font-semibold uppercase text-fg-muted">Plans</h3>
        <div className="space-y-2">
          {plans.map((p) => (
            <div key={p.id} className="flex items-center justify-between rounded-md border border-border bg-surface-1 px-3 py-2 text-sm">
              <span className="font-medium">{p.name}</span>
              <span className="text-fg-muted">{p.discount_pct}% off · PKR {Number(p.monthly_price).toLocaleString()}/mo</span>
            </div>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <input className="input" placeholder="id (e.g. platinum)" value={newPlan.id} onChange={(e) => setNewPlan({ ...newPlan, id: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "") })} />
          <input className="input" placeholder="Name" value={newPlan.name} onChange={(e) => setNewPlan({ ...newPlan, name: e.target.value })} />
          <input className="input" placeholder="PKR/month" inputMode="numeric" value={newPlan.monthlyPrice} onChange={(e) => setNewPlan({ ...newPlan, monthlyPrice: e.target.value.replace(/\D/g, "") })} />
          <input className="input" placeholder="Discount %" inputMode="numeric" value={newPlan.discountPct} onChange={(e) => setNewPlan({ ...newPlan, discountPct: e.target.value.replace(/\D/g, "") })} />
        </div>
        <button onClick={addPlan} disabled={busy || !newPlan.id || !newPlan.name} className="mt-3 rounded-md border border-border-strong bg-surface-2 px-4 py-2 text-sm font-medium disabled:opacity-40">Add plan</button>
      </div>

      <div className="card p-5">
        <h3 className="mb-3 text-sm font-semibold uppercase text-fg-muted">Assign member</h3>
        <div className="grid grid-cols-2 gap-2">
          <input className="input" placeholder="Phone" value={assign.phone} onChange={(e) => setAssign({ ...assign, phone: e.target.value })} />
          <input className="input" placeholder="Name (optional)" value={assign.name} onChange={(e) => setAssign({ ...assign, name: e.target.value })} />
          <select className="input" value={assign.planId} onChange={(e) => setAssign({ ...assign, planId: e.target.value })}>
            {plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <input className="input" placeholder="Months" inputMode="numeric" value={assign.months} onChange={(e) => setAssign({ ...assign, months: e.target.value.replace(/\D/g, "") })} />
        </div>
        {error && <p className="mt-2 text-sm text-danger">{error}</p>}
        <button onClick={assignMember} disabled={busy || assign.phone.length < 6} className="mt-3 rounded-md bg-volt px-4 py-2 text-sm font-semibold text-[#07090a] disabled:opacity-40">Assign membership</button>

        <h4 className="mb-2 mt-5 text-xs font-semibold uppercase text-fg-muted">Active members ({members.length})</h4>
        <div className="max-h-52 space-y-1 overflow-y-auto">
          {members.map((m) => (
            <div key={m.id} className="flex items-center justify-between rounded-md bg-surface-2 px-3 py-1.5 text-sm">
              <span>{m.name ?? m.phone}</span>
              <span className="text-xs text-fg-muted">{planName(m.planId)} · ends {m.endsOn}</span>
            </div>
          ))}
          {members.length === 0 && <p className="text-xs text-fg-faint">No active members yet.</p>}
        </div>
      </div>
    </div>
  );
}
