"use client";

import Image from "next/image";
import SectionReveal from "./ui/SectionReveal";
import GlowButton from "./ui/GlowButton";

/* ----- Easy-to-edit settings (set these later) ----- */
// "Book a Pitch" destination — the in-app booking flow (same app now).
const BOOKING_URL = "/book";
const CONTACT_URL = "#"; // "Talk to Us" destination — WhatsApp / email / contact link
// After generating the 3D athlete render, drop it in /public and set this path, e.g. "/athlete.png"
const ATHLETE_IMG: string | null = "/athlete.png";

// If the destination is an external URL (not an in-page #anchor), open it in a new tab.
const isExternal = (url: string) => /^https?:|^mailto:|^tel:|^wa\.me|^\/\//.test(url);

export default function BookingCTA() {
  return (
    <section id="visit" className="relative mx-auto max-w-7xl px-6 py-28">
      <SectionReveal>
        <div className="relative overflow-hidden rounded-[2.5rem] border border-border-subtle p-10 sm:p-16">
          {/* Ambient glows + grid */}
          <div className="absolute -left-20 top-0 h-72 w-72 rounded-full bg-neon-orange/20 blur-3xl" />
          <div className="absolute -right-20 bottom-0 h-72 w-72 rounded-full bg-neon-green/20 blur-3xl" />
          <div className="absolute inset-0 grid-lines opacity-30" />

          <div className="relative grid items-center gap-10 lg:grid-cols-2">
            {/* LEFT — copy + CTAs */}
            <div>
              <h2 className="font-display text-4xl font-black leading-tight text-white sm:text-5xl">
                Reserve your <span className="text-gradient">slot</span>.
              </h2>
              <p className="mt-4 max-w-md text-white/60">
                Pick your sport, grab your crew, and lock in a session. Instant QR
                confirmation — no queues, no paperwork.
              </p>
              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <GlowButton
                  href={BOOKING_URL}
                  target={isExternal(BOOKING_URL) ? "_blank" : undefined}
                >
                  Book a Pitch
                </GlowButton>
                <GlowButton
                  href={CONTACT_URL}
                  variant="ghost"
                  target={isExternal(CONTACT_URL) ? "_blank" : undefined}
                >
                  Talk to Us
                </GlowButton>
              </div>
            </div>

            {/* RIGHT — 3D athlete render (or placeholder until provided) */}
            <div className="relative flex min-h-[24rem] items-end justify-center lg:min-h-[30rem]">
              {/* Lime glow behind the figure */}
              <div className="absolute bottom-0 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-lime/10 blur-[90px]" />

              {ATHLETE_IMG ? (
                <Image
                  src={ATHLETE_IMG}
                  alt="Athleon athlete with a cricket bat and futsal ball"
                  fill
                  sizes="(max-width: 1024px) 90vw, 40vw"
                  className="object-cover object-center"
                />
              ) : (
                <div className="relative flex h-full w-full flex-col items-center justify-end gap-4 pb-2">
                  {/* Athlete silhouette placeholder */}
                  <svg
                    viewBox="0 0 120 200"
                    className="h-[20rem] w-auto opacity-80 lg:h-[24rem]"
                    fill="none"
                    aria-hidden
                  >
                    <defs>
                      <linearGradient id="athleteFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#1e2452" />
                        <stop offset="100%" stopColor="#0c0f2e" />
                      </linearGradient>
                    </defs>
                    {/* head */}
                    <circle cx="60" cy="26" r="15" fill="url(#athleteFill)" stroke="rgba(192,255,0,0.5)" strokeWidth="1.5" />
                    {/* body */}
                    <path
                      d="M42 48 Q60 40 78 48 L84 110 Q60 118 36 110 Z"
                      fill="url(#athleteFill)"
                      stroke="rgba(192,255,0,0.5)"
                      strokeWidth="1.5"
                    />
                    {/* arms */}
                    <path d="M42 50 L28 96" stroke="rgba(192,255,0,0.45)" strokeWidth="6" strokeLinecap="round" />
                    <path d="M78 50 L92 96" stroke="rgba(192,255,0,0.45)" strokeWidth="6" strokeLinecap="round" />
                    {/* legs */}
                    <path d="M50 110 L48 190" stroke="url(#athleteFill)" strokeWidth="12" strokeLinecap="round" />
                    <path d="M70 110 L72 190" stroke="url(#athleteFill)" strokeWidth="12" strokeLinecap="round" />
                    {/* ball */}
                    <circle cx="26" cy="104" r="13" fill="#c0ff00" opacity="0.9" />
                  </svg>
                  <span className="font-scoreboard text-[0.7rem] uppercase tracking-[0.3em] text-white/30">
                    3D render goes here
                  </span>
                </div>
              )}

              {/* Sparkle accent */}
              <span className="absolute bottom-6 right-2 text-2xl text-white/20">✦</span>
            </div>
          </div>
        </div>
      </SectionReveal>
    </section>
  );
}
