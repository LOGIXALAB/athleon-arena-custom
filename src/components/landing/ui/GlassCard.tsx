import type { ReactNode } from "react";

/**
 * Glassmorphism surface with an optional lime accent rim on hover.
 * `accent` accepts legacy "orange"/"green" values (all resolve to brand lime).
 */
export default function GlassCard({
  children,
  className = "",
  accent,
}: {
  children: ReactNode;
  className?: string;
  accent?: "orange" | "green" | "lime";
}) {
  const rim = accent
    ? "hover:border-lime/40 hover:shadow-[0_0_30px_-8px_rgba(192,255,0,0.5)]"
    : "hover:border-white/20";

  return (
    <div
      className={`glass rounded-2xl transition-all duration-300 ${rim} ${className}`}
    >
      {children}
    </div>
  );
}
