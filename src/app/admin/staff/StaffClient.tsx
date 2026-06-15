"use client";
import { useState } from "react";
import { apiFetch } from "@/lib/client";
import type { StaffUser } from "@/lib/db/tables";

export function StaffClient({ initial, canManage }: { initial: StaffUser[]; canManage: boolean }) {
  const [staff, setStaff] = useState(initial);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ email: "", fullName: "", role: "scorer", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function toggleActive(s: StaffUser) {
    setStaff((list) => list.map((x) => (x.id === s.id ? { ...x, is_active: !x.is_active } : x)));
    await apiFetch(`/api/admin/staff/${s.id}`, { method: "PATCH", json: { isActive: !s.is_active } }).catch(() => {});
  }

  async function create() {
    setBusy(true);
    setError(null);
    try {
      const { id } = await apiFetch<{ id: string }>(`/api/admin/staff`, { method: "POST", json: form });
      setStaff((l) => [
        ...l,
        { id, email: form.email, full_name: form.fullName, role: form.role as StaffUser["role"], venue_id: null, is_active: true, created_at: new Date().toISOString() },
      ]);
      setAdding(false);
      setForm({ email: "", fullName: "", role: "scorer", password: "" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-6">
      {canManage && (
        <button onClick={() => setAdding((v) => !v)} className="mb-4 rounded-md bg-volt px-4 py-2 text-sm font-semibold text-[#07090a] transition hover:bg-volt-dim">
          {adding ? "Cancel" : "+ Invite staff"}
        </button>
      )}
      {adding && (
        <div className="card mb-4 grid gap-3 p-4 sm:grid-cols-2">
          <input className="input" placeholder="Full name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
          <input className="input" placeholder="email@athleon.pk" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            <option value="scorer">Scorer</option>
            <option value="ops_manager">Ops manager</option>
            <option value="owner">Owner</option>
            <option value="admin">Admin</option>
          </select>
          <input className="input" type="password" placeholder="Temp password (min 8)" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          {error && <p className="text-sm text-danger sm:col-span-2">{error}</p>}
          <button onClick={create} disabled={busy} className="rounded-md bg-volt px-4 py-2 text-sm font-semibold text-[#07090a] disabled:opacity-40 sm:col-span-2">
            {busy ? "Creating…" : "Create account"}
          </button>
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface-2 text-left text-xs uppercase text-fg-muted">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Email</th>
              <th className="px-4 py-2">Role</th>
              <th className="px-4 py-2">Status</th>
              {canManage && <th className="px-4 py-2" />}
            </tr>
          </thead>
          <tbody>
            {staff.map((s) => (
              <tr key={s.id} className="border-t border-border">
                <td className="px-4 py-2 font-medium">{s.full_name}</td>
                <td className="px-4 py-2 text-fg-muted">{s.email}</td>
                <td className="px-4 py-2 capitalize">{s.role.replace("_", " ")}</td>
                <td className="px-4 py-2">{s.is_active ? <span className="text-ok">Active</span> : <span className="text-fg-faint">Disabled</span>}</td>
                {canManage && (
                  <td className="px-4 py-2 text-right">
                    <button onClick={() => toggleActive(s)} className="text-xs text-fg-muted hover:text-fg">
                      {s.is_active ? "Disable" : "Enable"}
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
