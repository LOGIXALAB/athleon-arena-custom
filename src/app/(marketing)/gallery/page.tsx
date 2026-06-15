/**
 * Gallery — storage-bucket fed (ops can upload to the public 'gallery' bucket).
 * Renders a tasteful placeholder grid until images exist.
 */
export default function GalleryPage() {
  const tiles = Array.from({ length: 6 }, (_, i) => i);
  return (
    <main className="mx-auto max-w-6xl px-5 py-20">
      <p className="text-sm font-medium uppercase tracking-[0.3em] text-volt">Gallery</p>
      <h1 className="numeral mt-3 text-5xl font-bold uppercase">The Arena</h1>
      <p className="mt-4 max-w-xl text-fg-muted">
        Floodlit turf, the big screen, and big nights. Photos drop here soon.
      </p>
      <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3">
        {tiles.map((t) => (
          <div
            key={t}
            className="aspect-[4/3] overflow-hidden rounded-[var(--radius)] border border-border bg-gradient-to-br from-surface-2 to-surface-1"
          >
            <div className="flex h-full items-center justify-center text-fg-faint">
              <span className="numeral text-4xl opacity-30">ATHLEON</span>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
