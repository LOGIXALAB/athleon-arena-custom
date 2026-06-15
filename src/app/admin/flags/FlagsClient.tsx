"use client";
import { useState } from "react";
import { apiFetch } from "@/lib/client";
import type { FeatureFlag } from "@/lib/db/tables";

const LABELS: Record<string, string> = {
  memberships: "Memberships (plans, discounts, marketing section)",
  online_payments: "Online payments (Easypaisa / JazzCash)",
  gallery_uploads: "Gallery uploads",
  tournaments: "Tournaments",
  streaming: "Live streaming",
  fantasy: "Fantasy & player profiles",
};

export function FlagsClient({ initial }: { initial: FeatureFlag[] }) {
  const [flags, setFlags] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);

  async function toggle(key: string, enabled: boolean) {
    setBusy(key);
    setFlags((f) => f.map((x) => (x.key === key ? { ...x, enabled } : x)));
    try {
      await apiFetch(`/api/admin/feature-flags`, { method: "PUT", json: { key, enabled } });
    } catch {
      setFlags((f) => f.map((x) => (x.key === key ? { ...x, enabled: !enabled } : x)));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mt-6 space-y-2">
      {flags.map((f) => (
        <div key={f.key} className="flex items-center justify-between rounded-lg border border-border bg-surface-1 px-4 py-3">
          <div>
            <div className="font-medium">{LABELS[f.key] ?? f.key}</div>
            <div className="text-xs text-fg-faint">{f.key}</div>
          </div>
          <button
            onClick={() => toggle(f.key, !f.enabled)}
            disabled={busy === f.key}
            className={
              "relative h-6 w-11 rounded-full transition " + (f.enabled ? "bg-volt" : "bg-surface-3")
            }
            aria-pressed={f.enabled}
          >
            <span className={"absolute top-0.5 h-5 w-5 rounded-full bg-bg transition " + (f.enabled ? "left-[22px]" : "left-0.5")} />
          </button>
        </div>
      ))}
    </div>
  );
}
