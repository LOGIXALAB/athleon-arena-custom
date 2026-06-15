"use client";
import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/client";
import { browserClient } from "@/lib/db/browser";
import { channels } from "@/lib/realtime/channels";
import { StatusBadge } from "@/components/StatusBadge";
import { waLink } from "@/lib/core/notify/providers/wa-click-to-send";
import { bookingConfirmedMessage } from "@/lib/core/notify/registry";
import { WalkInDialog } from "./WalkInDialog";

interface OpsBooking {
  id: string;
  courtId: string;
  courtName: string;
  sportId: string;
  startsAt: string;
  endsAt: string;
  status: string;
  source: string;
  paymentMethod: string;
  amountDue: number;
  currency: string;
  arrivedAt: string | null;
  customerName: string | null;
  customerPhone: string | null;
  managementToken: string;
  paymentStatus: string | null;
  proofCount: number;
  hasMatch: boolean;
}

export function OpsBoard({
  venueId,
  timezone,
  dateISO,
  courts,
  sports,
  initialBookings,
  siteUrl,
}: {
  venueId: string;
  timezone: string;
  dateISO: string;
  courts: { id: string; name: string }[];
  sports: { id: string; name: string }[];
  initialBookings: OpsBooking[];
  siteUrl: string;
}) {
  const [date, setDate] = useState(dateISO);
  const [bookings, setBookings] = useState<OpsBooking[]>(initialBookings);
  const [selected, setSelected] = useState<string | null>(null);
  const [walkIn, setWalkIn] = useState(false);

  const refresh = useCallback(async (d: string) => {
    const data = await apiFetch<{ bookings: OpsBooking[] }>(`/api/ops/today?date=${d}`);
    setBookings(data.bookings);
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await apiFetch<{ bookings: OpsBooking[] }>(`/api/ops/today?date=${date}`);
        if (active) setBookings(data.bookings);
      } catch {
        /* keep last good data */
      }
    })();
    return () => {
      active = false;
    };
  }, [date]);

  // live updates from the ops channel
  useEffect(() => {
    const ch = browserClient()
      .channel(channels.ops(venueId), { config: { broadcast: { self: false } } })
      .on("broadcast", { event: "*" }, () => void refresh(date))
      .subscribe();
    return () => {
      void browserClient().removeChannel(ch);
    };
  }, [venueId, date, refresh]);

  const fmt = (iso: string) =>
    new Intl.DateTimeFormat("en-US", { timeZone: timezone, hour: "numeric", minute: "2-digit" }).format(new Date(iso));
  const shiftDay = (n: number) => {
    const d = new Date(`${date}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + n);
    setDate(d.toISOString().slice(0, 10));
  };

  const selectedBooking = bookings.find((b) => b.id === selected) ?? null;

  return (
    <main className="mx-auto max-w-7xl px-5 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button onClick={() => shiftDay(-1)} className="rounded-md border border-border-strong px-3 py-1.5 transition hover:bg-surface-2">←</button>
          <button onClick={() => setDate(dateISO)} className="rounded-md border border-border-strong px-3 py-1.5 text-sm transition hover:bg-surface-2">Today</button>
          <button onClick={() => shiftDay(1)} className="rounded-md border border-border-strong px-3 py-1.5 transition hover:bg-surface-2">→</button>
          <span className="ml-2 numeral text-2xl font-bold">
            {new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" }).format(new Date(`${date}T12:00:00Z`))}
          </span>
        </div>
        <button onClick={() => setWalkIn(true)} className="rounded-md bg-volt px-4 py-2 text-sm font-semibold text-[#07090a] transition hover:bg-volt-dim">
          + Walk-in booking
        </button>
      </div>

      <div className="mt-6 grid gap-5" style={{ gridTemplateColumns: `repeat(${Math.max(courts.length, 1)}, minmax(0,1fr))` }}>
        {courts.map((court) => {
          const list = bookings.filter((b) => b.courtId === court.id);
          return (
            <div key={court.id}>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-fg-muted">{court.name}</h2>
              <div className="space-y-2">
                {list.length === 0 && <p className="text-sm text-fg-faint">No bookings.</p>}
                {list.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => setSelected(b.id)}
                    className="w-full rounded-lg border border-border bg-surface-1 p-3 text-left transition hover:bg-surface-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="numeral text-lg font-semibold">{fmt(b.startsAt)}</span>
                      <StatusBadge status={b.status} />
                    </div>
                    <div className="mt-1 flex items-center justify-between text-sm text-fg-muted">
                      <span className="capitalize">{b.sportId} · {b.customerName ?? b.customerPhone ?? "Guest"}</span>
                      <span>{b.currency} {b.amountDue.toLocaleString()}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {selectedBooking && (
        <BookingDrawer
          booking={selectedBooking}
          timezone={timezone}
          siteUrl={siteUrl}
          onClose={() => setSelected(null)}
          onChanged={() => refresh(date)}
        />
      )}

      {walkIn && (
        <WalkInDialog
          courts={courts}
          sports={sports}
          dateISO={date}
          timezone={timezone}
          onClose={() => setWalkIn(false)}
          onCreated={() => {
            setWalkIn(false);
            void refresh(date);
          }}
        />
      )}
    </main>
  );
}

function BookingDrawer({
  booking,
  timezone,
  siteUrl,
  onClose,
  onChanged,
}: {
  booking: OpsBooking;
  timezone: string;
  siteUrl: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [proofs, setProofs] = useState<string[] | null>(null);
  const fmt = (iso: string) =>
    new Intl.DateTimeFormat("en-US", { timeZone: timezone, hour: "numeric", minute: "2-digit" }).format(new Date(iso));

  async function act(action: string, body?: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/api/ops/bookings/${booking.id}/${action}`, { method: "POST", json: body ?? {} });
      onChanged();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }

  async function loadProofs() {
    const data = await apiFetch<{ urls: string[] }>(`/api/ops/bookings/${booking.id}/proofs`);
    setProofs(data.urls);
  }

  const manageUrl = `${siteUrl}/manage/${booking.managementToken}`;
  const waMsg = bookingConfirmedMessage({
    customerName: booking.customerName,
    sportName: booking.sportId,
    courtName: booking.courtName,
    startsAtLocal: fmt(booking.startsAt),
    manageUrl,
  });
  const waUrl = booking.customerPhone ? waLink(booking.customerPhone, waMsg) : null;

  const s = booking.status;
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50" onClick={onClose}>
      <div className="h-full w-full max-w-md overflow-y-auto border-l border-border bg-bg p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <div className="numeral text-2xl font-bold">{fmt(booking.startsAt)} – {fmt(booking.endsAt)}</div>
            <div className="mt-1 text-sm text-fg-muted capitalize">{booking.sportId} · {booking.courtName}</div>
          </div>
          <button onClick={onClose} className="text-fg-muted hover:text-fg">✕</button>
        </div>
        <div className="mt-3"><StatusBadge status={s} /></div>

        <dl className="mt-5 space-y-2 text-sm">
          <Row k="Customer" v={booking.customerName ?? "—"} />
          <Row k="Phone" v={booking.customerPhone ?? "—"} />
          <Row k="Amount" v={`${booking.currency} ${booking.amountDue.toLocaleString()}`} />
          <Row k="Method" v={booking.paymentMethod.replace(/_/g, " ")} />
          <Row k="Payment" v={booking.paymentStatus ?? "—"} />
          <Row k="Source" v={booking.source} />
        </dl>

        {booking.proofCount > 0 && (
          <div className="mt-4">
            {!proofs ? (
              <button onClick={loadProofs} className="text-sm text-volt hover:text-volt-dim">View {booking.proofCount} payment screenshot(s)</button>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {proofs.map((u) => (
                  <a key={u} href={u} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-md border border-border">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={u} alt="payment proof" className="h-28 w-full object-cover" />
                  </a>
                ))}
              </div>
            )}
          </div>
        )}

        {error && <p className="mt-4 text-sm text-danger">{error}</p>}

        <div className="mt-6 space-y-2">
          {(s === "pending_verification" || s === "pending_payment") && (
            <Action label="Confirm payment" primary busy={busy} onClick={() => act("confirm-payment")} />
          )}
          {s === "reserved" && (
            <Action label="Mark arrived + collect cash" primary busy={busy} onClick={() => act("arrive", { withCash: true })} />
          )}
          {s === "confirmed" && (
            <Action label="Mark arrived" primary busy={busy} onClick={() => act("arrive")} />
          )}
          {waUrl && (s === "confirmed" || s === "checked_in" || s === "in_progress") && (
            <a href={waUrl} target="_blank" rel="noopener noreferrer" className="block rounded-md border border-border-strong bg-surface-2 px-4 py-2.5 text-center text-sm font-medium transition hover:bg-surface-3">
              Send manage link on WhatsApp
            </a>
          )}
          {(s === "checked_in" || s === "in_progress") && (
            <a href={`/ops/match/${booking.id}`} className="block rounded-md border border-volt/40 bg-volt/10 px-4 py-2.5 text-center text-sm font-medium text-volt transition hover:bg-volt/20">
              {booking.hasMatch ? "Open match control" : "Start match"}
            </a>
          )}
          {["reserved", "confirmed"].includes(s) && (
            <Action label="Mark no-show" busy={busy} onClick={() => act("no-show")} />
          )}
          {["pending_payment", "pending_verification", "reserved", "confirmed"].includes(s) && (
            <Action label="Cancel booking" danger busy={busy} onClick={() => act("cancel")} />
          )}
        </div>
      </div>
    </div>
  );
}

function Action({ label, onClick, busy, primary, danger }: { label: string; onClick: () => void; busy: boolean; primary?: boolean; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className={
        "block w-full rounded-md px-4 py-2.5 text-center text-sm font-medium transition disabled:opacity-40 " +
        (primary
          ? "bg-volt text-[#07090a] hover:bg-volt-dim"
          : danger
            ? "border border-danger/30 text-danger hover:bg-danger/10"
            : "border border-border-strong bg-surface-2 hover:bg-surface-3")
      }
    >
      {label}
    </button>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-fg-muted">{k}</dt>
      <dd className="font-medium capitalize">{v}</dd>
    </div>
  );
}
