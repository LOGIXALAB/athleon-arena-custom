"use client";

import Image from "next/image";
import { motion } from "motion/react";
import SectionReveal from "./ui/SectionReveal";

/**
 * To use real photos:
 *   1. Drop your images into  /public/gallery/   (e.g. night-cricket.jpg)
 *   2. Set the `img` field below to "/gallery/night-cricket.jpg"
 *   3. Leave `img` undefined to keep the gradient placeholder for that tile.
 *
 * Recommended size: 1200x900px (landscape) or 1200x1600px (the big tile).
 * Format: .jpg or .webp for best performance.
 */
type Tile = {
  label: string;
  span: string;
  grad: string;
  img?: string; // path under /public, e.g. "/gallery/night-cricket.jpg"
};

const TILES: Tile[] = [
  {
    label: "Night Cricket",
    span: "md:col-span-2 md:row-span-2",
    grad: "from-[#c0ff00]/30 to-[#0c0f2e]",
     img: "/gallery/night-cricket.png",
  },
  {
    label: "Futsal Lights",
    span: "",
    grad: "from-[#1e2452] to-[#0c0f2e]",
     img: "/gallery/futsal-lights.png",
  },
  {
    label: "The Lounge",
    span: "",
    grad: "from-[#c0ff00]/20 to-[#0c0f2e]",
     img: "/gallery/lounge.png",
  },
  {
    label: "LED Wall",
    span: "md:col-span-2",
    grad: "from-[#1e2452] to-[#0c0f2e]",
     img: "/gallery/led-wall.png",
  },
  {
    label: "Match Day",
    span: "",
    grad: "from-[#c0ff00]/20 to-[#0c0f2e]",
     img: "/gallery/match-day.jpg",
  },
  {
    label: "QR Entry",
    span: "col-span-2 md:col-span-3",
    grad: "from-[#1e2452] to-[#0c0f2e]",
    img: "/gallery/arena-entrance.png",
  },
];

export default function Gallery() {
  return (
    <section id="gallery" className="relative mx-auto max-w-7xl px-6 py-28">
      <SectionReveal className="mb-12 text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-white/40">
          The Atmosphere
        </p>
        <h2 className="mt-3 font-display text-4xl font-black text-white sm:text-5xl">
          Step inside the <span className="text-gradient">arena</span>.
        </h2>
      </SectionReveal>

      <div className="grid auto-rows-[180px] grid-cols-2 gap-4 md:grid-cols-4">
        {TILES.map((t, i) => (
          <SectionReveal key={t.label} delay={i * 0.08} className={t.span}>
            <motion.div
              whileHover={{ scale: 0.98 }}
              className={`group relative h-full w-full overflow-hidden rounded-2xl border border-border-subtle bg-gradient-to-br ${t.grad}`}
            >
              {/* Real image (if provided) — fills the tile, zooms on hover */}
              {t.img && (
                <Image
                  src={t.img}
                  alt={t.label}
                  fill
                  sizes="(max-width: 768px) 50vw, 25vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
              )}

              {/* Tech grid overlay (sits above image) */}
              <div className="absolute inset-0 grid-lines opacity-30" />

              {/* Bottom gradient for label legibility */}
              <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

              {/* Soft dim that lifts on hover */}
              <div className="absolute inset-0 bg-black/20 transition-colors group-hover:bg-black/0" />

              <span className="absolute bottom-4 left-4 font-display text-sm font-bold uppercase tracking-wider text-white/90">
                {t.label}
              </span>
            </motion.div>
          </SectionReveal>
        ))}
      </div>
    </section>
  );
}
