"use client";
import { useState } from "react";
import { apiFetch } from "@/lib/client";
import type { CourtBlock, CourtSchedule } from "@/lib/db/tables";

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function SchedulesClient({
  courts,
  schedules,
  blocks: initialBlocks,
  timezone,
}: {
  courts: { id: string; name: string }[];
  schedules: CourtSchedule[];
  blocks: CourtBlock[];
  timezone: string;
}) {
  const [scheds, setScheds] = useState(schedules);
  const [blocks, setBlocks] = useState(initialBlocks);
  const [newBlock, setNewBlock] = useState({ courtId: courts[0]?.id ?? "", date: "", from: "", to: "", reason: "" });
  const [flash, setFlash] = useState<string | null>(null);

  async function saveSched(s: CourtSchedule, patch: Partial<{ opens: string; closes: string }>) {
    setScheds((list) => list.map((x) => (x.id === s.id ? { ...x, ...patch } : x)));
    await apiFetch(`/api/admin/schedules/${s.id}`, { method: "PATCH", json: patch }).catch(() => {});
    setFlash(s.id);
    setTimeout(() => setFlash(null), 1000);
  }

  async function addBlock() {
    if (!newBlock.date || !newBlock.from || !newBlock.to) return;
    // build ISO from local date + time in the venue tz (approx via offset-free + Z is fine for PKT input)
    const startsAt = new Date(`${newBlock.date}T${newBlock.from}:00+05:00`).toISOString();
    const endsAt = new Date(`${newBlock.date}T${newBlock.to}:00+05:00`).toISOString();
    const { block } = await apiFetch<{ block: CourtBlock }>(`/api/admin/blocks`, {
      method: "POST",
      json: { courtId: newBlock.courtId, startsAt, endsAt, reason: newBlock.reason || undefined },
    });
    setBlocks((b) => [...b, block]);
    setNewBlock({ ...newBlock, date: "", from: "", to: "", reason: "" });
  }

  async function removeBlock(id: string) {
    setBlocks((b) => b.filter((x) => x.id !== id));
    await apiFetch(`/api/admin/blocks?id=${id}`, { method: "DELETE" }).catch(() => {});
  }

  const courtName = (id: string) => courts.find((c) => c.id === id)?.name ?? "Court";
  const fmt = (iso: string) => new Intl.DateTimeFormat("en-US", { timeZone: timezone, weekday: "short", hour: "numeric", minute: "2-digit", day: "numeric", month: "short" }).format(new Date(iso));

  return (
    <div className="mt-5 grid gap-5 lg:grid-cols-2">
      <div className="card p-5">
        <h3 className="mb-3 text-sm font-semibold uppercase text-fg-muted">Opening hours</h3>
        <div className="space-y-2">
          {scheds.map((s) => (
            <div key={s.id} className="flex items-center gap-3 text-sm">
              <span className="w-10 text-fg-muted">{DOW[s.day_of_week]}</span>
              <input type="time" className="input w-28" defaultValue={s.opens.slice(0, 5)} onBlur={(e) => saveSched(s, { opens: `${e.target.value}:00` })} />
              <span className="text-fg-faint">–</span>
              <input type="time" className="input w-28" defaultValue={s.closes.slice(0, 5)} onBlur={(e) => saveSched(s, { closes: `${e.target.value}:00` })} />
              {flash === s.id && <span className="text-xs text-ok">saved</span>}
            </div>
          ))}
        </div>
      </div>

      <div className="card p-5">
        <h3 className="mb-3 text-sm font-semibold uppercase text-fg-muted">Blocks</h3>
        <div className="space-y-1">
          {blocks.map((b) => (
            <div key={b.id} className="flex items-center justify-between rounded-md bg-surface-2 px-3 py-1.5 text-sm">
              <span>{courtName(b.court_id)} · {fmt(b.starts_at)} → {new Intl.DateTimeFormat("en-US", { timeZone: timezone, hour: "numeric", minute: "2-digit" }).format(new Date(b.ends_at))} {b.reason ? `· ${b.reason}` : ""}</span>
              <button onClick={() => removeBlock(b.id)} className="text-xs text-fg-faint hover:text-danger">✕</button>
            </div>
          ))}
          {blocks.length === 0 && <p className="text-xs text-fg-faint">No upcoming blocks.</p>}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <select className="input col-span-2" value={newBlock.courtId} onChange={(e) => setNewBlock({ ...newBlock, courtId: e.target.value })}>
            {courts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input type="date" className="input col-span-2" value={newBlock.date} onChange={(e) => setNewBlock({ ...newBlock, date: e.target.value })} />
          <input type="time" className="input" value={newBlock.from} onChange={(e) => setNewBlock({ ...newBlock, from: e.target.value })} />
          <input type="time" className="input" value={newBlock.to} onChange={(e) => setNewBlock({ ...newBlock, to: e.target.value })} />
          <input className="input col-span-2" placeholder="Reason (maintenance, event…)" value={newBlock.reason} onChange={(e) => setNewBlock({ ...newBlock, reason: e.target.value })} />
        </div>
        <button onClick={addBlock} className="mt-3 rounded-md bg-volt px-4 py-2 text-sm font-semibold text-[#07090a]">Add block</button>
      </div>
    </div>
  );
}
