import type { MatchContext, ScoreboardModel } from "../contract";
import type { CricketState, InningsState } from "./types";
import { overStr } from "./reduce";

function nameMap(ctx: MatchContext): Map<string, string> {
  const m = new Map<string, string>();
  for (const side of ["A", "B"] as const) {
    for (const p of ctx.players[side]) m.set(p.id, p.name);
  }
  return m;
}

function teamName(ctx: MatchContext, side: "A" | "B"): string {
  return ctx.teams[side]?.name ?? `Team ${side}`;
}

function inningsFor(s: CricketState, side: "A" | "B"): InningsState | undefined {
  return s.innings.find((i) => i.battingSide === side);
}

function scoreText(inn: InningsState | undefined): string {
  if (!inn) return "yet to bat";
  return `${inn.runs}/${inn.wickets}`;
}

export function summary(s: CricketState, ctx: MatchContext): string {
  if (s.phase === "completed") return s.resultSummary ?? "Match complete";
  if (s.phase === "setup") return "Match starting soon";
  const inn = s.innings[s.current];
  if (!inn) return "Match starting soon";
  const overs = overStr(inn.legalBalls, s.format.ballsPerOver);
  const bat = teamName(ctx, inn.battingSide);
  let line = `${bat} ${inn.runs}/${inn.wickets} (${overs})`;
  if (s.current === 1 && s.target != null) {
    const need = s.target - inn.runs;
    const ballsLeft = s.format.oversPerInnings * s.format.ballsPerOver - inn.legalBalls;
    if (need > 0) line += ` — need ${need} off ${ballsLeft}`;
  }
  return line;
}

export function scoreboard(s: CricketState, ctx: MatchContext): ScoreboardModel {
  const names = nameMap(ctx);
  const nameOf = (id: string) => (id ? names.get(id) ?? "Player" : "—");
  const innA = inningsFor(s, "A");
  const innB = inningsFor(s, "B");
  const inn = s.innings[s.current];
  const f = s.format;

  let status: string;
  if (s.phase === "completed") status = s.resultSummary ?? "Full time";
  else if (s.phase === "setup") status = "Starting soon";
  else if (s.phase === "between_innings") status = `Innings break · Target ${s.target}`;
  else status = `LIVE · ${s.current === 0 ? "1st" : "2nd"} Innings`;

  const lines: { label: string; value: string }[] = [];
  if (inn && s.phase === "live") {
    const striker = inn.batters[inn.strikerId];
    if (striker)
      lines.push({
        label: "Striker",
        value: `${nameOf(striker.playerId)} ${striker.runs} (${striker.balls})`,
      });
    if (inn.nonStrikerId && inn.batters[inn.nonStrikerId]) {
      const ns = inn.batters[inn.nonStrikerId];
      lines.push({
        label: "Non-striker",
        value: `${nameOf(ns.playerId)} ${ns.runs} (${ns.balls})`,
      });
    }
    const bowler = inn.bowlers[inn.bowlerId];
    if (bowler)
      lines.push({
        label: "Bowler",
        value: `${nameOf(bowler.playerId)} ${overStr(bowler.balls, f.ballsPerOver)}-${bowler.runsConceded}-${bowler.wickets}`,
      });
    const overs = inn.legalBalls / f.ballsPerOver;
    const crr = overs > 0 ? (inn.runs / overs).toFixed(2) : "0.00";
    lines.push({ label: "Run rate", value: crr });
    if (s.current === 1 && s.target != null) {
      const need = Math.max(0, s.target - inn.runs);
      const ballsLeft = f.oversPerInnings * f.ballsPerOver - inn.legalBalls;
      lines.push({ label: "Need", value: `${need} off ${ballsLeft}` });
    }
  }

  const progress = inn
    ? {
        label: `${overStr(inn.legalBalls, f.ballsPerOver)} / ${f.oversPerInnings} ov`,
        value: inn.legalBalls,
        max: f.oversPerInnings * f.ballsPerOver,
      }
    : undefined;

  // ---- detailed scorecard sections (display 'scorecard' mode) -------------
  const sections: ScoreboardModel["detail"]["sections"] = [];
  for (const i of s.innings) {
    const batSide = i.battingSide;
    const bowlSide = batSide === "A" ? "B" : "A";
    sections.push({
      title: `${teamName(ctx, batSide)} — Batting`,
      columns: ["Batter", "R", "B", "4s", "6s", "Status"],
      rows: i.battingOrder.map((id) => {
        const c = i.batters[id];
        const onStrike = id === i.strikerId;
        const status2 = c.out ? c.outBy ?? "out" : onStrike ? "batting*" : "not out";
        return [
          nameOf(id),
          String(c.runs),
          String(c.balls),
          String(c.fours),
          String(c.sixes),
          status2,
        ];
      }),
      footer: `Extras ${i.extras} · Total ${i.runs}/${i.wickets} (${overStr(i.legalBalls, f.ballsPerOver)} ov)`,
    });
    const bowlerIds = Object.keys(i.bowlers);
    sections.push({
      title: `${teamName(ctx, bowlSide)} — Bowling`,
      columns: ["Bowler", "O", "R", "W"],
      rows: bowlerIds.map((id) => {
        const b = i.bowlers[id];
        return [
          nameOf(id),
          overStr(b.balls, f.ballsPerOver),
          String(b.runsConceded),
          String(b.wickets),
        ];
      }),
    });
  }

  return {
    headline: {
      home: { name: teamName(ctx, "A"), logoUrl: ctx.teams.A?.logoUrl, score: scoreText(innA) },
      away: { name: teamName(ctx, "B"), logoUrl: ctx.teams.B?.logoUrl, score: scoreText(innB) },
    },
    status,
    lines,
    ticker: inn?.recentBalls,
    progress,
    highlight: s.lastHighlight,
    detail: { sections },
  };
}
