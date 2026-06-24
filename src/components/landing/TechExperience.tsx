"use client";

import { useRef, useState } from "react";
import { motion, useMotionValueEvent, useScroll } from "motion/react";

const STEPS = [
  {
    n: "01",
    title: "Scan to Enter",
    desc: "A single QR code at the gate checks you in, unlocks your booked slot and opens your digital match pass.",
    icon: "▦",
  },
  {
    n: "02",
    title: "Step Onto the Turf",
    desc: "Smart sensors and broadcast-grade floodlights bring your game to life from the very first ball.",
    icon: "◎",
  },
  {
    n: "03",
    title: "Play. Score Goes Live.",
    desc: "The smart umpire panel pushes every run and goal to the giant LED screen in real time.",
    icon: "⚡",
  },
  {
    n: "04",
    title: "Stats On Your Phone",
    desc: "Strike rate, speed, goals, heatmaps — your full performance breakdown, instantly.",
    icon: "📊",
  },
];

export default function TechExperience() {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });

  useMotionValueEvent(scrollYProgress, "change", (p) => {
    const idx = Math.min(STEPS.length - 1, Math.floor(p * STEPS.length));
    setActive(idx);
  });

  return (
    <section id="tech" ref={ref} className="relative" style={{ height: `${STEPS.length * 80}vh` }}>
      <div className="sticky top-0 flex min-h-screen items-center overflow-hidden">
        <div className="absolute inset-0 grid-lines opacity-30" />
        <div className="mx-auto grid w-full max-w-7xl gap-12 px-6 lg:grid-cols-2 lg:items-center">
          {/* Left: copy */}
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-neon-green-soft">
              The Experience
            </p>
            <h2 className="mt-3 font-display text-4xl font-black text-white sm:text-5xl">
              Tech you can <span className="text-gradient">feel</span>.
            </h2>

            <div className="mt-10 space-y-2">
              {STEPS.map((s, i) => {
                const isActive = i === active;
                return (
                  <motion.div
                    key={s.n}
                    animate={{ opacity: isActive ? 1 : 0.35 }}
                    className="flex gap-4 rounded-2xl p-4 transition-colors"
                    style={{
                      background: isActive ? "rgba(255,255,255,0.04)" : "transparent",
                    }}
                  >
                    <span
                      className={`font-scoreboard text-sm ${
                        isActive ? "neon-green" : "text-white/40"
                      }`}
                    >
                      {s.n}
                    </span>
                    <div>
                      <h3 className="font-display text-lg font-bold text-white">{s.title}</h3>
                      <p className="mt-1 text-sm text-white/55">{s.desc}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Right: animated phone / panel mockup */}
          <div className="relative hidden lg:block">
            <div className="relative mx-auto aspect-[3/4] w-full max-w-sm">
              <div className="glass absolute inset-0 overflow-hidden rounded-[2.5rem] p-6">
                {/* Floodlight glow */}
                <div className="absolute -top-10 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full bg-neon-green/20 blur-3xl" />

                <div className="relative flex h-full flex-col">
                  <div className="flex items-center justify-between text-xs text-white/50">
                    <span className="font-scoreboard">ATHLEON · LIVE</span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" /> REC
                    </span>
                  </div>

                  <motion.div
                    key={active}
                    initial={{ opacity: 0, scale: 0.92 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4 }}
                    className="flex flex-1 flex-col items-center justify-center text-center"
                  >
                    <span className="text-6xl">{STEPS[active].icon}</span>
                    <span className="mt-6 font-scoreboard text-xs uppercase tracking-widest text-neon-green-soft">
                      Step {STEPS[active].n}
                    </span>
                    <span className="mt-2 font-display text-xl font-bold text-white">
                      {STEPS[active].title}
                    </span>
                  </motion.div>

                  {/* progress dots */}
                  <div className="flex justify-center gap-2">
                    {STEPS.map((_, i) => (
                      <span
                        key={i}
                        className={`h-1.5 rounded-full transition-all ${
                          i === active ? "w-6 bg-neon-green" : "w-1.5 bg-white/20"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
