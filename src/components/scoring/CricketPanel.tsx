"use client";
import { useState } from "react";
import type { Snapshot } from "./ScorePanel";
import type { CricketState } from "@/lib/core/sports/cricket/types";
import type { PlayerRef } from "@/lib/core/sports/contract";

type Side = "A" | "B";
const other = (s: Side): Side => (s === "A" ? "B" : "A");
const label = (p: PlayerRef) => (p.jerseyNo ? `${p.name} (${p.jerseyNo})` : p.name);

export function CricketPanel({
  snap,
  send,
  revertLast,
  pending,
}: {
  snap: Snapshot;
  send: (type: string, payload: Record<string, unknown>) => void;
  revertLast: () => void;
  pending: boolean;
}) {
  const st = snap.state as CricketState;
  const players = snap.context.players;
  const inn = st.innings[st.current];

  if (st.phase === "completed") {
    return (
      <div className="card p-6 text-center">
        <div className="numeral text-2xl font-bold uppercase text-volt">Result</div>
        <p className="mt-2 text-sm text-fg-muted">{st.resultSummary ?? snap.summary}</p>
      </div>
    );
  }

  // ---- toss ----
  if (st.phase === "setup" && !st.toss) {
    return <TossForm players={players} send={send} pending={pending} ctx={snap.context} />;
  }

  // ---- start innings ----
  if (st.phase === "setup" || st.phase === "between_innings") {
    const battingSide: Side =
      st.phase === "between_innings"
        ? other(st.innings[0].battingSide)
        : st.toss!.decision === "bat"
          ? st.toss!.wonBy
          : other(st.toss!.wonBy);
    return (
      <StartInnings
        battingSide={battingSide}
        batters={players[battingSide]}
        bowlers={players[other(battingSide)]}
        which={st.phase === "between_innings" ? "2nd" : "1st"}
        send={send}
        pending={pending}
        ctx={snap.context}
      />
    );
  }

  // ---- live ----
  const battingSide = inn.battingSide;
  const bowlingSide = other(battingSide);

  if (st.needsNewBatter) {
    const available = players[battingSide].filter(
      (p) => p.id !== inn.strikerId && p.id !== inn.nonStrikerId && !inn.batters[p.id]?.out,
    );
    const end: "striker" | "non_striker" = inn.strikerId === "" ? "striker" : "non_striker";
    return <PickPlayer title="New batter in" players={available} onPick={(id) => send("NEW_BATTER", { playerId: id, end })} pending={pending} />;
  }

  if (st.needsNewBowler) {
    const available = players[bowlingSide].filter((p) => p.id !== inn.prevOverBowlerId);
    return <PickPlayer title="New bowler" players={available} onPick={(id) => send("NEW_BOWLER", { playerId: id })} pending={pending} />;
  }

  return <BallPad inn={inn} battingSide={battingSide} send={send} revertLast={revertLast} pending={pending} canUndo={snap.seq > 0} />;
}

function TossForm({ send, pending }: { players: { A: PlayerRef[]; B: PlayerRef[] }; ctx: Snapshot["context"]; send: (t: string, p: Record<string, unknown>) => void; pending: boolean }) {
  const [wonBy, setWonBy] = useState<Side>("A");
  const [decision, setDecision] = useState<"bat" | "bowl">("bat");
  return (
    <div className="card space-y-3 p-5">
      <h3 className="font-semibold">Toss</h3>
      <Choice label="Won by" value={wonBy} options={[["A", "Team A"], ["B", "Team B"]]} onChange={(v) => setWonBy(v as Side)} />
      <Choice label="Elected to" value={decision} options={[["bat", "Bat"], ["bowl", "Bowl"]]} onChange={(v) => setDecision(v as "bat" | "bowl")} />
      <button onClick={() => send("TOSS", { wonBy, decision })} disabled={pending} className="w-full rounded-lg bg-volt py-2.5 font-semibold text-[#07090a] disabled:opacity-40">
        Record toss
      </button>
    </div>
  );
}

