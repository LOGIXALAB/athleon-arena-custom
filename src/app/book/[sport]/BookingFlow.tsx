"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/client";
import { ProofUpload } from "@/components/booking/ProofUpload";
import { waLink } from "@/lib/core/notify/providers/wa-click-to-send";

interface Slot {
  startsAt: string;
  endsAt: string;
  available: boolean;
  price: number;
  basePrice: number;
  priceLabel?: string;
  currency: string;
}
interface Availability {
  courtId: string | null;
  courtName?: string;
  timezone: string;
  slots: Slot[];
}
type Method = "online" | "bank_transfer" | "cash_on_arrival";
interface BookingResult {
  bookingId: string;
  status: string;
  amountDue: number;
  currency: string;
  priceLabel?: string;
  paymentMethod: Method;
  manageToken: string;
  manageUrl: string;
  bank: { bankName?: string; accountTitle?: string; accountNumber?: string; iban?: string } | null;
  whatsappNumber: string | null;
}

function next14Days(): string[] {
  const out: string[] = [];
  const d = new Date();
  for (let i = 0; i < 14; i++) {
    out.push(d.toISOString().slice(0, 10));
    d.setDate(d.getDate() + 1);
  }
  return out;
}

function fmtTime(iso: string, tz: string) {
  return new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit" }).format(new Date(iso));
}
function fmtDayLabel(dateISO: string) {
  const d = new Date(`${dateISO}T12:00:00Z`);
  return {
    dow: new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "UTC" }).format(d),
    day: new Intl.DateTimeFormat("en-US", { day: "numeric", timeZone: "UTC" }).format(d),
    mon: new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" }).format(d),
  };
}

