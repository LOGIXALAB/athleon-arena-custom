"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import SectionReveal from "./ui/SectionReveal";

export default function LiveScoreboard() {
  // Simulated "living" scoreboard — numbers tick to feel alive
  const [runs, setRuns] = useState(187);
  const [wickets, setWickets] = useState(4);
  const [over, setOver] = useState(16.2);
  const [ball, setBall] = useState("4");

  useEffect(() => {
    const events = ["1", "2", "4", "6", "•", "W"];
    const id = setInterval(() => {
      const e = events[Math.floor((over * 10) % events.length)];
      setBall(e);
      setRuns((r) => (e === "•" || e === "W" ? r : r + Number(e)));
      if (e === "W") setWickets((w) => Math.min(9, w + 1));
      setOver((o) => {
        const next = Math.round((o + 0.1) * 10) / 10;
        return Number(next.toFixed(1).split(".")[1]) > 5 ? Math.floor(next) + 1 : next;
      });
    }, 2200);
    return () => clearInterval(id);
  }, [over]);

  return (
    <section id="scoreboard" className="relative overflow-hidden px-6 py-28">
      {/* Stadium backdrop */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(80% 55% at 50% 8%, rgba(192,255,0,0.06), transparent 60%)",
          }}
        />
        <div className="absolute -top-24 left-[18%] h-72 w-72 rounded-full bg-white/5 blur-[110px]" />
        <div className="absolute -top-24 right-[18%] h-72 w-72 rounded-full bg-white/5 blur-[110px]" />
        <div className="absolute inset-0 grid-lines opacity-10" />
        <div
          className="absolute inset-x-0 bottom-0 h-1/3"
          style={{ background: "linear-gradient(to top, rgba(192,255,0,0.04), transparent)" }}
        />
      </div>

      <SectionReveal className="mb-10 text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-white/40">
          Giant LED Live Scoring
        </p>
      </SectionReveal>

      <SectionReveal>
        <div className="relative mx-auto max-w-5xl [perspective:1800px]">
          {/* Lime glow spill onto the stadium */}
          <div className="absolute -inset-x-10 -inset-y-8 rounded-[3rem] bg-lime/10 blur-3xl" />

          {/* Bezel / mount — subtle curve on desktop */}
          <div
            className="relative rounded-[2rem] p-3 sm:p-4 lg:[transform:rotateX(2deg)]"
            style={{
              background: "linear-gradient(145deg, #232a4f, #0a0d22 65%)",
              boxShadow:
                "0 45px 90px -30px rgba(0,0,0,0.9), inset 0 1px 0 rgba(255,255,255,0.08), inset 0 0 0 1px rgba(192,255,0,0.12), inset 0 0 26px -6px rgba(192,255,0,0.22)",
            }}
          >
            {/* Screen surface */}
            <div
              className="led-pixels relative overflow-hidden rounded-[1.4rem] p-7 sm:p-12"
              style={{
                background: "radial-gradient(120% 100% at 50% 0%, #0c1230, #05070f)",
                boxShadow: "inset 0 0 60px -18px rgba(192,255,0,0.25)",
              }}
            >
              {/* Convex curve illusion — darker side edges */}
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    "linear-gradient(90deg, rgba(3,5,12,0.85), transparent 14%, transparent 86%, rgba(3,5,12,0.85))",
                }}
              />
              {/* Screen vignette */}
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    "radial-gradient(120% 95% at 50% 42%, transparent 55%, rgba(3,5,12,0.8))",
                }}
              />
              {/* Top reflection sheen */}
              <div
                className="pointer-events-none absolute inset-x-0 top-0 h-1/3"
                style={{ background: "linear-gradient(to bottom, rgba(255,255,255,0.06), transparent)" }}
              />

              {/* ---- Screen content ---- */}
              <div className="relative z-10">
                <h3 className="mb-8 text-center font-display text-2xl font-black text-white sm:text-3xl">
                  Every ball, <span className="neon-lime">lit up</span>.
                </h3>

                <div className="flex items-center justify-between text-xs uppercase tracking-widest text-white/50">
                  <span className="font-scoreboard">Athleon Arena · Pitch 01</span>
                  <span className="flex items-center gap-2 text-lime-soft">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-lime" /> LIVE
                  </span>
                </div>

                <div className="mt-8 flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
                  {/* Team + score */}
                  <div className="text-center sm:text-left">
                    <p className="text-sm font-medium text-white/50">STRIKERS XI</p>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span
                        className="font-scoreboard text-7xl font-black text-lime-soft sm:text-8xl"
                        style={{ textShadow: "0 0 20px rgba(192,255,0,0.6)" }}
                      >
                        {runs}
                      </span>
                      <span className="font-scoreboard text-4xl text-white/60">/{wickets}</span>
                    </div>
                    <p className="mt-1 font-scoreboard text-sm text-white/50">
                      OVERS {over.toFixed(1)}
                    </p>
                  </div>

                  {/* Last ball */}
                  <div className="text-center">
                    <p className="text-xs uppercase tracking-widest text-white/40">Last Ball</p>
                    <motion.div
                      key={`${runs}-${ball}`}
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 400, damping: 15 }}
                      className={`mt-2 grid h-20 w-20 place-items-center rounded-2xl font-display text-3xl font-black ${
                        ball === "W"
                          ? "bg-red-500/20 text-red-400 glow-lime"
                          : ball === "6" || ball === "4"
                            ? "bg-lime/15 neon-lime glow-lime"
                            : "bg-white/5 text-white"
                      }`}
                    >
                      {ball}
                    </motion.div>
                  </div>

                  {/* Run rate gauge */}
                  <div className="text-center sm:text-right">
                    <p className="text-xs uppercase tracking-widest text-white/40">Run Rate</p>
                    <p
                      className="mt-1 font-scoreboard text-4xl font-bold text-white"
                      style={{ textShadow: "0 0 14px rgba(192,255,0,0.4)" }}
                    >
                      {(runs / Math.max(1, over)).toFixed(2)}
                    </p>
                    <p className="mt-1 text-xs text-white/40">Smart Umpire Panel</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Floor reflection of the wall */}
          <div
            className="mx-auto mt-2 h-10 max-w-3xl rounded-[50%] opacity-50 blur-md"
            style={{ background: "radial-gradient(60% 100% at 50% 0%, rgba(192,255,0,0.18), transparent)" }}
          />
        </div>
      </SectionReveal>
    </section>
  );
}
