"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/client";
import { browserClient } from "@/lib/db/browser";
import { channels } from "@/lib/realtime/channels";
import { Headline } from "@/components/scoreboard/Headline";
import { ScorecardTable } from "@/components/scoreboard/ScorecardTable";
import type { ScoreboardModel } from "@/lib/core/sports/contract";

interface MatchStateResp {
  scoreboard: ScoreboardModel;
  summary: string;
  isComplete: boolean;
  displayMode: "headline" | "scorecard";
}

export function DisplayClient({
  courtId,
  courtName,
  venueName,
  timezone,
  initialMode,
  initialMatchId,
  initialScoreboard,
  initialSummary,
  initialComplete,
  nextBooking,
}: {
  courtId: string;
  courtName: string;
  venueName: string;
  timezone: string;
  initialMode: "headline" | "scorecard";
  initialMatchId: string | null;
  initialScoreboard: ScoreboardModel | null;
  initialSummary: string | null;
  initialComplete: boolean;
  nextBooking: { startsAt: string; sportId: string; teamA: string; teamB: string } | null;
}) {
  const [matchId, setMatchId] = useState(initialMatchId);
  const [mode, setMode] = useState(initialMode);
  const [sb, setSb] = useState<ScoreboardModel | null>(initialScoreboard);
  const [summary, setSummary] = useState(initialSummary);
  const [complete, setComplete] = useState(initialComplete);
  const [flash, setFlash] = useState<string | null>(null);
  const lastHighlight = useRef<string | null>(null);

  const loadMatch = useCallback(async (id: string) => {
    try {
      const s = await apiFetch<MatchStateResp>(`/api/matches/${id}/state`);
      setSb(s.scoreboard);
      setSummary(s.summary);
      setComplete(s.isComplete);
      setMode(s.displayMode);
    } catch {
      /* ignore transient */
    }
  }, []);

  // flash on a new highlight (wicket/goal/boundary)
  useEffect(() => {
    const h = sb?.highlight ?? null;
    if (h && h !== lastHighlight.current) {
      setFlash(h);
      const t = setTimeout(() => setFlash(null), 1200);
      lastHighlight.current = h;
      return () => clearTimeout(t);
    }
    if (!h) lastHighlight.current = null;
  }, [sb]);

  // court channel: mode switches + match assignment
  useEffect(() => {
    const ch = browserClient()
      .channel(channels.court(courtId), { config: { broadcast: { self: false } } })
      .on("broadcast", { event: "display_mode" }, (m: { payload: { mode: "headline" | "scorecard"; matchId?: string } }) => {
        setMode(m.payload.mode);
        if (m.payload.matchId) setMatchId(m.payload.matchId);
      })
      .on("broadcast", { event: "match_assigned" }, (m: { payload: { matchId: string } }) => {
        setMatchId(m.payload.matchId);
        void loadMatch(m.payload.matchId);
      })
      .on("broadcast", { event: "idle" }, () => setMatchId(null))
      .subscribe();
    return () => {
      void browserClient().removeChannel(ch);
    };
  }, [courtId, loadMatch]);

  // match channel: live updates
  useEffect(() => {
    if (!matchId) return;
    const id = matchId;
    (async () => {
      await loadMatch(id);
    })();
    const ch = browserClient()
      .channel(channels.match(id), { config: { broadcast: { self: false } } })
      .on("broadcast", { event: "*" }, () => void loadMatch(id))
      .subscribe();
    return () => {
      void browserClient().removeChannel(ch);
    };
  }, [matchId, loadMatch]);

  const flashColor =
    flash === "wicket" ? "bg-danger" : flash === "goal" ? "bg-volt" : flash === "boundary" ? "bg-info" : "";

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-bg">
      {flash && <div className={`pointer-events-none absolute inset-0 z-20 ${flashColor} animate-[ping_1.2s_ease-out] opacity-30`} />}

      {!matchId || !sb ? (
        <Idle venueName={venueName} courtName={courtName} timezone={timezone} nextBooking={nextBooking} />
      ) : complete ? (
        <Result sb={sb} summary={summary} />
      ) : mode === "scorecard" ? (
        <ScorecardTable sb={sb} />
      ) : (
        <Headline sb={sb} />
      )}

      <div className="absolute bottom-[2vh] left-[3vw] text-[1.6vh] uppercase tracking-[0.3em] text-fg-faint">
        {venueName} · {courtName}
      </div>
    </div>
  );
}

function Idle({
  venueName,
  courtName,
  timezone,
  nextBooking,
}: {
  venueName: string;
  courtName: string;
  timezone: string;
  nextBooking: { startsAt: string; sportId: string; teamA: string; teamB: string } | null;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <div className="text-[2.4vh] font-semibold uppercase tracking-[0.4em] text-volt">{venueName}</div>
      <div className="numeral mt-[2vh] text-[12vh] font-bold leading-none">{courtName}</div>
      {nextBooking ? (
        <div className="mt-[6vh]">
          <div className="text-[2vh] uppercase tracking-wide text-fg-faint">Next up</div>
          <div className="mt-[1vh] text-[4vh] font-semibold capitalize">
            {nextBooking.teamA} <span className="text-fg-faint">vs</span> {nextBooking.teamB}
          </div>
          <div className="mt-[1vh] text-[2.6vh] text-volt">
            {new Intl.DateTimeFormat("en-US", { timeZone: timezone, hour: "numeric", minute: "2-digit" }).format(new Date(nextBooking.startsAt))}
            <span className="ml-[1vw] capitalize text-fg-muted">· {nextBooking.sportId}</span>
          </div>
        </div>
      ) : (
        <div className="mt-[6vh] text-[2.4vh] text-fg-muted">Play under the floodlights</div>
      )}
    </div>
  );
}

function Result({ sb, summary }: { sb: ScoreboardModel; summary: string | null }) {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <div className="text-[3vh] font-semibold uppercase tracking-[0.3em] text-volt">Full time</div>
      <div className="mt-[3vh] flex items-center justify-center gap-[3vw]">
        <div className="text-[5vh] font-bold uppercase">{sb.headline.home.name} <span className="text-volt">{sb.headline.home.score}</span></div>
        <div className="text-[3vh] text-fg-faint">vs</div>
        <div className="text-[5vh] font-bold uppercase">{sb.headline.away.name} <span className="text-volt">{sb.headline.away.score}</span></div>
      </div>
      <div className="mt-[4vh] text-[3.5vh] font-semibold text-volt">{summary}</div>
    </div>
  );
}
