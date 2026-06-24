"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
  /** Stagger delay in seconds */
  delay?: number;
  /** Travel distance on the Y axis */
  y?: number;
  as?: "div" | "section" | "li" | "span";
};

/**
 * Fade + slide-up reveal when the element scrolls into view.
 * Animates only transform/opacity for GPU-friendly performance.
 */
export default function SectionReveal({
  children,
  className,
  delay = 0,
  y = 32,
  as = "div",
}: Props) {
  const MotionTag = motion[as];

  return (
    <MotionTag
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </MotionTag>
  );
}
