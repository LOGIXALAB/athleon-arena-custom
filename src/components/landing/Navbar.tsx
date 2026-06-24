"use client";

import { useState } from "react";
import { motion, useMotionValueEvent, useScroll } from "motion/react";

const LINKS = [
  { label: "Arenas", href: "#arenas" },
  { label: "Tech", href: "#tech" },
  { label: "Live", href: "#scoreboard" },
  { label: "Lounge", href: "#lounge" },
  { label: "Gallery", href: "#gallery" },
  { label: "Plans", href: "#plans" },
  { label: "Visit", href: "#visit" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (y) => setScrolled(y > 40));

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-x-0 top-0 z-50 flex justify-center px-6 pt-4"
    >
      <nav
        className={`flex w-full max-w-7xl items-center justify-between rounded-full px-6 py-3 transition-all duration-300 ${
          scrolled ? "glass shadow-lg shadow-black/40" : "border border-transparent"
        }`}
      >
        {/* Logo */}
        <a href="#top" className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-neon-orange text-black font-display text-lg font-black">
            A
          </span>
          <span className="font-display text-sm font-bold uppercase tracking-[0.2em] text-white">
            Athleon
          </span>
        </a>

        {/* Desktop links */}
        <ul className="hidden items-center gap-8 md:flex">
          {LINKS.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                className="text-sm font-medium text-white/70 transition-colors hover:text-neon-orange-soft"
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        <a
          href="/book"
          className="group relative hidden overflow-hidden rounded-full bg-white px-8 py-2 text-sm font-bold text-black shadow-md transition-all duration-[400ms] ease-in-out hover:scale-105 hover:shadow-lg active:scale-90 before:absolute before:top-0 before:-left-full before:h-full before:w-full before:rounded-full before:bg-lime before:transition-all before:duration-500 before:ease-in-out before:content-[''] hover:before:left-0 md:inline-block"
        >
          <span className="relative z-10 text-black transition-colors duration-500 group-hover:text-black">
            Book Now
          </span>
        </a>

        {/* Mobile toggle */}
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-white md:hidden"
          aria-label="Toggle menu"
          aria-expanded={open}
        >
          <div className="space-y-1.5">
            <span
              className={`block h-0.5 w-5 bg-current transition-transform ${open ? "translate-y-2 rotate-45" : ""}`}
            />
            <span className={`block h-0.5 w-5 bg-current transition-opacity ${open ? "opacity-0" : ""}`} />
            <span
              className={`block h-0.5 w-5 bg-current transition-transform ${open ? "-translate-y-2 -rotate-45" : ""}`}
            />
          </div>
        </button>
      </nav>

      {/* Mobile menu */}
      {open && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass absolute top-20 left-4 right-4 rounded-2xl p-4 md:hidden"
        >
          <ul className="flex flex-col gap-1">
            {LINKS.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-lg px-4 py-3 text-white/80 hover:bg-white/5 hover:text-neon-orange-soft"
                >
                  {l.label}
                </a>
              </li>
            ))}
            <li>
              <a
                href="/book"
                onClick={() => setOpen(false)}
                className="mt-1 block rounded-lg bg-neon-orange px-4 py-3 text-center font-semibold text-black"
              >
                Book Now
              </a>
            </li>
          </ul>
        </motion.div>
      )}
    </motion.header>
  );
}
