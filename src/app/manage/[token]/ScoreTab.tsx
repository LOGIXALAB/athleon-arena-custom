"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/client";
import { ScorePanel } from "@/components/scoring/ScorePanel";
import type { ManageData } from "./ManageClient";

export function ScoreTab({
  token,
  data,
  formats,
}: {
  token: string;
  data: ManageData;
  formats: { id: string; label: string }[];
}) {
  const unlockAt = new Date(new Date(data.booking.startsAt).getTime() - 30 * 60_000);
  const endAt = new Date(new Date(data.booking.endsAt).getTime() + 30 * 60_000);
  const [now, setNow] = useState(() => Date.now());
  const [matchId, setMatchId] = useState<string | null>(data.match?.id ?? null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const unlocked = now >= unlockAt.getTime() && now <= endAt.getTime();

  if (!unlocked) {
    const ms = unlockAt.getTime() - now;
    return (
      <div className="card p-8 text-center">
        <div className="text-3xl">🔒</div>
        <h3 className="numeral mt-3 text-2xl font-bold uppercase">Scoring locked</h3>
        {ms > 0 ? (
          <>
            <p className="mt-2 text-sm text-fg-muted">Unlocks 30 minutes before your slot.</p>
            <div className="numeral mt-4 text-4xl font-bold text-volt">{fmtCountdown(ms)}</div>
          </>
        ) : (
          <p className="mt-2 text-sm text-fg-muted">This match has ended.</p>
        )}
      </div>
    );
  }

  if (matchId) {
    return (
      <ScorePanel
        matchId={matchId}
        manageToken={token}
        endsAt={data.booking.endsAt}
        onStartNewMatch={() => setMatchId(null)}
      />
    );
  }

  async function startMatch(formatId: string) {
    setStarting(true);
    setError(null);
    try {
      const r = await apiFetch<{ matchId: string }>(`/api/matches`, {
        method: "POST",
        json: { bookingId: data.booking.id, formatId },
        manageToken: token,
      });
      setMatchId(r.matchId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start match");
    } finally {
      setStarting(false);
    }
  }

  return (
    <div className="card p-6 text-center">
      <div className="text-3xl">🟢</div>
      <h3 className="numeral mt-3 text-2xl font-bold uppercase">Ready to score</h3>
      <p className="mt-2 text-sm text-fg-muted">Pick a format to start your match.</p>
      {error && <p className="mt-3 text-sm text-danger">{error}</p>}
      <div className="mx-auto mt-5 grid max-w-sm gap-2">
        {formats.map((f) => (
          <button
            key={f.id}
            onClick={() => startMatch(f.id)}
            disabled={starting}
            className="rounded-lg border border-border-strong bg-surface-2 px-4 py-3 text-sm font-medium transition hover:bg-surface-3 disabled:opacity-40"
          >
            {f.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function fmtCountdown(ms: number): string {
  const total = Math.floor(ms / 1000);
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
