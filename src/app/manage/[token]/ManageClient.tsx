"use client";
import { useState } from "react";
import { StatusBadge } from "@/components/StatusBadge";
import { ProofUpload } from "@/components/booking/ProofUpload";
import { RosterEditor } from "./RosterEditor";
import { ScoreTab } from "./ScoreTab";
import { waLink } from "@/lib/core/notify/providers/wa-click-to-send";
import type { VenueSettings } from "@/lib/db/tables";

export interface ManagePlayer {
  id: string;
  name: string;
  jerseyNo: number | null;
  role: string | null;
}
export interface ManageTeam {
  side: "A" | "B";
  name: string | null;
  captainName: string | null;
  contactPhone: string | null;
  players: ManagePlayer[];
}
export interface ManageData {
  booking: {
    id: string;
    status: string;
    sportId: string;
    sportName: string;
    startsAt: string;
    endsAt: string;
    paymentMethod: string;
    amountDue: number;
    currency: string;
  };
  venue: { name: string; timezone: string; settings: VenueSettings };
  court: { name: string };
  teams: ManageTeam[];
  match: { id: string; status: string } | null;
}

type Tab = "booking" | "roster" | "score";

export function ManageClient({
  token,
  initial,
  roles,
  maxPlayers,
  formats,
}: {
  token: string;
  initial: ManageData;
  roles: string[];
  maxPlayers: number;
  formats: { id: string; label: string }[];
}) {
  const [tab, setTab] = useState<Tab>("booking");
  const { booking, venue, court } = initial;
  const fmt = (iso: string) =>
    new Intl.DateTimeFormat("en-US", {
      timeZone: venue.timezone,
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(iso));

  return (
    <main className="mx-auto max-w-3xl px-5 py-10">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-volt">Manage booking</p>
          <h1 className="numeral mt-1 text-3xl font-bold uppercase">
            {booking.sportName} · {court.name}
          </h1>
          <p className="mt-1 text-sm text-fg-muted">{fmt(booking.startsAt)}</p>
        </div>
        <StatusBadge status={booking.status} />
      </div>

      <div className="mt-6 flex gap-1 rounded-lg border border-border bg-surface-1 p-1 text-sm">
        {(["booking", "roster", "score"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={
              "flex-1 rounded-md px-3 py-2 font-medium capitalize transition " +
              (tab === t ? "bg-volt text-[#07090a]" : "text-fg-muted hover:text-fg")
            }
          >
            {t === "booking" ? "Booking" : t === "roster" ? "Teams & Players" : "Score Match"}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === "booking" && <BookingTab token={token} data={initial} fmt={fmt} />}
        {tab === "roster" && (
          <RosterEditor token={token} teams={initial.teams} roles={roles} maxPlayers={maxPlayers} />
        )}
        {tab === "score" && <ScoreTab token={token} data={initial} formats={formats} />}
      </div>
    </main>
  );
}

function BookingTab({
  token,
  data,
  fmt,
}: {
  token: string;
  data: ManageData;
  fmt: (iso: string) => string;
}) {
  const { booking, venue } = data;
  const bank = venue.settings.bank;
  const showBankInstructions =
    booking.paymentMethod === "bank_transfer" &&
    (booking.status === "pending_verification" || booking.status === "pending_payment");

  return (
    <div className="space-y-5">
      <div className="card p-5">
        <dl className="space-y-2 text-sm">
          <Row k="When" v={`${fmt(booking.startsAt)} – ${new Intl.DateTimeFormat("en-US", { timeZone: venue.timezone, hour: "numeric", minute: "2-digit" }).format(new Date(booking.endsAt))}`} />
          <Row k="Amount" v={`${booking.currency} ${booking.amountDue.toLocaleString()}`} />
          <Row k="Payment" v={booking.paymentMethod.replace(/_/g, " ")} />
        </dl>
      </div>

      {showBankInstructions && bank && (
        <div className="card p-5">
          <h3 className="font-semibold">Complete your bank transfer</h3>
          <dl className="mt-3 space-y-1 text-sm">
            <Row k="Bank" v={bank.bankName} />
            <Row k="Title" v={bank.accountTitle} />
            <Row k="Account" v={bank.accountNumber} />
            <Row k="IBAN" v={bank.iban} />
          </dl>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <ProofUpload manageToken={token} />
            {venue.settings.whatsappNumber && (
              <a
                href={waLink(venue.settings.whatsappNumber, `Hi! Payment screenshot for my ${booking.sportName} booking.`)}
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

      {booking.paymentMethod === "cash_on_arrival" && booking.status === "reserved" && (
        <div className="card p-5 text-sm text-fg-muted">
          Pay <span className="text-fg">{booking.currency} {booking.amountDue.toLocaleString()}</span> in cash when you arrive. Our ops manager confirms your booking on the spot.
        </div>
      )}
    </div>
  );
}

function Row({ k, v }: { k: string; v?: string }) {
  if (!v) return null;
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-fg-muted">{k}</dt>
      <dd className="font-medium capitalize">{v}</dd>
    </div>
  );
}
