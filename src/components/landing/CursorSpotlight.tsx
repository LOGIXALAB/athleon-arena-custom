"use client";

import { useEffect } from "react";
import { motion, useMotionValue, useSpring } from "motion/react";

/**
 * A soft floodlight that follows the cursor on the dark canvas.
 * Pointer-events disabled; hidden on touch / reduced-motion.
 */
export default function CursorSpotlight() {
  const x = useMotionValue(-500);
  const y = useMotionValue(-500);
  const sx = useSpring(x, { stiffness: 120, damping: 20 });
  const sy = useSpring(y, { stiffness: 120, damping: 20 });

  useEffect(() => {
    const move = (e: MouseEvent) => {
      x.set(e.clientX - 250);
      y.set(e.clientY - 250);
    };
    window.addEventListener("mousemove", move);
    return () => window.removeEventListener("mousemove", move);
  }, [x, y]);

  return (
    <motion.div
      aria-hidden
      style={{ x: sx, y: sy }}
      className="pointer-events-none fixed left-0 top-0 z-30 hidden h-[500px] w-[500px] rounded-full md:block motion-reduce:hidden"
    >
      <div className="h-full w-full rounded-full bg-neon-orange/10 blur-[100px]" />
    </motion.div>
  );
}
