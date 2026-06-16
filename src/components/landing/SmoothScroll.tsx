"use client";

import { ReactLenis } from "lenis/react";
import type { ReactNode } from "react";

/**
 * Wraps the app in Lenis for buttery inertia smooth-scroll.
 * Honors prefers-reduced-motion by disabling smoothing.
 */
export default function SmoothScroll({ children }: { children: ReactNode }) {
  const prefersReduced =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  return (
    <ReactLenis
      root
      options={{
        lerp: 0.1,
        duration: 1.2,
        smoothWheel: !prefersReduced,
      }}
    >
      {children}
    </ReactLenis>
  );
}
