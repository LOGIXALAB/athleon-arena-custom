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
  const [slot, setSlot] = useState<Slot | null>(null);
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const run = async () => {
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

  async function create() {
    if (!slot || phone.length < 6) return;
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/api/ops/bookings`, {
        method: "POST",
        json: {
          courtId,
          sportId,
          startsAt: slot.startsAt,
          endsAt: slot.endsAt,
          phone,
          name: name || undefined,
          amount: slot.price,
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
          <div className="mb-1 text-xs uppercase tracking-wide text-fg-muted">Available slots</div>
          <div className="grid max-h-40 grid-cols-3 gap-2 overflow-y-auto">
            {slots.length === 0 && <p className="col-span-3 text-sm text-fg-faint">No free slots.</p>}
            {slots.map((s) => (
              <button
                key={s.startsAt}
                onClick={() => setSlot(s)}
                className={"rounded-md border px-2 py-2 text-sm transition " + (slot?.startsAt === s.startsAt ? "border-volt bg-volt/10" : "border-border bg-surface-2 hover:bg-surface-3")}
              >
                <div className="numeral font-semibold">{fmt(s.startsAt)}</div>
                <div className="text-xs text-fg-muted">{s.currency} {s.price.toLocaleString()}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <input className="input" placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <input className="input" placeholder="Name (optional)" value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        {error && <p className="mt-3 text-sm text-danger">{error}</p>}
        <button
          onClick={create}
          disabled={!slot || phone.length < 6 || busy}
          className="mt-4 w-full rounded-lg bg-volt px-6 py-3 font-semibold text-[#07090a] transition enabled:hover:bg-volt-dim disabled:opacity-40"
        >
          {busy ? "Creating…" : "Create confirmed booking (cash)"}
        </button>
      </div>
    </div>
  );
}