export function BookingFlow({
  sportId,
  sportName,
  onlineEnabled,
}: {
  sportId: string;
  sportName: string;
  onlineEnabled: boolean;
}) {
  const days = next14Days();
  const [date, setDate] = useState(days[0]);
  const [avail, setAvail] = useState<Availability | null>(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Slot[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [method, setMethod] = useState<Method | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BookingResult | null>(null);

  useEffect(() => {
    let active = true;
    const run = async () => {
      setLoading(true);
      setSelected([]);
      try {
        const a = await apiFetch<Availability>(`/api/availability?sportId=${sportId}&date=${date}`);
        if (active) setAvail(a);
      } catch {
        if (active) setAvail(null);
      } finally {
        if (active) setLoading(false);
      }
    };
    void run();
    return () => {
      active = false;
    };
  }, [sportId, date]);

  // Build a CONSECUTIVE selection: tap to start, tap an adjacent slot to extend,
  // tap a selected slot to trim back to it, tap a far slot to restart.
  function pickSlot(s: Slot) {
    setSelected((prev) => {
      if (prev.length === 0) return [s];
      const idx = prev.findIndex((x) => x.startsAt === s.startsAt);
      if (idx !== -1) return prev.slice(0, idx); // deselect this slot and any after it
      const first = prev[0];
      const last = prev[prev.length - 1];
      if (s.startsAt === last.endsAt) return [...prev, s]; // extend forward
      if (s.endsAt === first.startsAt) return [s, ...prev]; // extend backward
      return [s]; // not adjacent → start a new selection
    });
  }

  const startsAt = selected[0]?.startsAt;
  const endsAt = selected[selected.length - 1]?.endsAt;
  const total = selected.reduce((sum, s) => sum + s.price, 0);
  const currency = selected[0]?.currency ?? "PKR";

  // On mobile the checkout stacks below the slots; bring it into view the moment
  // the first slot is picked so the user doesn't have to hunt for the form.
  const checkoutRef = useRef<HTMLDivElement>(null);
  const prevLen = useRef(0);
  useEffect(() => {
    const wasEmpty = prevLen.current === 0;
    prevLen.current = selected.length;
    if (wasEmpty && selected.length > 0 && window.matchMedia("(max-width: 1023px)").matches) {
      checkoutRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [selected.length]);

  async function submit() {
    if (!selected.length || !method) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await apiFetch<BookingResult>(`/api/bookings`, {
        method: "POST",
        json: {
          sportId,
          courtId: avail?.courtId ?? undefined,
          startsAt,
          endsAt,
          paymentMethod: method,
          customer: { phone, name: name || undefined },
        },
      });
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not complete booking");
    } finally {
      setSubmitting(false);
    }
  }

  if (result) return <Confirmation result={result} sportName={sportName} slots={selected} tz={avail?.timezone ?? "Asia/Karachi"} />;

  const dl = fmtDayLabel(date);
  const tz = avail?.timezone ?? "Asia/Karachi";

  return (
    <div className="mt-8 lg:grid lg:grid-cols-[1.5fr_1fr] lg:items-start lg:gap-8">
      {/* LEFT — date + slots */}
      <div className="min-w-0 space-y-8">
        <Section step={1} title="Pick a date">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {days.map((d) => {
              const l = fmtDayLabel(d);
              const on = d === date;
              return (
                <button
                  key={d}
                  onClick={() => setDate(d)}
                  className={
                    "flex min-w-16 flex-col items-center rounded-lg border px-3 py-2 transition " +
                    (on ? "border-volt bg-volt text-[#07090a]" : "border-border bg-surface-2 hover:bg-surface-3")
                  }
                >
                  <span className="text-xs uppercase">{l.dow}</span>
                  <span className="numeral text-xl font-bold">{l.day}</span>
                  <span className="text-xs">{l.mon}</span>
                </button>
              );
            })}
          </div>
        </Section>

        <Section step={2} title="Choose your time">
          {loading ? (
            <p className="text-sm text-fg-muted">Loading availability…</p>
          ) : !avail || avail.slots.length === 0 ? (
            <p className="text-sm text-fg-muted">No slots available that day.</p>
          ) : (
            <>
              <p className="mb-3 text-xs text-fg-muted">
                Tap a time, then tap the next one to add more hours.
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {avail.slots.map((s) => {
                  const on = selected.some((x) => x.startsAt === s.startsAt);
                  return (
                    <button
                      key={s.startsAt}
                      disabled={!s.available}
                      onClick={() => pickSlot(s)}
                      className={
                        "rounded-lg border px-3 py-3 text-left transition " +
                        (!s.available
                          ? "cursor-not-allowed border-border bg-surface-1 opacity-40"
                          : on
                            ? "border-volt bg-volt/15 ring-1 ring-volt"
                            : "border-border bg-surface-2 hover:bg-surface-3")
                      }
                    >
                      <div className="numeral text-lg font-semibold">{fmtTime(s.startsAt, avail.timezone)}</div>
                      <div className="flex items-center justify-between text-xs text-fg-muted">
                        <span>{s.priceLabel ?? ""}</span>
                        <span className="font-medium text-fg">{s.currency} {s.price.toLocaleString()}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </Section>
      </div>

      {/* RIGHT — sticky checkout (stacks below on mobile) */}
      <div ref={checkoutRef} className="mt-8 min-w-0 scroll-mt-6 lg:mt-0 lg:sticky lg:top-6">
        {selected.length === 0 ? (
          <div className="card flex flex-col items-center p-8 text-center text-fg-muted">
            <div className="text-3xl">🗓️</div>
            <p className="mt-3 text-sm">Pick a time to continue your booking.</p>
          </div>
        ) : (
          <div className="card space-y-5 p-5">
            {/* summary */}
            <div className="flex items-start justify-between border-b border-border pb-4">
              <div>
                <div className="numeral text-lg font-semibold">
                  {selected.length} hour{selected.length > 1 ? "s" : ""}
                </div>
                <div className="text-sm text-fg-muted">
                  {fmtTime(startsAt!, tz)} – {fmtTime(endsAt!, tz)}
                </div>
                <div className="text-xs text-fg-faint">
                  {sportName} · {dl.dow} {dl.day} {dl.mon}
                </div>
                <button
                  onClick={() => setSelected([])}
                  className="mt-1 text-xs text-fg-muted underline-offset-2 hover:underline"
                >
                  Clear
                </button>
              </div>
              <div className="numeral text-2xl font-bold text-volt">
                {currency} {total.toLocaleString()}
              </div>
            </div>

            {/* details */}
            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-fg-muted">Your details</div>
              <div className="grid gap-3">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name (optional)"
                  className="input"
                />
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Phone (e.g. 0300 1234567)"
                  className="input"
                />
              </div>
            </div>

            {/* payment */}
            {phone.length >= 6 && (
              <div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-fg-muted">How will you pay?</div>
                <div className="grid gap-2">
                  <PayCard
                    active={method === "bank_transfer"}
                    onClick={() => setMethod("bank_transfer")}
                    title="Bank transfer"
                    desc="Transfer now and upload a screenshot — we verify it within minutes."
                  />
                  <PayCard
                    active={method === "cash_on_arrival"}
                    onClick={() => setMethod("cash_on_arrival")}
                    title="Reserve & pay cash on arrival"
                    desc="Lock the slot now, pay at the ground when you arrive."
                  />
                  <PayCard
                    active={method === "online"}
                    onClick={() => onlineEnabled && setMethod("online")}
                    disabled={!onlineEnabled}
                    title="Pay online (Easypaisa / JazzCash)"
                    desc={onlineEnabled ? "Pay securely online now." : "Coming soon."}
                  />
                </div>
              </div>
            )}

            {error && <p className="text-sm text-danger">{error}</p>}

            <button
              disabled={!method || phone.length < 6 || submitting}
              onClick={submit}
              className="w-full rounded-lg bg-volt px-6 py-3 font-semibold text-[#07090a] transition enabled:hover:bg-volt-dim disabled:opacity-40"
            >
              {submitting
                ? "Booking…"
                : phone.length < 6
                  ? "Enter your phone to continue"
                  : !method
                    ? "Choose a payment method"
                    : `Confirm booking · ${currency} ${total.toLocaleString()}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ step, title, children }: { step: number; title: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <span className="grid h-6 w-6 place-items-center rounded-full bg-surface-3 text-xs font-semibold text-volt">
          {step}
        </span>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-fg-muted">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function PayCard({
  active,
  onClick,
  disabled,
  title,
  desc,
}: {
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
  title: string;
  desc: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={
        "rounded-lg border px-4 py-3 text-left transition " +
        (disabled
          ? "cursor-not-allowed border-border bg-surface-1 opacity-50"
          : active
            ? "border-volt bg-volt/10"
            : "border-border bg-surface-2 hover:bg-surface-3")
      }
    >
      <div className="flex items-center justify-between">
        <span className="font-medium">{title}</span>
        {active && <span className="text-volt">●</span>}
        {disabled && <span className="rounded-full border border-border px-2 py-0.5 text-xs text-fg-faint">Soon</span>}
      </div>
      <p className="mt-1 text-sm text-fg-muted">{desc}</p>
    </button>
  );
}

function Confirmation({
  result,
  sportName,
  slots,
  tz,
}: {
  result: BookingResult;
  sportName: string;
  slots: Slot[];
  tz: string;
}) {
  const when =
    slots.length > 0
      ? `${fmtTime(slots[0].startsAt, tz)} – ${fmtTime(slots[slots.length - 1].endsAt, tz)}`
      : "";
  return (
    <div className="mt-10 space-y-6">
      <div className="card glow p-6 text-center">
        <div className="text-volt text-4xl">✓</div>
        <h2 className="numeral mt-2 text-3xl font-bold uppercase">
          {result.paymentMethod === "cash_on_arrival" ? "Slot reserved" : "Booking received"}
        </h2>
        <p className="mt-1 text-fg-muted">
          {sportName} · {when} · {result.currency} {result.amountDue.toLocaleString()}
        </p>
      </div>

      {result.paymentMethod === "bank_transfer" && result.bank && (
        <div className="card p-6">
          <h3 className="font-semibold">Transfer the amount, then upload your screenshot</h3>
          <dl className="mt-4 space-y-1 text-sm">
            <Row k="Bank" v={result.bank.bankName} />
            <Row k="Title" v={result.bank.accountTitle} />
            <Row k="Account" v={result.bank.accountNumber} />
            <Row k="IBAN" v={result.bank.iban} />
            <Row k="Amount" v={`${result.currency} ${result.amountDue.toLocaleString()}`} />
          </dl>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <ProofUpload manageToken={result.manageToken} />
            {result.whatsappNumber && (
              <a
                href={waLink(
                  result.whatsappNumber,
                  `Hi Athleon Arena! I've paid for my ${sportName} booking (${when}). Here's my screenshot.`,
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md border border-border-strong bg-surface-2 px-4 py-2 text-sm font-medium transition hover:bg-surface-3"
              >
                Send on WhatsApp
              </a>
            )}
          </div>
        </div>
      )}

      {result.paymentMethod === "cash_on_arrival" && (
        <div className="card p-6 text-sm text-fg-muted">
          Your slot is held. Please arrive on time and pay <span className="text-fg">{result.currency} {result.amountDue.toLocaleString()}</span> in cash at the counter — our ops manager will confirm your booking on the spot.
        </div>
      )}

      <Link
        href={`/manage/${result.manageToken}`}
        className="glow block rounded-lg bg-volt px-6 py-4 text-center text-lg font-semibold text-[#07090a] transition hover:bg-volt-dim"
      >
        Set up your teams &amp; players →
      </Link>
      <p className="text-center text-xs text-fg-faint">
        Keep this link — it manages your booking and unlocks live scoring 30 minutes before your slot.
      </p>
    </div>
  );
}

function Row({ k, v }: { k: string; v?: string }) {
  if (!v) return null;
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-fg-muted">{k}</dt>
      <dd className="font-medium">{v}</dd>
    </div>
  );
}
