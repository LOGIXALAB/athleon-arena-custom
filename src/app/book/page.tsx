import Link from "next/link";
import { getActiveSports } from "@/lib/db/queries/public";

/** Booking entry: pick a sport, then continue to /book/[sport]. */
export default async function BookIndexPage() {
  const sports = await getActiveSports();
  const home = process.env.NEXT_PUBLIC_MARKETING_URL || "/book";

  return (
    <main className="mx-auto max-w-3xl px-5 py-10">
      <a href={home} className="text-sm text-fg-muted transition hover:text-fg">
        ← Athleon Arena
      </a>
      <h1 className="numeral mt-3 text-4xl font-bold uppercase">Book a slot</h1>
      <p className="mt-2 text-fg-muted">Choose your sport to get started.</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {sports.map((s) => (
          <Link
            key={s.id}
            href={`/book/${s.id}`}
            className="rounded-xl border border-border-strong bg-surface-2 px-5 py-6 transition hover:bg-surface-3"
          >
            <span className="numeral block text-2xl font-semibold uppercase">{s.name}</span>
            <span className="mt-1 block text-sm text-fg-muted">Book {s.name} →</span>
          </Link>
        ))}
      </div>
    </main>
  );
}
