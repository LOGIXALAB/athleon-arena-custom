"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  href?: string;
  /** Legacy prop kept for API compatibility; brand is lime-only now. */
  accent?: "orange" | "green" | "lime";
  variant?: "solid" | "ghost";
  className?: string;
  /** Set "_blank" to open the link in a new tab (adds safe rel automatically). */
  target?: string;
};

/**
 * Premium CTA button with a lime glow and subtle magnetic hover scale.
 * Variety comes from `variant` (solid vs ghost), not a second hue.
 */
export default function GlowButton({
  children,
  href = "#",
  variant = "solid",
  className = "",
  target,
}: Props) {
  const base =
    "relative inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold uppercase tracking-wider transition-colors";

  const solid = "bg-lime text-black hover:bg-lime-soft glow-lime";

  const ghost =
    "glass text-foreground hover:text-white border-white/15 hover:border-white/30";

  return (
    <motion.a
      href={href}
      target={target}
      rel={target === "_blank" ? "noopener noreferrer" : undefined}
      className={`${base} ${variant === "solid" ? solid : ghost} ${className}`}
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 400, damping: 18 }}
      style={
        variant === "ghost" ? { boxShadow: "0 0 0 1px rgba(192,255,0,0.13)" } : undefined
      }
    >
      {children}
    </motion.a>
  );
}
