"use client";
import { useState } from "react";
import { apiFetch } from "@/lib/client";
import type { ManageTeam, ManagePlayer } from "./ManageClient";

export function RosterEditor({
  token,
  teams,
  roles,
  maxPlayers,
}: {
  token: string;
  teams: ManageTeam[];
  roles: string[];
  maxPlayers: number;
}) {
  return (
    <div className="space-y-5">
      <p className="text-sm text-fg-muted">
        Everything here is optional — you can fill names now, later, or even during the match.
        Leave it blank and we&apos;ll use “Team A / Player 1”.
      </p>
      <div className="grid gap-5 sm:grid-cols-2">
        {teams.map((t) => (
          <TeamCard key={t.side} token={token} team={t} roles={roles} maxPlayers={maxPlayers} />
        ))}
      </div>
    </div>
  );
}

function TeamCard({
  token,
  team,
  roles,
  maxPlayers,
}: {
  token: string;
  team: ManageTeam;
  roles: string[];
  maxPlayers: number;
}) {
  const [name, setName] = useState(team.name ?? "");
  const [captain, setCaptain] = useState(team.captainName ?? "");
  const [players, setPlayers] = useState<ManagePlayer[]>(team.players);
  const [savedFlash, setSavedFlash] = useState(false);
  const [newName, setNewName] = useState("");
  const [newJersey, setNewJersey] = useState("");
  const [newRole, setNewRole] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function saveTeam() {
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/api/manage/${token}/teams/${team.side}`, {
        method: "PUT",
        json: { name: name || null, captainName: captain || null },
      });
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function addPlayer() {
    if (!newName.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const { player } = await apiFetch<{ player: { id: string } }>(
        `/api/manage/${token}/teams/${team.side}/players`,
        {
          method: "POST",
          json: {
            name: newName.trim(),
            jerseyNo: newJersey ? Number(newJersey) : null,
            role: newRole || null,
          },
        },
      );
      setPlayers((p) => [
        ...p,
        { id: player.id, name: newName.trim(), jerseyNo: newJersey ? Number(newJersey) : null, role: newRole || null },
      ]);
      setNewName("");
      setNewJersey("");
      setNewRole("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add player");
    } finally {
      setBusy(false);
    }
  }

  async function removePlayer(id: string) {
    setPlayers((p) => p.filter((x) => x.id !== id));
    await apiFetch(`/api/manage/${token}/players/${id}`, { method: "DELETE" }).catch(() => {});
  }

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <span className="numeral text-xl font-bold">TEAM {team.side}</span>
        <button
          onClick={saveTeam}
          disabled={busy}
          className="rounded-md border border-border-strong bg-surface-2 px-3 py-1 text-xs font-medium transition hover:bg-surface-3"
        >
          {savedFlash ? "Saved ✓" : "Save"}
        </button>
      </div>
      <div className="mt-3 space-y-2">
        <input className="input" placeholder={`Team ${team.side} name`} value={name} onChange={(e) => setName(e.target.value)} />
        <input className="input" placeholder="Captain name" value={captain} onChange={(e) => setCaptain(e.target.value)} />
      </div>

      <div className="mt-4">
        <div className="mb-2 text-xs font-medium uppercase tracking-wide text-fg-muted">
          Players ({players.length}/{maxPlayers})
        </div>
        <ul className="space-y-1">
          {players.map((p, i) => (
            <li key={p.id} className="flex items-center justify-between rounded-md bg-surface-2 px-3 py-1.5 text-sm">
              <span>
                <span className="text-fg-faint">{p.jerseyNo ?? i + 1}.</span> {p.name}
                {p.role && <span className="ml-2 text-xs text-fg-faint">{p.role}</span>}
              </span>
              <button onClick={() => removePlayer(p.id)} className="text-fg-faint transition hover:text-danger">
                ✕
              </button>
            </li>
          ))}
          {players.length === 0 && <li className="text-xs text-fg-faint">No players yet.</li>}
        </ul>

        {players.length < maxPlayers && (
          <div className="mt-3 space-y-2">
            <input className="input" placeholder="Player name" value={newName} onChange={(e) => setNewName(e.target.value)} />
            <div className="flex gap-2">
              <input
                className="input w-20"
                placeholder="#"
                inputMode="numeric"
                value={newJersey}
                onChange={(e) => setNewJersey(e.target.value.replace(/\D/g, ""))}
              />
              <select className="input flex-1" value={newRole} onChange={(e) => setNewRole(e.target.value)}>
                <option value="">Role (optional)</option>
                {roles.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              <button
                onClick={addPlayer}
                disabled={busy || !newName.trim()}
                className="rounded-md bg-volt px-4 text-sm font-semibold text-[#07090a] transition enabled:hover:bg-volt-dim disabled:opacity-40"
              >
                Add
              </button>
            </div>
          </div>
        )}
      </div>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </div>
  );
}
