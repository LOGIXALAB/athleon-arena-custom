"use client";

import { useEffect, useRef, useState } from "react";
import {
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
} from "motion/react";

const PHASES = [
  {
    n: "01",
    title: "The Run-Up",
    desc: "The bowler steams in under the floodlights — the arena holds its breath.",
  },
  {
    n: "02",
    title: "Release",
    desc: "142 km/h off the hand. The smart panel starts the clock the instant it leaves.",
  },
  {
    n: "03",
    title: "Tracked Live",
    desc: "Every metre, every degree of bounce — captured frame by frame, in real time.",
  },
  {
    n: "04",
    title: "On The Big Screen",
    desc: "Speed, line and trajectory — rendered instantly on the giant LED for everyone to see.",
  },
];

// The delivery's flight path (SVG user units, viewBox 0 0 400 620)
const PATH_D = "M 52 70 C 150 250 200 430 232 486 C 264 542 330 470 360 360";
const TOP_SPEED = 142;

export default function BallTrajectory() {
  const ref = useRef<HTMLDivElement>(null);
  const guideRef = useRef<SVGPathElement>(null);

  const reduced = useReducedMotion() ?? false;
  const [active, setActive] = useState(0);
  const [speed, setSpeed] = useState(0);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });

  // Ball position along the path
  const cx = useMotionValue(52);
  const cy = useMotionValue(70);

  // Trail draws with scroll (pathLength is 0..1 in motion)
  const trail = useTransform(scrollYProgress, [0.04, 0.96], [0, 1], { clamp: true });

  // Place the ball at progress `t` (0..1) along the path
  const placeBall = (t: number) => {
    const p = guideRef.current;
    if (!p) return;
    const len = p.getTotalLength();
    const pt = p.getPointAtLength(Math.max(0, Math.min(1, t)) * len);
    cx.set(pt.x);
    cy.set(pt.y);
  };

  // Position the ball at the start (or the end, for reduced motion). This only
  // writes MotionValues — no React state — so it's safe inside an effect.
  useEffect(() => {
    placeBall(reduced ? 1 : 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced]);

  useMotionValueEvent(scrollYProgress, "change", (p) => {
    if (reduced) return;
    setActive(Math.min(PHASES.length - 1, Math.floor(p * PHASES.length)));
    setSpeed(Math.round(Math.min(1, p / 0.32) * TOP_SPEED));
    placeBall((p - 0.04) / 0.92);
  });

  // Reduced motion shows the resolved end-state without scroll updates
  const shownActive = reduced ? PHASES.length - 1 : active;
  const shownSpeed = reduced ? TOP_SPEED : speed;

  return (
    <section
      id="tracked"
      ref={ref}
      className="relative"
      style={{ height: reduced ? "auto" : "320vh" }}
    >
      <div className="sticky top-0 flex min-h-screen items-center overflow-hidden py-20">
        <div className="absolute inset-0 grid-lines opacity-25" />
        <div className="absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-neon-orange/10 blur-[120px]" />

        <div className="mx-auto grid w-full max-w-7xl items-center gap-12 px-6 lg:grid-cols-2">
          {/* LEFT — kinetic text + speed */}
          <div className="order-2 lg:order-1">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-neon-green-soft">
              Smart Tracking
            </p>
            <h2 className="mt-3 font-display text-4xl font-black text-white sm:text-5xl">
              Every ball, <span className="text-gradient">tracked</span>.
            </h2>

            {/* Live speed readout */}
            <div className="mt-8 flex items-end gap-3">
              <span
                className="font-scoreboard text-6xl font-black leading-none text-lime-soft sm:text-7xl"
                style={{ textShadow: "0 0 22px rgba(192,255,0,0.55)" }}
              >
                {shownSpeed.toString().padStart(3, "0")}
              </span>
              <span className="mb-2 font-scoreboard text-lg uppercase tracking-widest text-white/50">
                km/h
              </span>
            </div>

            <div className="mt-8 space-y-1">
              {PHASES.map((s, i) => {
                const on = i === shownActive;
                return (
                  <motion.div
                    key={s.n}
                    animate={{ opacity: on ? 1 : 0.32, x: on ? 0 : -4 }}
                    transition={{ duration: 0.4 }}
                    className="flex gap-4 rounded-2xl p-4"
                    style={{ background: on ? "rgba(255,255,255,0.04)" : "transparent" }}
                  >
                    <span
                      className={`font-scoreboard text-sm ${on ? "neon-lime" : "text-white/40"}`}
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

          {/* RIGHT — Hawk-Eye trajectory */}
          <div className="order-1 flex justify-center lg:order-2">
            <svg
              viewBox="0 0 400 620"
              className="h-[60vh] max-h-[34rem] w-auto"
              fill="none"
              aria-hidden
            >
              <defs>
                <filter id="limeGlow" x="-60%" y="-60%" width="220%" height="220%">
                  <feGaussianBlur stdDeviation="6" result="b" />
                  <feMerge>
                    <feMergeNode in="b" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <radialGradient id="ballGrad" cx="35%" cy="35%" r="70%">
                  <stop offset="0%" stopColor="#f4ffd0" />
                  <stop offset="60%" stopColor="#c0ff00" />
                  <stop offset="100%" stopColor="#7da300" />
                </radialGradient>
              </defs>

              {/* Pitch perspective */}
              <path
                d="M 150 600 L 250 600 L 372 340 L 318 340 Z"
                fill="rgba(255,255,255,0.03)"
                stroke="rgba(255,255,255,0.07)"
              />
              {/* Bounce pip */}
              <ellipse cx="232" cy="492" rx="20" ry="6" fill="rgba(192,255,0,0.18)" />
              {/* Stumps */}
              {[346, 356, 366].map((x) => (
                <line
                  key={x}
                  x1={x}
                  y1="356"
                  x2={x}
                  y2="318"
                  stroke="rgba(255,255,255,0.45)"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              ))}

              {/* Faint full guide path (also used to sample ball position) */}
              <path
                ref={guideRef}
                d={PATH_D}
                stroke="rgba(255,255,255,0.1)"
                strokeWidth="2"
                strokeDasharray="4 6"
              />

              {/* Glowing lime trail that draws with scroll */}
              <motion.path
                d={PATH_D}
                stroke="#c0ff00"
                strokeWidth="4"
                strokeLinecap="round"
                filter="url(#limeGlow)"
                style={{ pathLength: reduced ? 1 : trail }}
              />

              {/* The ball */}
              <motion.circle
                cx={cx}
                cy={cy}
                r="11"
                fill="url(#ballGrad)"
                filter="url(#limeGlow)"
              />
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
}
