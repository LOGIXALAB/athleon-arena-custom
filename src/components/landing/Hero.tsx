"use client";

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import GlowButton from "./ui/GlowButton";
import ScrambleText from "./ui/ScrambleText";

/** A headline line that rises up from behind a mask. */
function RevealLine({
  children,
  delay,
  reduced,
}: {
  children: ReactNode;
  delay: number;
  reduced: boolean;
}) {
  return (
    <span className="block overflow-hidden pb-[0.12em]">
      <motion.span
        className="block"
        initial={reduced ? false : { y: "115%" }}
        animate={{ y: "0%" }}
        transition={{ delay, duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
      </motion.span>
    </span>
  );
}

export default function Hero() {
  const ref = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const reduced = useReducedMotion() ?? false;
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  // Some browsers don't honor the autoplay attribute reliably — nudge play().
  useEffect(() => {
    if (reduced) return;
    videoRef.current?.play().catch(() => {});
  }, [reduced]);

  // Parallax layers move at different speeds for depth
  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const contentY = useTransform(scrollYProgress, [0, 1], ["0%", "120%"]);
  const fade = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  return (
    <section
      id="top"
      ref={ref}
      className="relative flex min-h-screen items-center justify-center overflow-hidden"
    >
      {/* Background video + cinematic overlay (parallax) */}
      <motion.div style={{ y: bgY }} className="absolute inset-0 -z-10">
        {/* Branded base — shows pre-load and for reduced-motion */}
        <div className="absolute inset-0 bg-background" />
        <div className="absolute left-1/2 top-1/3 h-[42rem] w-[42rem] -translate-x-1/2 rounded-full bg-lime/10 blur-[130px]" />

        {/* Cinematic cricket / futsal b-roll */}
        {!reduced && (
          <video
            ref={videoRef}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            poster="/hero-poster.jpg"
            className="absolute inset-0 h-full w-full object-cover opacity-100"
          >
            <source src="/hero.mp4" type="video/mp4" />
          </video>
        )}

        {/* Legibility overlays — light enough that footage shows through */}
        <div className="absolute inset-0 bg-background/45" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/85 via-transparent to-background/90" />
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(120% 90% at 50% 42%, transparent 32%, rgba(12,15,46,0.85) 100%)",
          }}
        />
        {/* Faint HUD grid for brand texture */}
        <div className="absolute inset-0 grid-lines opacity-20" />
      </motion.div>

      {/* Bottom fade into next section */}
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-background to-transparent" />

      <motion.div
        style={{ y: contentY, opacity: fade }}
        className="relative z-10 mx-auto max-w-5xl px-6 text-center"
      >
        <motion.span
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.6 }}
          className="glass inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium uppercase tracking-[0.25em] text-white/70"
        >
          <span className="h-2 w-2 animate-pulse rounded-full bg-neon-green" />
          Cricket · Futsal · Reimagined
        </motion.span>

        <h1 className="mt-6 font-display text-5xl font-black leading-[0.95] tracking-tight text-white sm:text-7xl lg:text-8xl">
          <RevealLine delay={0.35} reduced={reduced}>
            WHERE SPORTS
          </RevealLine>
          <RevealLine delay={0.5} reduced={reduced}>
            MEET THE
          </RevealLine>
          <RevealLine delay={0.65} reduced={reduced}>
            <ScrambleText
              text="FUTURE"
              className="text-gradient"
              startDelay={650}
              reduced={reduced}
            />
          </RevealLine>
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1, duration: 0.7 }}
          className="mx-auto mt-6 max-w-xl text-base text-white/60 sm:text-lg"
        >
          Premium pitches engineered with digital intelligence — QR entry, giant LED
          live scoring, smart umpire panels, and real-time player stats.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.25, duration: 0.7 }}
          className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
        >
          <GlowButton href="#visit" accent="orange">
            Book Your Arena
          </GlowButton>
          <GlowButton href="#scoreboard" accent="green" variant="ghost">
            ▶ Watch Live
          </GlowButton>
        </motion.div>
      </motion.div>

      {/* Scroll cue */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.6 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <div className="flex h-9 w-5 items-start justify-center rounded-full border border-white/20 p-1.5">
          <motion.span
            className="h-1.5 w-1 rounded-full bg-white/60"
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.6, repeat: Infinity }}
          />
        </div>
      </motion.div>
    </section>
  );
}
