"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { browserClient } from "@/lib/db/browser";
import type { StaffRole } from "@/lib/db/tables";

export function StaffTopBar({ role, name }: { role: StaffRole; name: string }) {
  const router = useRouter();
  const canAdmin = role === "owner" || role === "admin";

  async function signOut() {
    await browserClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-5">
        <div className="flex items-center gap-6">
          <Link href="/ops" className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded bg-volt text-[#07090a] font-bold">A</span>
            <span className="numeral text-lg font-semibold">ATHLEON</span>
          </Link>
          <nav className="flex items-center gap-4 text-sm text-fg-muted">
            <Link href="/ops" className="transition hover:text-fg">Ops</Link>
            {canAdmin && <Link href="/admin" className="transition hover:text-fg">Admin</Link>}
          </nav>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-fg-muted">
            {name} · <span className="capitalize text-volt">{role.replace("_", " ")}</span>
          </span>
          <button onClick={signOut} className="rounded-md border border-border-strong px-3 py-1 transition hover:bg-surface-2">
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
