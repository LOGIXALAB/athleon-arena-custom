"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/client";

export function StartMatch({ bookingId, formats }: { bookingId: string; formats: { id: string; label: string }[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start(formatId: string) {
    setBusy(true);
    setError(null);
    try {
      const r = await apiFetch<{ matchId: string }>(`/api/matches`, { method: "POST", json: { bookingId, formatId } });
      router.push(`/score/${r.matchId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start match");
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-2">
      {error && <p className="text-sm text-danger">{error}</p>}
      {formats.map((f) => (
        <button
          key={f.id}
          onClick={() => start(f.id)}
          disabled={busy}
          className="rounded-lg border border-border-strong bg-surface-2 px-4 py-3 text-sm font-medium transition hover:bg-surface-3 disabled:opacity-40"
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}
