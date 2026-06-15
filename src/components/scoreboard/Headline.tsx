"use client";
import type { ScoreboardModel } from "@/lib/core/sports/contract";

/** Big-screen headline scoreboard. High-contrast, distance-readable. */
export function Headline({ sb }: { sb: ScoreboardModel }) {
  const flash = sb.highlight ? "animate-pulse" : "";
  return (
    <div className="flex h-full flex-col justify-between p-[3vh]">
      <div className="text-center text-[2.4vh] font-semibold uppercase tracking-[0.3em] text-volt">
        {sb.status}
      </div>

      <div className="flex items-center justify-around">
        <Team name={sb.headline.home.name} score={sb.headline.home.score} flash={flash} />
        <div className="text-[5vh] font-bold text-fg-faint">vs</div>
        <Team name={sb.headline.away.name} score={sb.headline.away.score} flash={flash} />
      </div>

      <div>
        {sb.progress && (
          <div className="mb-[2vh]">
            <div className="mx-auto h-[1.2vh] w-[60%] overflow-hidden rounded-full bg-surface-3">
              <div className="h-full bg-volt" style={{ width: `${Math.min(100, (sb.progress.value / sb.progress.max) * 100)}%` }} />
            </div>
            <div className="mt-[1vh] text-center text-[2.2vh] text-fg-muted">{sb.progress.label}</div>
          </div>
        )}
        <div className="flex flex-wrap items-center justify-center gap-[3vw]">
          {sb.lines.map((l) => (
            <div key={l.label} className="text-center">
              <div className="text-[1.8vh] uppercase tracking-wide text-fg-faint">{l.label}</div>
              <div className="numeral text-[3vh] font-semibold">{l.value}</div>
            </div>
          ))}
        </div>
        {sb.ticker && sb.ticker.length > 0 && (
          <div className="mt-[2vh] flex items-center justify-center gap-[1vw]">
            <span className="text-[1.8vh] uppercase tracking-wide text-fg-faint">This over</span>
            {sb.ticker.map((g, i) => (
              <span key={i} className="numeral rounded bg-surface-2 px-[1.2vw] py-[0.5vh] text-[2.4vh] font-bold">
                {g}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Team({ name, score, flash }: { name: string; score: string; flash: string }) {
  return (
    <div className="text-center">
      <div className="mb-[1vh] text-[3.5vh] font-semibold uppercase">{name}</div>
      <div className={`numeral text-[16vh] font-bold leading-none text-volt ${flash}`}>{score}</div>
    </div>
  );
}
