import type { ReactNode } from "react";

/**
 * Inline neon-glowing text accent.
 */
export default function NeonText({
  children,
  accent = "orange",
  className = "",
}: {
  children: ReactNode;
  accent?: "orange" | "green";
  className?: string;
}) {
  return (
    <span className={`${accent === "orange" ? "neon-orange" : "neon-green"} ${className}`}>
      {children}
    </span>
  );
}
