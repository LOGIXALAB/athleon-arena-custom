import { requireStaff } from "@/lib/auth/staff";
import { db } from "@/lib/db/server";
import type { AuditLogRow } from "@/lib/db/tables";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  await requireStaff("owner");
  const { data } = await db().from("audit_log").select("*").order("created_at", { ascending: false }).limit(200);
  const rows = (data as AuditLogRow[]) ?? [];
  return (
    <div>
      <h1 className="numeral text-2xl font-bold uppercase">Audit log</h1>
      <p className="mt-1 text-sm text-fg-muted">Every staff mutation, most recent first.</p>
      <div className="mt-5 overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface-2 text-left text-xs uppercase text-fg-muted">
            <tr><th className="px-3 py-2">When</th><th className="px-3 py-2">Actor</th><th className="px-3 py-2">Action</th><th className="px-3 py-2">Entity</th><th className="px-3 py-2">Detail</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-border align-top">
                <td className="px-3 py-2 text-fg-muted">{new Date(r.created_at).toLocaleString()}</td>
                <td className="px-3 py-2">{r.actor}</td>
                <td className="px-3 py-2 font-medium">{r.action}</td>
                <td className="px-3 py-2 text-fg-muted">{r.entity}{r.entity_id ? `:${r.entity_id.slice(0, 8)}` : ""}</td>
                <td className="px-3 py-2 text-xs text-fg-faint">{r.detail ? JSON.stringify(r.detail) : ""}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={5} className="px-3 py-4 text-fg-faint">No audit entries yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
