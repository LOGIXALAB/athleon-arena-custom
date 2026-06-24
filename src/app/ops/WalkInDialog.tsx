"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/client";

interface Slot {
  startsAt: string;
  endsAt: string;
  available: boolean;
  price: number;
  currency: string;
  priceLabel?: string;
}

export function WalkInDialog({
  courts,
  sports,
  dateISO,
  timezone,
  onClose,
  onCreated,
}: {
  courts: { id: string; name: string }[];
  sports: { id: string; name: string }[];
  dateISO: string;
  timezone: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [sportId, setSportId] = useState(sports[0]?.id ?? "");
  const [courtId, setCourtId] = useState(courts[0]?.id ?? "");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selected, setSelected] = useState<Slot[]>([]);
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const run = async () => {
      setSelected([]);
      try {
        const data = await apiFetch<{ slots: Slot[] }>(
          `/api/availability?sportId=${sportId}&courtId=${courtId}&date=${dateISO}`,
        );
        if (active) setSlots(data.slots.filter((s) => s.available));
      } catch {
        if (active) setSlots([]);
      }
    };
    void run();
    return () => {
      active = false;
    };
  }, [sportId, courtId, dateISO]);

  const fmt = (iso: string) =>
    new Intl.DateTimeFormat("en-US", { timeZone: timezone, hour: "numeric", minute: "2-digit" }).format(new Date(iso));

  // Consecutive selection: tap to start, tap adjacent to extend, tap selected to
  // trim, tap a non-adjacent slot to restart (gaps / occupied slots not allowed).
  function pickSlot(s: Slot) {
    setSelected((prev) => {
      if (prev.length === 0) return [s];
      const idx = prev.findIndex((x) => x.startsAt === s.startsAt);
      if (idx !== -1) return prev.slice(0, idx);
      const first = prev[0];
      const last = prev[prev.length - 1];
      if (s.startsAt === last.endsAt) return [...prev, s];
      if (s.endsAt === first.startsAt) return [s, ...prev];
      return [s];
    });
  }

  const startsAt = selected[0]?.startsAt;
  const endsAt = selected[selected.length - 1]?.endsAt;
  const total = selected.reduce((sum, s) => sum + s.price, 0);
  const currency = selected[0]?.currency ?? "PKR";

  async function create() {
    if (!selected.length || phone.length < 6) return;
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/api/ops/bookings`, {
        method: "POST",
        json: {
          courtId,
          sportId,
          startsAt,
          endsAt,
          phone,
          name: name || undefined,
          amount: total,
        },
      });
      onCreated();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create walk-in");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-xl border border-border bg-bg p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="numeral text-2xl font-bold uppercase">Walk-in booking</h2>
          <button onClick={onClose} className="text-fg-muted hover:text-fg">✕</button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <select className="input" value={sportId} onChange={(e) => setSportId(e.target.value)}>
            {sports.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select className="input" value={courtId} onChange={(e) => setCourtId(e.target.value)}>
            {courts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div className="mt-3">
          <div className="mb-1 text-xs uppercase tracking-wide text-fg-muted">
            Available slots <span className="normal-case text-fg-faint">· tap consecutive slots for multiple hours</span>
          </div>
          <div className="grid max-h-40 grid-cols-3 gap-2 overflow-y-auto">
            {slots.length === 0 && <p className="col-span-3 text-sm text-fg-faint">No free slots.</p>}
            {slots.map((s) => {
              const on = selected.some((x) => x.startsAt === s.startsAt);
              return (
                <button
                  key={s.startsAt}
                  onClick={() => pickSlot(s)}
                  className={"rounded-md border px-2 py-2 text-sm transition " + (on ? "border-volt bg-volt/15 ring-1 ring-volt" : "border-border bg-surface-2 hover:bg-surface-3")}
                >
                  <div className="numeral font-semibold">{fmt(s.startsAt)}</div>
                  <div className="text-xs text-fg-muted">{s.currency} {s.price.toLocaleString()}</div>
                </button>
              );
            })}
          </div>
          {selected.length > 0 && (
            <div className="mt-2 flex items-center justify-between rounded-md border border-volt/40 bg-volt/10 px-3 py-2 text-sm">
              <span className="numeral font-semibold">
                {selected.length}h · {fmt(startsAt!)} – {fmt(endsAt!)}
              </span>
              <span className="numeral font-bold text-volt">{currency} {total.toLocaleString()}</span>
            </div>
          )}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <input className="input" placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <input className="input" placeholder="Name (optional)" value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        {error && <p className="mt-3 text-sm text-danger">{error}</p>}
        <button
          onClick={create}
          disabled={!selected.length || phone.length < 6 || busy}
          className="mt-4 w-full rounded-lg bg-volt px-6 py-3 font-semibold text-[#07090a] transition enabled:hover:bg-volt-dim disabled:opacity-40"
        >
          {busy
            ? "Creating…"
            : selected.length > 0
              ? `Create booking · ${currency} ${total.toLocaleString()} (cash)`
              : "Create confirmed booking (cash)"}
        </button>
      </div>
    </div>
  );
}
