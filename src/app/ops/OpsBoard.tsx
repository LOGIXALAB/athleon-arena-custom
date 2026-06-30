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

type View = "day" | "week" | "month";

// ---- date-only helpers (math via UTC noon to dodge DST) ----
const isoDate = (d: Date) => d.toISOString().slice(0, 10);
const atNoon = (s: string) => new Date(`${s}T12:00:00Z`);
const addDays = (s: string, n: number) => {
  const d = atNoon(s);
  d.setUTCDate(d.getUTCDate() + n);
  return isoDate(d);
};
const dowMon = (s: string) => (atNoon(s).getUTCDay() + 6) % 7; // 0=Mon .. 6=Sun
const weekStart = (s: string) => addDays(s, -dowMon(s));
const monthFirst = (s: string) => `${s.slice(0, 7)}-01`;
const addMonths = (s: string, n: number) => {
  const d = atNoon(monthFirst(s));
  d.setUTCMonth(d.getUTCMonth() + n);
  return isoDate(d);
};
const dayLabel = (s: string, opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("en-US", { timeZone: "UTC", ...opts }).format(atNoon(s));

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
  const [view, setView] = useState<View>("day");
  const [cursor, setCursor] = useState(dateISO);
  const [bookings, setBookings] = useState<OpsBooking[]>(initialBookings);
  const [selected, setSelected] = useState<string | null>(null);
  const [walkIn, setWalkIn] = useState(false);

  // the inclusive [from, to] day-range to fetch for the active view
  const range =
    view === "week"
      ? { from: weekStart(cursor), to: addDays(weekStart(cursor), 6) }
      : view === "month"
        ? { from: weekStart(monthFirst(cursor)), to: addDays(weekStart(monthFirst(cursor)), 41) }
        : { from: cursor, to: cursor };

  const refresh = useCallback(async (from: string, to: string) => {
    const data = await apiFetch<{ bookings: OpsBooking[] }>(`/api/ops/today?from=${from}&to=${to}`);
    setBookings(data.bookings);
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await apiFetch<{ bookings: OpsBooking[] }>(`/api/ops/today?from=${range.from}&to=${range.to}`);
        if (active) setBookings(data.bookings);
      } catch {
        /* keep last good data */
      }
    })();
    return () => {
      active = false;
    };
  }, [range.from, range.to]);

  // live updates from the ops channel
  useEffect(() => {
    const ch = browserClient()
      .channel(channels.ops(venueId), { config: { broadcast: { self: false } } })
      .on("broadcast", { event: "*" }, () => void refresh(range.from, range.to))
      .subscribe();
    return () => {
      void browserClient().removeChannel(ch);
    };
  }, [venueId, range.from, range.to, refresh]);

  const fmt = (iso: string) =>
    new Intl.DateTimeFormat("en-US", { timeZone: timezone, hour: "numeric", minute: "2-digit" }).format(new Date(iso));
  const localDate = (iso: string) =>
    new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(new Date(iso)); // YYYY-MM-DD
  const localHour = (iso: string) =>
    Number(new Intl.DateTimeFormat("en-US", { timeZone: timezone, hour: "numeric", hour12: false }).format(new Date(iso))) % 24;

  const shift = (dir: number) => {
    if (view === "week") setCursor((c) => addDays(c, 7 * dir));
    else if (view === "month") setCursor((c) => addMonths(c, dir));
    else setCursor((c) => addDays(c, dir));
  };

  const heading =
    view === "month"
      ? dayLabel(cursor, { month: "long", year: "numeric" })
      : view === "week"
        ? `${dayLabel(range.from, { month: "short", day: "numeric" })} – ${dayLabel(range.to, { month: "short", day: "numeric" })}`
        : dayLabel(cursor, { weekday: "long", day: "numeric", month: "long" });

  const selectedBooking = bookings.find((b) => b.id === selected) ?? null;

  return (
    <main className="mx-auto max-w-7xl px-5 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button onClick={() => shift(-1)} className="rounded-md border border-border-strong px-3 py-1.5 transition hover:bg-surface-2">←</button>
          <button onClick={() => setCursor(dateISO)} className="rounded-md border border-border-strong px-3 py-1.5 text-sm transition hover:bg-surface-2">Today</button>
          <button onClick={() => shift(1)} className="rounded-md border border-border-strong px-3 py-1.5 transition hover:bg-surface-2">→</button>
          <span className="ml-2 numeral text-2xl font-bold">{heading}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border border-border-strong p-0.5 text-sm">
            {(["day", "week", "month"] as View[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={"rounded px-3 py-1 capitalize transition " + (view === v ? "bg-volt font-semibold text-[#07090a]" : "text-fg-muted hover:text-fg")}
              >
                {v}
              </button>
            ))}
          </div>
          <button onClick={() => setWalkIn(true)} className="rounded-md bg-volt px-4 py-2 text-sm font-semibold text-[#07090a] transition hover:bg-volt-dim">
            + Walk-in
          </button>
        </div>
      </div>

      <div className="mt-6">
        {view === "day" && <DayView bookings={bookings} courts={courts} fmt={fmt} onSelect={setSelected} />}
        {view === "week" && (
          <WeekView
            days={Array.from({ length: 7 }, (_, i) => addDays(range.from, i))}
            bookings={bookings}
            localDate={localDate}
            localHour={localHour}
            fmt={fmt}
            onSelect={setSelected}
          />
        )}
        {view === "month" && (
          <MonthView
            cells={Array.from({ length: 42 }, (_, i) => addDays(range.from, i))}
            month={cursor.slice(0, 7)}
            today={dateISO}
            bookings={bookings}
            localDate={localDate}
            onPickDay={(d) => {
              setCursor(d);
              setView("day");
            }}
          />
        )}
      </div>

      {selectedBooking && (
        <BookingDrawer
          booking={selectedBooking}
          timezone={timezone}
          siteUrl={siteUrl}
          onClose={() => setSelected(null)}
          onChanged={() => refresh(range.from, range.to)}
        />
      )}

      {walkIn && (
        <WalkInDialog
          courts={courts}
          sports={sports}
          dateISO={cursor}
          timezone={timezone}
          onClose={() => setWalkIn(false)}
          onCreated={() => {
            setWalkIn(false);
            void refresh(range.from, range.to);
          }}
        />
      )}
    </main>
  );
}