function StartInnings({
  battingSide,
  batters,
  bowlers,
  which,
  send,
  pending,
}: {
  battingSide: Side;
  batters: PlayerRef[];
  bowlers: PlayerRef[];
  which: string;
  send: (t: string, p: Record<string, unknown>) => void;
  pending: boolean;
  ctx: Snapshot["context"];
}) {
  const [striker, setStriker] = useState(batters[0]?.id ?? "");
  const [nonStriker, setNonStriker] = useState(batters[1]?.id ?? "");
  const [bowler, setBowler] = useState(bowlers[0]?.id ?? "");
  return (
    <div className="card space-y-3 p-5">
      <h3 className="font-semibold">{which} innings · Team {battingSide} batting</h3>
      <Select label="Striker" value={striker} onChange={setStriker} options={batters.map((p) => [p.id, label(p)])} />
      <Select label="Non-striker" value={nonStriker} onChange={setNonStriker} options={batters.filter((p) => p.id !== striker).map((p) => [p.id, label(p)])} />
      <Select label="Opening bowler" value={bowler} onChange={setBowler} options={bowlers.map((p) => [p.id, label(p)])} />
      <button
        onClick={() => send("INNINGS_START", { battingSide, strikerId: striker, nonStrikerId: nonStriker || null, bowlerId: bowler })}
        disabled={pending || !striker || !bowler}
        className="w-full rounded-lg bg-volt py-2.5 font-semibold text-[#07090a] disabled:opacity-40"
      >
        Start innings
      </button>
    </div>
  );
}

function PickPlayer({ title, players, onPick, pending }: { title: string; players: PlayerRef[]; onPick: (id: string) => void; pending: boolean }) {
  return (
    <div className="card space-y-2 p-5">
      <h3 className="font-semibold text-volt">{title}</h3>
      <div className="grid grid-cols-2 gap-2">
        {players.map((p) => (
          <button key={p.id} onClick={() => onPick(p.id)} disabled={pending} className="rounded-md border border-border-strong bg-surface-2 px-3 py-2 text-sm transition hover:bg-surface-3 disabled:opacity-40">
            {label(p)}
          </button>
        ))}
        {players.length === 0 && <p className="col-span-2 text-sm text-fg-faint">No players available — add some in Teams &amp; Players.</p>}
      </div>
    </div>
  );
}

