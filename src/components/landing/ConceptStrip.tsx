import SectionReveal from "./ui/SectionReveal";

const BADGES = [
  "QR Code Entry",
  "Live LED Scoring",
  "Smart Umpire Panel",
  "Real-Time Player Stats",
  "AI Match Highlights",
  "Cashless Lounge",
];

export default function ConceptStrip() {
  return (
    <section className="relative border-y border-border-subtle py-16">
      <SectionReveal className="mx-auto max-w-4xl px-6 text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-neon-orange-soft">
          Not a ground. A platform.
        </p>
        <h2 className="mt-4 font-display text-2xl font-bold text-white sm:text-3xl">
          We fused <span className="neon-orange">physical sport</span> with{" "}
          <span className="neon-green">digital intelligence</span>.
        </h2>
      </SectionReveal>

      {/* Marquee */}
      <div className="relative mt-12 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]">
        <div className="animate-marquee flex w-max gap-4">
          {[...BADGES, ...BADGES].map((b, i) => (
            <span
              key={i}
              className="glass flex shrink-0 items-center gap-2 rounded-full px-6 py-3 text-sm font-medium text-white/80"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-neon-green" />
              {b}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
