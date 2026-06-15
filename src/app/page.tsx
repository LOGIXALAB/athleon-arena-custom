import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <p className="mb-4 text-sm font-medium uppercase tracking-[0.3em] text-volt">
        Athleon Arena
      </p>
      <h1 className="numeral max-w-3xl text-6xl font-bold leading-[0.95] sm:text-8xl">
        PLAY UNDER THE <span className="text-volt">FLOODLIGHTS</span>
      </h1>
      <p className="mt-6 max-w-xl text-balance text-lg text-fg-muted">
        Indoor cricket &amp; futsal. Book your slot, build your team, and watch
        the live score light up the big screen.
      </p>
      <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
        <Link
          href="/book/cricket"
          className="glow rounded-[var(--radius)] bg-volt px-7 py-3 font-semibold text-[#07090a] transition hover:bg-volt-dim"
        >
          Book Cricket
        </Link>
        <Link
          href="/book/futsal"
          className="rounded-[var(--radius)] border border-border-strong bg-surface-2 px-7 py-3 font-semibold text-fg transition hover:bg-surface-3"
        >
          Book Futsal
        </Link>
      </div>
      <p className="mt-16 text-xs text-fg-faint">
        Phase 0 scaffold · floodlit theme online
      </p>
    </main>
  );
}
