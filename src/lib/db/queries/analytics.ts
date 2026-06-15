import "server-only";
import { db } from "@/lib/db/server";
import { resolvePrice, type PricingRuleInput } from "@/lib/core/pricing/engine";
import { dayOfWeekInTz, instantToLocalDateISO, instantToLocalMinutes } from "@/lib/core/booking/slots";
import type { Booking, CourtSchedule, MembershipPlan } from "@/lib/db/tables";

const REVENUE_STATUSES = ["confirmed", "checked_in", "in_progress", "completed"];

export interface Analytics {
  totals: { revenue: number; bookings: number; noShows: number; noShowLostRevenue: number };
  revenueByDay: { date: string; amount: number }[];
  methodSplit: { method: string; amount: number; count: number }[];
  peakSplit: { label: string; amount: number; count: number }[];
  sourceSplit: { source: string; amount: number; count: number }[];
  sportsMix: { sport: string; amount: number; count: number }[];
  occupancy: { pct: number; bookedMinutes: number; openMinutes: number };
  memberships: { plan: string; members: number; mrr: number }[];
  heatmap: { dow: number; hour: number; count: number }[];
}

export async function getAnalytics(venueId: string, timezone: string, fromISO: string, toISO: string): Promise<Analytics> {
  const sb = db();
  const { data: bookingsData } = await sb
    .from("bookings")
    .select("*")
    .eq("venue_id", venueId)
    .gte("starts_at", fromISO)
    .lt("starts_at", toISO);
  const bookings = (bookingsData as Booking[]) ?? [];

  const { data: rulesData } = await sb.from("pricing_rules").select("*").eq("venue_id", venueId).eq("is_active", true);
  const rules = (rulesData as PricingRuleInput[]) ?? [];

  const { data: schedData } = await sb.from("court_schedules").select("*");
  const schedules = (schedData as CourtSchedule[]) ?? [];

  const revenueBookings = bookings.filter((b) => REVENUE_STATUSES.includes(b.status));
  const totalRevenue = revenueBookings.reduce((n, b) => n + Number(b.amount_due), 0);
  const noShows = bookings.filter((b) => b.status === "no_show");

  // revenue by day
  const dayMap = new Map<string, number>();
  for (const b of revenueBookings) {
    const d = instantToLocalDateISO(b.starts_at, timezone);
    dayMap.set(d, (dayMap.get(d) ?? 0) + Number(b.amount_due));
  }
  const revenueByDay = [...dayMap.entries()].map(([date, amount]) => ({ date, amount })).sort((a, b) => a.date.localeCompare(b.date));

  // splits
  const accum = (key: (b: Booking) => string) => {
    const m = new Map<string, { amount: number; count: number }>();
    for (const b of revenueBookings) {
      const k = key(b);
      const cur = m.get(k) ?? { amount: 0, count: 0 };
      cur.amount += Number(b.amount_due);
      cur.count += 1;
      m.set(k, cur);
    }
    return m;
  };
  const methodSplit = [...accum((b) => b.payment_method).entries()].map(([method, v]) => ({ method, ...v }));
  const sourceSplit = [...accum((b) => b.source).entries()].map(([source, v]) => ({ source, ...v }));
  const sportsMix = [...accum((b) => b.sport_id).entries()].map(([sport, v]) => ({ sport, ...v }));

  // peak split — re-resolve the pricing label per booking
  const peakMap = new Map<string, { amount: number; count: number }>();
  for (const b of revenueBookings) {
    let label = "Unlabelled";
    try {
      const d = instantToLocalDateISO(b.starts_at, timezone);
      const r = resolvePrice(rules, { courtId: b.court_id, sportId: b.sport_id, dow: dayOfWeekInTz(d), startMinutes: instantToLocalMinutes(b.starts_at, timezone) });
      label = r.label ?? "Unlabelled";
    } catch {
      /* no rule */
    }
    const cur = peakMap.get(label) ?? { amount: 0, count: 0 };
    cur.amount += Number(b.amount_due);
    cur.count += 1;
    peakMap.set(label, cur);
  }
  const peakSplit = [...peakMap.entries()].map(([label, v]) => ({ label, ...v }));

  // occupancy: booked minutes vs scheduled open minutes across the range
  const bookedMinutes = revenueBookings.reduce(
    (n, b) => n + (new Date(b.ends_at).getTime() - new Date(b.starts_at).getTime()) / 60000,
    0,
  );
  const days = Math.max(1, Math.round((new Date(toISO).getTime() - new Date(fromISO).getTime()) / 86400000));
  // average daily open minutes across courts (sum of schedule windows / 7 * days)
  const weeklyOpen = schedules.reduce((n, s) => {
    const [oh, om] = s.opens.split(":").map(Number);
    const [ch, cm] = s.closes.split(":").map(Number);
    let mins = ch * 60 + cm - (oh * 60 + om);
    if (mins <= 0) mins += 24 * 60;
    return n + mins;
  }, 0);
  const openMinutes = (weeklyOpen / 7) * days;
  const occupancy = { bookedMinutes: Math.round(bookedMinutes), openMinutes: Math.round(openMinutes), pct: openMinutes > 0 ? Math.round((bookedMinutes / openMinutes) * 1000) / 10 : 0 };

  // memberships
  const today = new Date().toISOString().slice(0, 10);
  const { data: memData } = await sb.from("memberships").select("plan_id, status").eq("status", "active").lte("starts_on", today).gte("ends_on", today);
  const { data: planData } = await sb.from("membership_plans").select("*");
  const plans = (planData as MembershipPlan[]) ?? [];
  const memberCounts = new Map<string, number>();
  for (const m of (memData as { plan_id: string }[]) ?? []) memberCounts.set(m.plan_id, (memberCounts.get(m.plan_id) ?? 0) + 1);
  const memberships = plans.map((p) => ({ plan: p.name, members: memberCounts.get(p.id) ?? 0, mrr: (memberCounts.get(p.id) ?? 0) * Number(p.monthly_price) }));

  // heatmap (dow × hour) over revenue bookings
  const heatMap = new Map<string, number>();
  for (const b of revenueBookings) {
    const d = instantToLocalDateISO(b.starts_at, timezone);
    const dow = dayOfWeekInTz(d);
    const hour = Math.floor(instantToLocalMinutes(b.starts_at, timezone) / 60);
    const k = `${dow}:${hour}`;
    heatMap.set(k, (heatMap.get(k) ?? 0) + 1);
  }
  const heatmap = [...heatMap.entries()].map(([k, count]) => {
    const [dow, hour] = k.split(":").map(Number);
    return { dow, hour, count };
  });

  return {
    totals: {
      revenue: totalRevenue,
      bookings: revenueBookings.length,
      noShows: noShows.length,
      noShowLostRevenue: noShows.reduce((n, b) => n + Number(b.amount_due), 0),
    },
    revenueByDay,
    methodSplit,
    peakSplit,
    sourceSplit,
    sportsMix,
    occupancy,
    memberships,
    heatmap,
  };
}