/** Colour a calendar block by booking status. */
function statusTone(s: string): string {
  if (["confirmed", "checked_in", "in_progress"].includes(s)) return "border-volt/50 bg-volt/15 text-volt";
  if (["pending_payment", "pending_verification", "reserved"].includes(s)) return "border-warn/40 bg-warn/10 text-warn";
  if (s === "completed") return "border-info/40 bg-info/10 text-info";
  return "border-border bg-surface-2 text-fg-muted"; // cancelled / expired / no_show
}

function DayView({
  bookings,
  courts,
  fmt,
  onSelect,
}: {
  bookings: OpsBooking[];
  courts: { id: string; name: string }[];
  fmt: (iso: string) => string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="grid gap-5" style={{ gridTemplateColumns: `repeat(${Math.max(courts.length, 1)}, minmax(0,1fr))` }}>
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
                  onClick={() => onSelect(b.id)}
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
  );
}

function WeekView({
  days,
  bookings,
  localDate,
  localHour,
  fmt,
  onSelect,
}: {
  days: string[];
  bookings: OpsBooking[];
  localDate: (iso: string) => string;
  localHour: (iso: string) => number;
  fmt: (iso: string) => string;
  onSelect: (id: string) => void;
}) {
  let minH = 9;
  let maxH = 23;
  for (const b of bookings) {
    minH = Math.min(minH, localHour(b.startsAt));
    const eh = localHour(b.endsAt);
    maxH = Math.max(maxH, eh === 0 ? 24 : eh);
  }
  const hours: number[] = [];
  for (let h = minH; h < maxH; h++) hours.push(h);
  const cols = "56px repeat(7, minmax(0,1fr))";
  const hourLabel = (h: number) => `${h % 12 === 0 ? 12 : h % 12} ${h < 12 ? "AM" : "PM"}`;

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <div className="min-w-[760px]">
        <div className="grid bg-surface-1" style={{ gridTemplateColumns: cols }}>
          <div className="p-2" />
          {days.map((d) => (
            <div key={d} className="border-l border-border p-2 text-center">
              <div className="text-xs uppercase text-fg-muted">{dayLabel(d, { weekday: "short" })}</div>
              <div className="numeral text-lg font-bold">{dayLabel(d, { day: "numeric" })}</div>
            </div>
          ))}
        </div>
        {hours.map((h) => (
          <div key={h} className="grid border-t border-border" style={{ gridTemplateColumns: cols }}>
            <div className="p-2 text-right text-xs text-fg-faint">{hourLabel(h)}</div>
            {days.map((d) => {
              const cell = bookings.filter((b) => localDate(b.startsAt) === d && localHour(b.startsAt) === h);
              return (
                <div key={d} className="min-h-[3.25rem] border-l border-border p-1">
                  {cell.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => onSelect(b.id)}
                      className={"mb-1 block w-full rounded border px-1.5 py-1 text-left text-[11px] leading-tight transition hover:brightness-125 " + statusTone(b.status)}
                    >
                      <div className="font-semibold">{fmt(b.startsAt)}</div>
                      <div className="truncate opacity-80">{b.customerName ?? b.customerPhone ?? "Guest"}</div>
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function MonthView({
  cells,
  month,
  today,
  bookings,
  localDate,
  onPickDay,
}: {
  cells: string[];
  month: string; // YYYY-MM
  today: string;
  bookings: OpsBooking[];
  localDate: (iso: string) => string;
  onPickDay: (d: string) => void;
}) {
  const countByDay: Record<string, number> = {};
  for (const b of bookings) {
    const d = localDate(b.startsAt);
    countByDay[d] = (countByDay[d] ?? 0) + 1;
  }
  const wd = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return (
    <div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold uppercase text-fg-muted">
        {wd.map((d) => (
          <div key={d} className="py-1">{d}</div>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((d) => {
          const inMonth = d.slice(0, 7) === month;
          const count = countByDay[d] ?? 0;
          const isToday = d === today;
          return (
            <button
              key={d}
              onClick={() => onPickDay(d)}
              className={
                "flex min-h-[4.5rem] flex-col rounded-lg border p-2 text-left transition hover:bg-surface-2 " +
                (inMonth ? "border-border bg-surface-1" : "border-border/40 bg-surface-1/40 text-fg-faint") +
                (isToday ? " ring-1 ring-volt" : "")
              }
            >
              <span className={"numeral text-sm font-bold " + (isToday ? "text-volt" : "")}>
                {dayLabel(d, { day: "numeric" })}
              </span>
              {count > 0 && (
                <span className="mt-auto inline-flex w-fit rounded-full bg-volt/15 px-2 py-0.5 text-xs font-medium text-volt">
                  {count} booking{count > 1 ? "s" : ""}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
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
