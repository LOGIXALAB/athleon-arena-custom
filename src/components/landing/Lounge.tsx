import SectionReveal from "./ui/SectionReveal";
import GlassCard from "./ui/GlassCard";

const ITEMS = [
  {
    title: "Juice & Shake Bar",
    desc: "Cold-pressed juices, protein shakes and recovery smoothies, served courtside.",
    emoji: "🥤",
    accent: "green" as const,
  },
  {
    title: "Family Viewing Zone",
    desc: "Tiered lounge seating with a clear line to the pitch and the giant LED screen.",
    emoji: "🛋️",
    accent: "orange" as const,
  },
  {
    title: "Executive Café",
    desc: "Premium bites and barista coffee in a warm, cinematic ambience.",
    emoji: "☕",
    accent: "orange" as const,
  },
];

export default function Lounge() {
  return (
    <section id="lounge" className="relative mx-auto max-w-7xl px-6 py-28">
      <SectionReveal className="max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-white/40">
          Food &amp; Lounge
        </p>
        <h2 className="mt-3 font-display text-4xl font-black text-white sm:text-5xl">
          Recover in <span className="text-gradient">style</span>.
        </h2>
        <p className="mt-4 max-w-lg text-white/55">
          The game doesn&apos;t end at the boundary. Refuel and unwind in an executive
          space built for players and their families.
        </p>
      </SectionReveal>

      <div className="mt-14 grid gap-6 md:grid-cols-3">
        {ITEMS.map((it, i) => (
          <SectionReveal key={it.title} delay={i * 0.1}>
            <GlassCard accent={it.accent} className="h-full p-8">
              <span className="text-4xl">{it.emoji}</span>
              <h3 className="mt-5 font-display text-xl font-bold text-white">{it.title}</h3>
              <p className="mt-2 text-sm text-white/55">{it.desc}</p>
            </GlassCard>
          </SectionReveal>
        ))}
      </div>
    </section>
  );
}
