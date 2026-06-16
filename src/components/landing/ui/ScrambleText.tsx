"use client";

import { useEffect, useState } from "react";

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ#%@*<>/\\";

type Props = {
  text: string;
  /** ms to wait before the scramble begins */
  startDelay?: number;
  className?: string;
  reduced?: boolean;
};

/**
 * Renders `text` with a "decode" effect: letters cycle through random
 * characters and lock in left→right until the word resolves.
 * SSR / reduced-motion render the final text directly (no hydration mismatch).
 */
export default function ScrambleText({
  text,
  startDelay = 0,
  className,
  reduced = false,
}: Props) {
  const [display, setDisplay] = useState(text);

  useEffect(() => {
    // Initial state is already the final text, so reduced-motion needs no work.
    if (reduced) return;

    let interval: ReturnType<typeof setInterval> | undefined;
    let frame = 0;
    const FRAMES_PER_LETTER = 3; // higher = slower lock-in

    const begin = () => {
      interval = setInterval(() => {
        frame += 1;
        const locked = Math.floor(frame / FRAMES_PER_LETTER);
        const out = text
          .split("")
          .map((ch, i) => {
            if (ch === " ") return " ";
            if (i < locked) return ch;
            return CHARS[Math.floor(Math.random() * CHARS.length)];
          })
          .join("");
        setDisplay(out);
        if (locked >= text.length) {
          clearInterval(interval);
          setDisplay(text);
        }
      }, 45);
    };

    const timeout = setTimeout(begin, startDelay);
    return () => {
      clearTimeout(timeout);
      if (interval) clearInterval(interval);
    };
  }, [text, startDelay, reduced]);

  return (
    <span className={className} aria-label={text}>
      <span aria-hidden>{display}</span>
    </span>
  );
}
