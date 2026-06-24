import SectionReveal from "./ui/SectionReveal";
import CountUp from "./ui/CountUp";

// Lime-only: alternate lime glow vs cool-white for rhythm (no 2nd hue)
const STATS = [
  { to: 6, suffix: "", label: "Pro Pitches & Courts", tone: "lime" },
  { to: 12500, suffix: "+", label: "Matches Played", tone: "white" },
  { to: 4, suffix: "", label: "Giant LED Screens", tone: "lime" },
  { to: 9000, suffix: "+", label: "Active Members", tone: "white" },
] as const;

export default function StatsBand() {
  return (
    <section className="relative border-y border-border-subtle py-20">
      <div className="absolute inset-0 grid-lines opacity-20" />
      <div className="relative mx-auto grid max-w-6xl grid-cols-2 gap-10 px-6 lg:grid-cols-4">
        {STATS.map((s, i) => (
          <SectionReveal key={s.label} delay={i * 0.1} className="text-center">
            <p
              className={`font-display text-5xl font-black sm:text-6xl ${
                s.tone === "lime" ? "neon-lime" : "text-white"
              }`}
            >
              <CountUp to={s.to} suffix={s.suffix} />
            </p>
            <p className="mt-3 text-sm uppercase tracking-wider text-white/50">{s.label}</p>
          </SectionReveal>
        ))}
      </div>
    </section>
  );
}
