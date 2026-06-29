import Link from "next/link";
import { getActiveSports, getVenue } from "@/lib/db/queries/public";

/** Per-sport flavour for the picker cards (falls back gracefully for new sports). */
const SPORT_META: Record<string, { icon: string; blurb: string }> = {
  cricket: { icon: "🏏", blurb: "Indoor cricket · live smart scoring on the big screen" },
  futsal: { icon: "⚽", blurb: "5-a-side futsal under broadcast-grade floodlights" },
};

const STEPS = [
  { n: "1", t: "Pick your slot", d: "Choose a date and one or more hours." },
  { n: "2", t: "Reserve & pay", d: "Bank transfer, cash on arrival, or online." },
  { n: "3", t: "Play & score live", d: "Score your match — it shows on the arena screen." },
];

/** Booking entry: pick a sport, then continue to /book/[sport]. */
export default async function BookIndexPage() {
  const [sports, venue] = await Promise.all([getActiveSports(), getVenue()]);
  const home = process.env.NEXT_PUBLIC_MARKETING_URL || "/";
  const phone = venue.settings?.whatsappNumber ?? venue.settings?.phone ?? null;

  return (
    <main className="relative isolate overflow-hidden">
      {/* branded backdrop */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="grid-lines absolute inset-0 opacity-[0.12]" />
        <div className="absolute left-1/2 top-[-12%] h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-volt/10 blur-[120px]" />
      </div>

      <div className="mx-auto flex min-h-screen max-w-7xl flex-col justify-center px-5 py-16">
        <a href={home} className="text-sm text-fg-muted transition hover:text-fg">
          ← Athleon Arena
        </a>

        <h1 className="numeral mt-4 text-5xl font-bold uppercase sm:text-6xl">Book a slot</h1>
        <p className="mt-3 max-w-md text-fg-muted">
          Pick your sport, lock in your hour(s), and follow the live score on the arena screen.
        </p>

        {/* sport cards */}
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {sports.map((s) => {
            const meta = SPORT_META[s.id] ?? { icon: "🎯", blurb: "Book your session" };
            return (
              <Link
                key={s.id}
                href={`/book/${s.id}`}
                className="group relative overflow-hidden rounded-2xl border border-border-strong bg-surface-2 p-6 transition hover:border-volt hover:bg-surface-3"
              >
                <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-volt/0 blur-2xl transition duration-300 group-hover:bg-volt/20" />
                <div className="text-4xl">{meta.icon}</div>
                <div className="numeral mt-4 text-3xl font-bold uppercase">{s.name}</div>
                <p className="mt-1 text-sm text-fg-muted">{meta.blurb}</p>
                <div className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-volt">
                  Book {s.name}
                  <span className="transition group-hover:translate-x-1">→</span>
                </div>
              </Link>
            );
          })}
        </div>

        {/* how it works */}
        <div className="mt-12">
          <div className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-fg-faint">
            How it works
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {STEPS.map((st) => (
              <div key={st.n} className="rounded-xl border border-border bg-surface-1 p-4">
                <div className="numeral text-2xl font-bold text-volt">{st.n}</div>
                <div className="mt-1 font-semibold">{st.t}</div>
                <p className="mt-1 text-sm text-fg-muted">{st.d}</p>
              </div>
            ))}
          </div>
        </div>

        {/* venue strip */}
        <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-border bg-surface-1 px-5 py-4 text-sm text-fg-muted">
          <span className="font-medium text-fg">{venue.name}</span>
          {venue.address && <span>📍 {venue.address}</span>}
          <span>⏱️ 60-minute slots</span>
          {phone && <span>💬 {phone}</span>}
        </div>
      </div>
    </main>
  );
}
