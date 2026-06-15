import Link from "next/link";
import type { Sport } from "@/lib/db/tables";

export function Nav({ sports, showMemberships }: { sports: Sport[]; showMemberships: boolean }) {
  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-bg/80 backdrop-blur">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-md bg-volt text-[#07090a] font-bold">A</span>
          <span className="numeral text-xl font-semibold tracking-wide">ATHLEON</span>
        </Link>
        <div className="hidden items-center gap-7 text-sm text-fg-muted sm:flex">
          <Link href="/#sports" className="transition hover:text-fg">Sports</Link>
          {showMemberships && (
            <Link href="/memberships" className="transition hover:text-fg">Memberships</Link>
          )}
          <Link href="/gallery" className="transition hover:text-fg">Gallery</Link>
          <Link href="/#contact" className="transition hover:text-fg">Contact</Link>
        </div>
        <div className="hidden items-center gap-2 sm:flex">
          {sports.map((s) => (
            <Link
              key={s.id}
              href={`/book/${s.id}`}
              className="rounded-md border border-border-strong bg-surface-2 px-3 py-1.5 text-sm font-medium transition hover:bg-surface-3"
            >
              Book {s.name}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  );
}
