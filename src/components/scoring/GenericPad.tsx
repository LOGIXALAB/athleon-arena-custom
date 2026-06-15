"use client";
import type { Snapshot } from "./ScorePanel";
import type { FutsalState } from "@/lib/core/sports/futsal/module";

/**
 * Pad-style scorer. Futsal is the launch pad sport; the panel reads the derived
 * state to drive period/clock controls. (Pad action *builders* can't cross the
 * JSON boundary, so the controls are rendered here rather than from scorerUI.)
 */
export function GenericPad({
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
  const st = snap.state as FutsalState;
  const now = () => new Date().toISOString();
  const teamName = (s: "A" | "B") => snap.context.teams[s].name;

  if (st.phase === "completed") {
    return (
      <div className="card p-6 text-center">
        <div className="numeral text-2xl font-bold uppercase text-volt">Full time</div>
        <p className="mt-2 text-sm text-fg-muted">{snap.summary}</p>
      </div>
    );
  }

  if (st.phase === "setup" || st.phase === "break") {
    const nextPeriod = st.period + 1;
    return (
      <div className="card p-6 text-center">
        <button
          onClick={() => send("PERIOD_START", { period: nextPeriod, at: now() })}
          disabled={pending}
          className="rounded-lg bg-volt px-6 py-3 font-semibold text-[#07090a] transition enabled:hover:bg-volt-dim disabled:opacity-40"
        >
          Start period {nextPeriod}
        </button>
      </div>
    );
  }

  // live
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        {(["A", "B"] as const).map((s) => (
          <div key={s} className="card p-3">
            <div className="mb-2 text-center text-sm font-medium">{teamName(s)}</div>
            <button
              onClick={() => send("GOAL", { team: s, at: now() })}
              disabled={pending}
              className="mb-2 w-full rounded-lg bg-volt py-4 numeral text-2xl font-bold text-[#07090a] transition enabled:hover:bg-volt-dim disabled:opacity-40"
            >
              GOAL
            </button>
            <div className="grid grid-cols-3 gap-1.5 text-xs">
              <PadBtn label="Foul" onClick={() => send("FOUL", { team: s })} disabled={pending} />
              <PadBtn label="🟨" onClick={() => send("CARD", { team: s, color: "yellow", at: now() })} disabled={pending} />
              <PadBtn label="🟥" onClick={() => send("CARD", { team: s, color: "red", at: now() })} disabled={pending} danger />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2">
        {st.clock.running ? (
          <PadBtn label="Pause" onClick={() => send("PAUSE", { at: now() })} disabled={pending} />
        ) : (
          <PadBtn label="Resume" onClick={() => send("RESUME", { at: now() })} disabled={pending} />
        )}
        <PadBtn label="End period" onClick={() => send("PERIOD_END", { at: now() })} disabled={pending} />
        <PadBtn label="↩ Undo" onClick={revertLast} disabled={pending} />
      </div>
    </div>
  );
}

function PadBtn({ label, onClick, disabled, danger }: { label: string; onClick: () => void; disabled?: boolean; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={
        "rounded-md border px-2 py-2.5 font-medium transition disabled:opacity-40 " +
        (danger ? "border-danger/30 text-danger hover:bg-danger/10" : "border-border-strong bg-surface-2 hover:bg-surface-3")
      }
    >
      {label}
    </button>
  );
}
