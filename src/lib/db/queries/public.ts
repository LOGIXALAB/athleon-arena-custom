import "server-only";
import { db } from "@/lib/db/server";
import { isSupabaseConfigured } from "@/lib/env";
import type { MembershipPlan, Sport, Venue } from "@/lib/db/tables";

/** Defaults mirror supabase seed so the brand site renders before the DB exists. */
const FALLBACK_SPORTS: Sport[] = [
  {
    id: "cricket",
    name: "Cricket",
    module_key: "cricket",
    roster_schema: { roles: ["Batsman", "Bowler", "All-rounder", "Wicketkeeper"], maxPlayers: 8, teamCount: 2 },
    display_order: 1,
    is_active: true,
  },
  {
    id: "futsal",
    name: "Futsal",
    module_key: "futsal",
    roster_schema: { roles: ["Goalkeeper", "Defender", "Pivot", "Winger"], maxPlayers: 6, teamCount: 2 },
    display_order: 2,
    is_active: true,
  },
];

const FALLBACK_PLANS: MembershipPlan[] = [
  { id: "silver", name: "Silver", monthly_price: 3000, discount_pct: 5, free_practice_hours: 0, priority_booking_days: 0, perks: ["5% off every booking", "Member-only updates"], display_order: 1, is_active: true },
  { id: "gold", name: "Gold", monthly_price: 6000, discount_pct: 10, free_practice_hours: 2, priority_booking_days: 2, perks: ["10% off bookings", "2 free practice hours / month", "Book 2 days earlier"], display_order: 2, is_active: true },
  { id: "elite", name: "Elite", monthly_price: 10000, discount_pct: 15, free_practice_hours: 4, priority_booking_days: 3, perks: ["15% off bookings", "4 free practice hours / month", "Book 3 days earlier", "Priority support"], display_order: 3, is_active: true },
];

const FALLBACK_VENUE: Venue = {
  id: "11111111-1111-1111-1111-111111111111",
  name: "Athleon Arena",
  address: "Main Boulevard, Lahore",
  timezone: "Asia/Karachi",
  settings: {
    bank: { bankName: "Meezan Bank", accountTitle: "Athleon Arena", accountNumber: "0102000123456", iban: "PK00MEZN0001020001234567" },
    whatsappNumber: "+923001234567",
    phone: "+924235000000",
    socials: { instagram: "athleon.arena" },
  },
  is_active: true,
  created_at: new Date(0).toISOString(),
};

export async function getActiveSports(): Promise<Sport[]> {
  if (!isSupabaseConfigured()) return FALLBACK_SPORTS;
  try {
    const { data } = await db()
      .from("sports")
      .select("*")
      .eq("is_active", true)
      .order("display_order");
    return (data as Sport[] | null)?.length ? (data as Sport[]) : FALLBACK_SPORTS;
  } catch {
    return FALLBACK_SPORTS;
  }
}

export async function getMembershipPlans(): Promise<MembershipPlan[]> {
  if (!isSupabaseConfigured()) return FALLBACK_PLANS;
  try {
    const { data } = await db()
      .from("membership_plans")
      .select("*")
      .eq("is_active", true)
      .order("display_order");
    return (data as MembershipPlan[] | null)?.length ? (data as MembershipPlan[]) : FALLBACK_PLANS;
  } catch {
    return FALLBACK_PLANS;
  }
}

export async function getVenue(): Promise<Venue> {
  if (!isSupabaseConfigured()) return FALLBACK_VENUE;
  try {
    const { data } = await db().from("venues").select("*").eq("is_active", true).limit(1).single();
    return (data as Venue | null) ?? FALLBACK_VENUE;
  } catch {
    return FALLBACK_VENUE;
  }
}