function BallPad({
  inn,
  send,
  revertLast,
  pending,
  canUndo,
}: {
  inn: CricketState["innings"][number];
  battingSide: Side;
  send: (t: string, p: Record<string, unknown>) => void;
  revertLast: () => void;
  pending: boolean;
  canUndo: boolean;
}) {
  const [extraMode, setExtraMode] = useState<null | "bye" | "leg_bye">(null);
  const [wicket, setWicket] = useState(false);

  const runButton = (n: number) => {
    if (extraMode) {
      send("BALL", { batRuns: 0, extra: { kind: extraMode, runs: n } });
      setExtraMode(null);
    } else {
      send("BALL", { batRuns: n });
    }
  };

  const strikerName = inn.batters[inn.strikerId]?.playerId ?? "";
  void strikerName;

  return (
    <div className="space-y-3">
      <div className="card p-3 text-sm text-fg-muted">
        Striker on strike · {inn.recentBalls.join(" ") || "—"}
      </div>

      {extraMode && (
        <div className="rounded-md border border-warn/40 bg-warn/10 px-3 py-2 text-sm text-warn">
          {extraMode === "bye" ? "Byes" : "Leg byes"} — tap how many were run
          <button onClick={() => setExtraMode(null)} className="ml-2 underline">cancel</button>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        {[0, 1, 2, 3, 4, 6].map((n) => (
          <button
            key={n}
            onClick={() => runButton(n)}
            disabled={pending}
            className="numeral rounded-lg border border-border-strong bg-surface-2 py-5 text-2xl font-bold transition hover:bg-surface-3 disabled:opacity-40"
          >
            {n}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-4 gap-2 text-sm">
        <Extra label="Wide" onClick={() => send("BALL", { batRuns: 0, extra: { kind: "wide", runs: 0 } })} disabled={pending || !!extraMode} />
        <Extra label="No-ball" onClick={() => send("BALL", { batRuns: 0, extra: { kind: "no_ball", runs: 0 } })} disabled={pending || !!extraMode} />
        <Extra label="Bye" onClick={() => setExtraMode("bye")} disabled={pending} active={extraMode === "bye"} />
        <Extra label="Leg bye" onClick={() => setExtraMode("leg_bye")} disabled={pending} active={extraMode === "leg_bye"} />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <button onClick={() => setWicket(true)} disabled={pending} className="rounded-lg border border-danger/40 bg-danger/10 py-3 font-semibold text-danger transition hover:bg-danger/20 disabled:opacity-40">
          Wicket
        </button>
        <button onClick={() => send("INNINGS_END", {})} disabled={pending} className="rounded-lg border border-border-strong bg-surface-2 py-3 text-sm transition hover:bg-surface-3 disabled:opacity-40">
          End innings
        </button>
        <button onClick={revertLast} disabled={pending || !canUndo} className="rounded-lg border border-border-strong bg-surface-2 py-3 text-sm transition hover:bg-surface-3 disabled:opacity-40">
          ↩ Undo
        </button>
      </div>

      {wicket && <WicketDialog onClose={() => setWicket(false)} onConfirm={(p) => { send("BALL", { batRuns: 0, wicket: p }); setWicket(false); }} />}
    </div>
  );
}

function WicketDialog({ onClose, onConfirm }: { onClose: () => void; onConfirm: (w: { kind: string; batterOut: "striker" | "non_striker" }) => void }) {
  const [kind, setKind] = useState("bowled");
  const [who, setWho] = useState<"striker" | "non_striker">("striker");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-xl border border-border bg-bg p-5" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-semibold">How out?</h3>
        <div className="mt-3 space-y-3">
          <Select label="Dismissal" value={kind} onChange={setKind} options={[["bowled", "Bowled"], ["caught", "Caught"], ["lbw", "LBW"], ["stumped", "Stumped"], ["run_out", "Run out"], ["hit_wicket", "Hit wicket"], ["retired", "Retired"]]} />
          <Choice label="Batter out" value={who} options={[["striker", "Striker"], ["non_striker", "Non-striker"]]} onChange={(v) => setWho(v as "striker" | "non_striker")} />
        </div>
        <div className="mt-4 flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-md border border-border-strong py-2 text-sm">Cancel</button>
          <button onClick={() => onConfirm({ kind, batterOut: who })} className="flex-1 rounded-md bg-danger py-2 text-sm font-semibold text-white">Confirm wicket</button>
        </div>
      </div>
    </div>
  );
}

function Extra({ label, onClick, disabled, active }: { label: string; onClick: () => void; disabled?: boolean; active?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} className={"rounded-md border py-2.5 transition disabled:opacity-40 " + (active ? "border-warn bg-warn/10 text-warn" : "border-border-strong bg-surface-2 hover:bg-surface-3")}>
      {label}
    </button>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-xs uppercase tracking-wide text-fg-muted">{label}</span>
      <select className="input" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  );
}

function Choice({ label, value, options, onChange }: { label: string; value: string; options: [string, string][]; onChange: (v: string) => void }) {
  return (
    <div className="text-sm">
      <span className="mb-1 block text-xs uppercase tracking-wide text-fg-muted">{label}</span>
      <div className="flex gap-2">
        {options.map(([v, l]) => (
          <button key={v} onClick={() => onChange(v)} className={"flex-1 rounded-md border py-2 transition " + (value === v ? "border-volt bg-volt/10 text-volt" : "border-border-strong bg-surface-2 hover:bg-surface-3")}>
            {l}
          </button>
        ))}
      </div>
    </div>
  );
}
