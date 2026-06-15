"use client";
import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/client";
import { browserClient } from "@/lib/db/browser";
import { channels } from "@/lib/realtime/channels";
import type { MatchContext, ScoreboardModel, NamedFormat, ScorerUI } from "@/lib/core/sports/contract";
import { CricketPanel } from "./CricketPanel";
import { GenericPad } from "./GenericPad";

export interface Snapshot {
  matchId: string;
  sportId: string;
  status: string;
  seq: number;
  scoreboard: ScoreboardModel;
  summary: string;
  isComplete: boolean;
  scorerUI: ScorerUI;
  defaultFormats: NamedFormat[];
  context: MatchContext;
  state: unknown;
  displayMode: "headline" | "scorecard";
}

export function ScorePanel({ matchId, manageToken }: { matchId: string; manageToken?: string }) {
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const reload = useCallback(async () => {
    const s = await apiFetch<Snapshot>(`/api/matches/${matchId}/state`);
    setSnap(s);
  }, [matchId]);

  useEffect(() => {
    (async () => {
      try {
        await reload();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load");
      }
    })();
    const ch = browserClient()
      .channel(channels.match(matchId), { config: { broadcast: { self: false } } })
      .on("broadcast", { event: "*" }, () => void reload())
      .subscribe();
    return () => {
      void browserClient().removeChannel(ch);
    };
  }, [matchId, reload]);

  const send = useCallback(
    async (type: string, payload: Record<string, unknown>) => {
      setPending(true);
      setError(null);
      try {
        await apiFetch(`/api/matches/${matchId}/events`, { method: "POST", json: { type, payload }, manageToken });
        await reload();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Action failed");
      } finally {
        setPending(false);
      }
    },
    [matchId, manageToken, reload],
  );

  const revertLast = useCallback(async () => {
    if (!snap || snap.seq <= 0) return;
    setPending(true);
    setError(null);
    try {
      await apiFetch(`/api/matches/${matchId}/events/${snap.seq}/revert`, { method: "POST", json: {}, manageToken });
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Undo failed");
    } finally {
      setPending(false);
    }
  }, [matchId, manageToken, snap, reload]);

  const setDisplay = useCallback(
    async (mode: "headline" | "scorecard") => {
      try {
        await apiFetch(`/api/matches/${matchId}/display-mode`, { method: "POST", json: { mode }, manageToken });
        setSnap((s) => (s ? { ...s, displayMode: mode } : s));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not switch display");
      }
    },
    [matchId, manageToken],
  );

  if (error && !snap) return <div className="card p-6 text-danger">{error}</div>;
  if (!snap) return <div className="card p-6 text-fg-muted">Loading match…</div>;

  const sb = snap.scoreboard;
  return (
    <div className="space-y-4">
      {/* headline */}
      <div className="card p-4">
        <div className="flex items-center justify-between">
          <Side name={sb.headline.home.name} score={sb.headline.home.score} />
          <span className="text-xs text-fg-faint">vs</span>
          <Side name={sb.headline.away.name} score={sb.headline.away.score} right />
        </div>
        <div className="mt-2 text-center text-sm text-volt">{snap.summary}</div>
      </div>

      {/* display control */}
      <div className="flex items-center justify-between rounded-lg border border-border bg-surface-1 p-2 text-sm">
        <span className="px-2 text-fg-muted">Big screen</span>
        <div className="flex gap-1">
          {(["headline", "scorecard"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setDisplay(m)}
              className={"rounded-md px-3 py-1.5 capitalize transition " + (snap.displayMode === m ? "bg-volt text-[#07090a]" : "text-fg-muted hover:text-fg")}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      {/* sport-specific scorer UI */}
      {snap.sportId === "cricket" ? (
        <CricketPanel snap={snap} send={send} revertLast={revertLast} pending={pending} />
      ) : (
        <GenericPad snap={snap} send={send} revertLast={revertLast} pending={pending} />
      )}
    </div>
  );
}

function Side({ name, score, right }: { name: string; score: string; right?: boolean }) {
  return (
    <div className={right ? "text-right" : ""}>
      <div className="text-sm text-fg-muted">{name}</div>
      <div className="numeral text-3xl font-bold">{score}</div>
    </div>
  );
}
