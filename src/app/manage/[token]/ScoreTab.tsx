"use client";
import { useEffect, useState } from "react";
import type { ManageData } from "./ManageClient";

/**
 * Phase 4: shows the 30-minute-before-slot unlock countdown. Phase 6 replaces
 * the unlocked branch with the live scoring panel (CricketPanel / GenericPad).
 */
export function ScoreTab({ data }: { token: string; data: ManageData }) {
  const unlockAt = new Date(new Date(data.booking.startsAt).getTime() - 30 * 60_000);
  const endAt = new Date(new Date(data.booking.endsAt).getTime() + 30 * 60_000);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const unlocked = now >= unlockAt.getTime() && now <= endAt.getTime();

  if (!unlocked) {
    const ms = unlockAt.getTime() - now;
    const locked = ms > 0;
    return (
      <div className="card p-8 text-center">
        <div className="text-3xl">🔒</div>
        <h3 className="numeral mt-3 text-2xl font-bold uppercase">Scoring locked</h3>
        {locked ? (
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

  return (
    <div className="card p-8 text-center">
      <div className="text-3xl">🟢</div>
      <h3 className="numeral mt-3 text-2xl font-bold uppercase">Scoring unlocked</h3>
      <p className="mt-2 text-sm text-fg-muted">
        The live scoring panel activates here. (Wiring up in the next build phase.)
      </p>
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
