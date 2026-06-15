import Link from "next/link";
import { getActiveSports, getMembershipPlans } from "@/lib/db/queries/public";
import { feature } from "@/lib/config/features";

const SPORT_BLURB: Record<string, string> = {
  cricket: "Tape-ball indoor cricket with live ball-by-ball scoring on the big LED screen.",
  futsal: "Fast 5-a-side futsal on premium turf, goals and fouls tracked in real time.",
};

export default async function HomePage() {
  const [sports, plans, showMemberships] = await Promise.all([
    getActiveSports(),
    getMembershipPlans(),
    feature("memberships"),
  ]);

  return (
    <main>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-5 py-24 sm:py-32 text-center">
          <p className="mb-4 text-sm font-medium uppercase tracking-[0.35em] text-volt">
            Athleon Arena · Lahore
          </p>
          <h1 className="numeral mx-auto max-w-4xl text-6xl font-bold leading-[0.92] sm:text-8xl">
            PLAY UNDER THE <span className="text-volt">FLOODLIGHTS</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-balance text-lg text-fg-muted">
            Premium indoor cricket &amp; futsal. Book in seconds, build your team, and watch
            every run and goal light up the stadium screen.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            {sports.map((s, i) => (
              <Link
                key={s.id}
                href={`/book/${s.id}`}
                className={
                  i === 0
                    ? "glow rounded-[var(--radius)] bg-volt px-7 py-3 font-semibold text-[#07090a] transition hover:bg-volt-dim"
                    : "rounded-[var(--radius)] border border-border-strong bg-surface-2 px-7 py-3 font-semibold text-fg transition hover:bg-surface-3"
                }
              >
                Book {s.name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* About / high-tech pitch */}
      <section className="mx-auto max-w-6xl px-5 py-16">
        <div className="grid gap-5 sm:grid-cols-3">
          {[
            { t: "Live Digital Scoring", d: "Every ball and goal tapped in by a scorer and rendered instantly on the LED display." },
            { t: "Stadium LED Screen", d: "Headline scoreboard or full scorecard — switchable live during your match." },
            { t: "Executive Viewing", d: "Lounge seating, food & drinks, and a floodlit court built for the big moments." },
          ].map((f) => (
            <div key={f.t} className="card p-6">
              <div className="mb-2 h-1 w-10 rounded bg-volt" />
              <h3 className="text-lg font-semibold">{f.t}</h3>
              <p className="mt-2 text-sm text-fg-muted">{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Sports */}
      <section id="sports" className="mx-auto max-w-6xl px-5 py-16">
        <h2 className="numeral text-3xl font-semibold uppercase tracking-wide">Choose your game</h2>
        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          {sports.map((s) => (
            <div key={s.id} className="card group overflow-hidden p-7">
              <div className="flex items-center justify-between">
                <h3 className="numeral text-4xl font-bold uppercase">{s.name}</h3>
                <span className="rounded-full border border-border-strong px-3 py-1 text-xs text-fg-muted">
                  up to {s.roster_schema.maxPlayers}/side
                </span>
              </div>
              <p className="mt-3 max-w-sm text-sm text-fg-muted">
                {SPORT_BLURB[s.id] ?? "Book a slot and bring your team."}
              </p>
              <Link
                href={`/book/${s.id}`}
                className="mt-6 inline-block rounded-md bg-volt px-5 py-2.5 text-sm font-semibold text-[#07090a] transition group-hover:bg-volt-dim"
              >
                Book {s.name} →
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Memberships teaser */}
      {showMemberships && (
        <section className="mx-auto max-w-6xl px-5 py-16">
          <div className="flex items-end justify-between">
            <h2 className="numeral text-3xl font-semibold uppercase tracking-wide">Memberships</h2>
            <Link href="/memberships" className="text-sm text-volt hover:text-volt-dim">
              See all plans →
            </Link>
          </div>
          <div className="mt-8 grid gap-5 sm:grid-cols-3">
            {plans.map((p) => (
              <div key={p.id} className="card p-6">
                <div className="numeral text-2xl font-bold uppercase">{p.name}</div>
                <div className="mt-1 text-sm text-fg-muted">
                  PKR {p.monthly_price.toLocaleString()} / month
                </div>
                <div className="mt-4 text-3xl font-bold text-volt">{p.discount_pct}%</div>
                <div className="text-xs text-fg-faint">off every booking</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Food & Lounge */}
      <section className="mx-auto max-w-6xl px-5 py-16">
        <div className="card flex flex-col items-start gap-4 p-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="numeral text-3xl font-semibold uppercase tracking-wide">Food &amp; Lounge</h2>
            <p className="mt-2 max-w-lg text-sm text-fg-muted">
              Refuel between innings. Our café and executive lounge keep players and spectators
              in the game long after the final whistle.
            </p>
          </div>
          <Link
            href="/#contact"
            className="rounded-md border border-border-strong bg-surface-2 px-5 py-2.5 text-sm font-medium transition hover:bg-surface-3"
          >
            Visit us
          </Link>
        </div>
      </section>
    </main>
  );
}
