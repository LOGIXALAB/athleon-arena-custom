"use client";

import { motion } from "motion/react";
import SectionReveal from "./ui/SectionReveal";

type Arena = {
  name: string;
  tag: string;
  desc: string;
  stat: string;
  statLabel: string;
  /** Lime-only brand: differentiate by treatment, not a second hue */
  style: "solid" | "ghost";
};

const ARENAS: Arena[] = [
  {
    name: "Cricket Arena",
    tag: "Pro Pitch",
    desc: "Floodlit, broadcast-grade turf with smart bowling speed capture and ball-tracking ready infrastructure.",
    stat: "22",
    statLabel: "yard pro pitch",
    style: "solid",
  },
  {
    name: "Futsal Arena",
    tag: "FIFA-grade",
    desc: "Cushioned all-weather court with rebound boards, dynamic LED lines and instant goal replays.",
    stat: "40m",
    statLabel: "indoor court",
    style: "ghost",
  },
];

export default function Arenas() {
  return (
    <section id="arenas" className="relative mx-auto max-w-7xl px-6 py-28">

      
      <SectionReveal className="max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-white/40">
          The Arenas
        </p>
        <h2 className="mt-3 font-display text-4xl font-black text-white sm:text-5xl">
          Two sports. <span className="text-gradient">One stage.</span>
        </h2>
      </SectionReveal>

      <div className="mt-14 grid gap-6 lg:grid-cols-2">
        {ARENAS.map((a, i) => {
          const solid = a.style === "solid";
          return (
            <SectionReveal key={a.name} delay={i * 0.12}>
              <motion.article
                whileHover={{ y: -6 }}
                transition={{ type: "spring", stiffness: 300, damping: 22 }}
                className="group relative h-[28rem] overflow-hidden rounded-3xl border border-border-subtle hover:glow-lime"
              >
                {/* Visual placeholder (swap for real photo later) */}
                <div
                  className={`absolute inset-0 grid-lines bg-gradient-to-br ${
                    solid
                      ? "from-[#c0ff00]/25 via-[#c0ff00]/5 to-transparent"
                      : "from-[#1e2452] via-[#171b40]/40 to-transparent"
                  }`}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
                <motion.div
                  className="absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                  style={{
                    background:
                      "radial-gradient(40rem 30rem at 50% 120%, rgba(192,255,0,0.22), transparent)",
                  }}
                />

                {/* HUD overlay tag — solid lime vs outlined lime */}
                <span
                  className={`absolute right-5 top-5 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider ${
                    solid
                      ? "bg-lime text-black"
                      : "border border-lime/50 text-lime-soft"
                  }`}
                >
                  {a.tag}
                </span>

                <div className="absolute inset-x-0 bottom-0 p-8">
                  <div className="mb-4 flex items-end gap-3">
                    <span
                      className={`font-display text-5xl font-black leading-none ${
                        solid ? "neon-lime" : "text-white"
                      }`}
                    >
                      {a.stat}
                    </span>
                    <span className="mb-1 text-sm text-white/50">{a.statLabel}</span>
                  </div>
                  <h3 className="font-display text-2xl font-bold text-white">{a.name}</h3>
                  <p className="mt-2 max-w-md text-sm text-white/60">{a.desc}</p>
                </div>
              </motion.article>
            </SectionReveal>
          );
        })}
      </div>
    </section>
  );
}
