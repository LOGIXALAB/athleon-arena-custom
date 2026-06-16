const COLUMNS = [
  {
    title: "Arena",
    links: ["Cricket", "Futsal", "Live Scoring", "Player Stats"],
  },
  {
    title: "Visit",
    links: ["Book a Slot", "Membership", "Lounge & Café", "Group Events"],
  },
  {
    title: "Hours",
    links: ["Mon–Fri · 6AM–12AM", "Sat–Sun · 24 Hours", "Public Holidays · Open"],
  },
];

export default function Footer() {
  return (
    <footer className="relative border-t border-border-subtle">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-neon-orange/40 to-transparent" />
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-10 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-neon-orange font-display text-lg font-black text-black">
                A
              </span>
              <span className="font-display text-lg font-bold uppercase tracking-[0.2em] text-white">
                Athleon
              </span>
            </div>
            <p className="mt-4 max-w-xs text-sm text-white/50">
              Where Sports Meet The Future. Premium Cricket &amp; Futsal arenas, powered
              by digital intelligence.
            </p>
            <div className="mt-6 flex gap-3">
              {["IG", "X", "YT", "FB"].map((s) => (
                <a
                  key={s}
                  href="#"
                  className="grid h-9 w-9 place-items-center rounded-full border border-white/10 text-xs font-semibold text-white/60 transition-colors hover:border-neon-green/50 hover:text-neon-green-soft"
                >
                  {s}
                </a>
              ))}
            </div>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h4 className="text-sm font-semibold uppercase tracking-wider text-white">
                {col.title}
              </h4>
              <ul className="mt-4 space-y-3">
                {col.links.map((l) => (
                  <li key={l}>
                    <a
                      href="#"
                      className="text-sm text-white/50 transition-colors hover:text-neon-orange-soft"
                    >
                      {l}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-border-subtle pt-8 text-xs text-white/40 sm:flex-row">
          <p>© 2026 The Athleon Arena. All rights reserved.</p>
          <p className="font-scoreboard tracking-wider">Cricket · Futsal · Reimagined</p>
        </div>
      </div>
    </footer>
  );
}
