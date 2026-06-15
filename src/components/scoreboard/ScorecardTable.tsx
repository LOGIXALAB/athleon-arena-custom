"use client";
import type { ScoreboardModel } from "@/lib/core/sports/contract";

/** Big-screen detailed scorecard — renders the sport-agnostic detail sections. */
export function ScorecardTable({ sb }: { sb: ScoreboardModel }) {
  return (
    <div className="h-full overflow-hidden p-[3vh]">
      <div className="mb-[2vh] flex items-center justify-between">
        <div className="text-[3vh] font-bold uppercase">
          {sb.headline.home.name} <span className="text-volt">{sb.headline.home.score}</span>
          <span className="mx-[1vw] text-fg-faint">vs</span>
          {sb.headline.away.name} <span className="text-volt">{sb.headline.away.score}</span>
        </div>
        <div className="text-[2.2vh] uppercase tracking-wide text-volt">{sb.status}</div>
      </div>

      <div className="grid grid-cols-2 gap-[2vw]">
        {sb.detail.sections.map((sec, i) => (
          <div key={i} className="rounded-lg border border-border bg-surface-1 p-[1.5vh]">
            <div className="mb-[1vh] text-[2.2vh] font-semibold uppercase tracking-wide text-volt">{sec.title}</div>
            <table className="w-full text-[2vh]">
              <thead>
                <tr className="text-left text-fg-faint">
                  {sec.columns.map((c) => (
                    <th key={c} className={"pb-[0.5vh] font-medium " + (c === sec.columns[0] ? "" : "text-right")}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sec.rows.map((row, ri) => (
                  <tr key={ri} className="border-t border-border/60">
                    {row.map((cell, ci) => (
                      <td key={ci} className={"py-[0.5vh] " + (ci === 0 ? "font-medium" : "text-right numeral")}>{cell}</td>
                    ))}
                  </tr>
                ))}
                {sec.rows.length === 0 && (
                  <tr><td colSpan={sec.columns.length} className="py-[1vh] text-fg-faint">—</td></tr>
                )}
              </tbody>
            </table>
            {sec.footer && <div className="mt-[1vh] text-right text-[1.9vh] text-fg-muted">{sec.footer}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
