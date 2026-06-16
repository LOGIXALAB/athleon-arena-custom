"use client";

import { motion } from "motion/react";
import SectionReveal from "./ui/SectionReveal";

/* Edit plan copy here — names, taglines, badges, and feature lists. */
type Plan = {
  name: string;
  tagline: string;
  badge?: string;
  features: string[];
  featured?: boolean;
};

const PLANS: Plan[] = [
  {
    name: "Silver",
    tagline: "For the weekend warrior.",
    features: [
      "4 arena sessions / month",
      "Standard slot booking",
      "QR entry pass",
      "Basic match stats",
      "Lounge access",
    ],
  },
  {
    name: "Gold",
    tagline: "For players who never miss a match.",
    badge: "Most Popular",
    featured: true,
    features: [
      "12 arena sessions / month",
      "Priority slot booking",
      "QR fast-lane entry",
      "Full player-stats dashboard",
      "10% off lounge & juice bar",
      "2 guest passes / month",
    ],
  },
  {
    name: "Elite",
    tagline: "The full Athleon experience.",
    badge: "All Access",
    features: [
      "Unlimited arena sessions",
      "VIP priority booking",
      "Personal performance reports",
      "20% off lounge & juice bar",
      "Dedicated locker",
      "Unlimited guest passes",
    ],
  },
];

export default function Memberships() {
  return (
    <section id="plans" className="relative mx-auto max-w-7xl px-6 py-28">
      <SectionReveal className="mb-14 text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-white/40">
          Memberships
        </p>
        <h2 className="mt-3 font-display text-4xl font-black text-white sm:text-5xl">
          Pick your <span className="text-gradient">level</span>.
        </h2>
        <p className="mx-auto mt-4 max-w-md text-white/55">
          Monthly memberships built around how often you play — from casual
          sessions to all-access training.
        </p>
      </SectionReveal>

      <div className="grid items-stretch gap-6 md:grid-cols-3">
        {PLANS.map((plan, i) => (
          <SectionReveal key={plan.name} delay={i * 0.12} className="h-full">
            <motion.article
              whileHover={{ y: -6 }}
              transition={{ type: "spring", stiffness: 300, damping: 22 }}
              className={`relative flex h-full flex-col rounded-3xl p-8 ${
                plan.featured
                  ? "glass border-2 border-lime/60 glow-lime lg:scale-105"
                  : "glass border border-border-subtle hover:border-lime/30"
              }`}
            >
              {/* Tier badge */}
              {plan.badge && (
                <span
                  className={`absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-4 py-1 text-xs font-bold uppercase tracking-wider ${
                    plan.featured
                      ? "bg-lime text-black"
                      : "border border-lime/50 bg-background text-lime-soft"
                  }`}
                >
                  {plan.badge}
                </span>
              )}

              <h3
                className={`font-display text-2xl font-black ${
                  plan.featured ? "neon-lime" : "text-white"
                }`}
              >
                {plan.name}
              </h3>
              <p className="mt-1 text-sm text-white/55">{plan.tagline}</p>

              {/* Pricing — contact based, no numbers */}
              <div className="mt-6">
                <p className="font-display text-xl font-bold text-white">
                  Contact for pricing
                </p>
                <p className="mt-1 text-xs uppercase tracking-widest text-white/40">
                  Monthly membership
                </p>
              </div>

              <ul className="mt-7 flex-1 space-y-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-sm text-white/70">
                    <svg
                      viewBox="0 0 16 16"
                      className="mt-0.5 h-4 w-4 shrink-0 text-lime"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden
                    >
                      <path d="M2.5 8.5 6 12l7.5-8" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>

              <a
                href="#visit"
                className={`mt-8 inline-flex items-center justify-center rounded-full px-7 py-3.5 text-sm font-semibold uppercase tracking-wider transition-colors ${
                  plan.featured
                    ? "bg-lime text-black hover:bg-lime-soft glow-lime"
                    : "glass border-white/15 text-foreground hover:border-lime/40 hover:text-white"
                }`}
              >
                Get {plan.name}
              </a>
            </motion.article>
          </SectionReveal>
        ))}
      </div>
    </section>
  );
}
