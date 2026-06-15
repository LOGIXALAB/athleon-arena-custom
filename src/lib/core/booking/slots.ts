import { fromZonedTime } from "date-fns-tz";

export interface SlotWindow {
  startsAt: string; // ISO instant (UTC)
  endsAt: string;
}

function hmsToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}

/**
 * Slices a court's open window for a given local date into fixed slots.
 * Pure + timezone-correct: local wall times are converted to UTC instants
 * via the venue timezone. `closes` past midnight (< opens) wraps to next day.
 */
export function sliceWindow(
  dateISO: string, // 'YYYY-MM-DD' (local date in the venue tz)
  opens: string, // 'HH:MM:SS'
  closes: string,
  slotMinutes: number,
  timezone: string,
): SlotWindow[] {
  const openMin = hmsToMinutes(opens);
  let closeMin = hmsToMinutes(closes);
  if (closeMin <= openMin) closeMin += 24 * 60; // wrap past midnight

  const slots: SlotWindow[] = [];
  for (let start = openMin; start + slotMinutes <= closeMin; start += slotMinutes) {
    const startsAt = localMinutesToInstant(dateISO, start, timezone);
    const endsAt = localMinutesToInstant(dateISO, start + slotMinutes, timezone);
    slots.push({ startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString() });
  }
  return slots;
}

function localMinutesToInstant(dateISO: string, minutes: number, timezone: string): Date {
  const dayOffset = Math.floor(minutes / (24 * 60));
  const minOfDay = minutes % (24 * 60);
  const h = Math.floor(minOfDay / 60);
  const m = minOfDay % 60;
  // build the local wall-clock string, accounting for midnight wrap
  const base = new Date(`${dateISO}T00:00:00`);
  base.setDate(base.getDate() + dayOffset);
  const y = base.getFullYear();
  const mo = String(base.getMonth() + 1).padStart(2, "0");
  const d = String(base.getDate()).padStart(2, "0");
  const wall = `${y}-${mo}-${d}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`;
  return fromZonedTime(wall, timezone);
}

export function dayOfWeekInTz(dateISO: string): number {
  // dateISO is a calendar date; weekday is tz-independent for a bare date
  return new Date(`${dateISO}T12:00:00Z`).getUTCDay();
}

/** Local minutes-since-midnight for an instant, in the given timezone. */
export function instantToLocalMinutes(iso: string, timezone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(iso));
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? 0) % 24;
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return h * 60 + m;
}
