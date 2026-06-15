/**
 * Seeds non-auth reference + demo data. Idempotent (safe to re-run).
 * Run after `npm run db:push`:  npm run seed
 *
 * Requires .env.local with NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.
 */
import { createClient } from "@supabase/supabase-js";
import { existsSync } from "node:fs";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}
const sb = createClient(url, key, { auth: { persistSession: false } });

export const VENUE_ID = "11111111-1111-1111-1111-111111111111";
export const COURT_ID = "22222222-2222-2222-2222-222222222222";

function isoFromNow(days: number, hour: number, minutes = 0) {
  // Build an Asia/Karachi-local wall time `days` from today at `hour`.
  // PKT is UTC+5 with no DST, so subtract 5h to get the UTC instant.
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  d.setUTCHours(hour - 5, minutes, 0, 0);
  return d.toISOString();
}

async function ok(label: string, p: PromiseLike<{ error: unknown }>) {
  const { error } = await p;
  if (error) {
    console.error(`✗ ${label}:`, error);
    process.exit(1);
  }
  console.log(`✓ ${label}`);
}

async function main() {
  // Venue
  await ok(
    "venue",
    sb.from("venues").upsert({
      id: VENUE_ID,
      name: "Athleon Arena",
      address: "Main Boulevard, Lahore",
      timezone: "Asia/Karachi",
      settings: {
        bank: {
          bankName: "Meezan Bank",
          accountTitle: "Athleon Arena",
          accountNumber: "0102000123456",
          iban: "PK00MEZN0001020001234567",
        },
        whatsappNumber: "+923001234567",
        phone: "+924235000000",
        socials: { instagram: "athleon.arena" },
        cancellation: { windowHours: 12, feePct: 0 },
      },
      is_active: true,
    }),
  );

  // Sports
  await ok(
    "sports",
    sb.from("sports").upsert([
      {
        id: "cricket",
        name: "Cricket",
        module_key: "cricket",
        display_order: 1,
        roster_schema: {
          roles: ["Batsman", "Bowler", "All-rounder", "Wicketkeeper"],
          maxPlayers: 8,
          teamCount: 2,
        },
        is_active: true,
      },
      {
        id: "futsal",
        name: "Futsal",
        module_key: "futsal",
        display_order: 2,
        roster_schema: {
          roles: ["Goalkeeper", "Defender", "Pivot", "Winger"],
          maxPlayers: 6,
          teamCount: 2,
        },
        is_active: true,
      },
    ]),
  );

  // Court
  await ok(
    "court",
    sb.from("courts").upsert({
      id: COURT_ID,
      venue_id: VENUE_ID,
      name: "Court 1",
      surface: "turf",
      is_active: true,
    }),
  );

  await ok(
    "court_sports",
    sb.from("court_sports").upsert([
      { court_id: COURT_ID, sport_id: "cricket", changeover_minutes: 15 },
      { court_id: COURT_ID, sport_id: "futsal", changeover_minutes: 15 },
    ]),
  );

  // Schedules — wipe + reinsert for this court (no natural key)
  await sb.from("court_schedules").delete().eq("court_id", COURT_ID);
  await ok(
    "court_schedules",
    sb.from("court_schedules").insert(
      Array.from({ length: 7 }, (_, dow) => ({
        court_id: COURT_ID,
        day_of_week: dow,
        opens: "09:00:00",
        closes: "23:00:00",
        slot_minutes: 60,
      })),
    ),
  );

  // Pricing — wipe + reinsert for this venue
  await sb.from("pricing_rules").delete().eq("venue_id", VENUE_ID);
  await ok(
    "pricing_rules",
    sb.from("pricing_rules").insert([
      {
        venue_id: VENUE_ID,
        price_per_slot: 3000,
        currency: "PKR",
        label: "Off-peak",
        priority: 0,
        is_active: true,
      },
      {
        venue_id: VENUE_ID,
        days_of_week: [5, 6, 0], // Fri, Sat, Sun
        time_from: "18:00:00",
        time_to: "23:00:00",
        price_per_slot: 5000,
        currency: "PKR",
        label: "Peak",
        priority: 10,
        is_active: true,
      },
      {
        venue_id: VENUE_ID,
        sport_id: "cricket",
        days_of_week: [1, 2, 3, 4], // weekday cricket — exercises specificity
        price_per_slot: 3500,
        currency: "PKR",
        label: "Cricket weekday",
        priority: 5,
        is_active: true,
      },
    ]),
  );

  // Membership plans
  await ok(
    "membership_plans",
    sb.from("membership_plans").upsert([
      {
        id: "silver",
        name: "Silver",
        monthly_price: 3000,
        discount_pct: 5,
        free_practice_hours: 0,
        priority_booking_days: 0,
        perks: ["5% off every booking", "Member-only updates"],
        display_order: 1,
        is_active: true,
      },
      {
        id: "gold",
        name: "Gold",
        monthly_price: 6000,
        discount_pct: 10,
        free_practice_hours: 2,
        priority_booking_days: 2,
        perks: ["10% off bookings", "2 free practice hours / month", "Book 2 days earlier"],
        display_order: 2,
        is_active: true,
      },
      {
        id: "elite",
        name: "Elite",
        monthly_price: 10000,
        discount_pct: 15,
        free_practice_hours: 4,
        priority_booking_days: 3,
        perks: ["15% off bookings", "4 free practice hours / month", "Book 3 days earlier", "Priority support"],
        display_order: 3,
        is_active: true,
      },
    ]),
  );

  // Feature flags
  await ok(
    "feature_flags",
    sb.from("feature_flags").upsert([
      { key: "memberships", enabled: true, config: {} },
      { key: "online_payments", enabled: false, config: {} },
      { key: "gallery_uploads", enabled: true, config: {} },
      { key: "tournaments", enabled: false, config: {} },
      { key: "streaming", enabled: false, config: {} },
      { key: "fantasy", enabled: false, config: {} },
    ]),
  );

  // Display state for Court 1
  await ok(
    "court_display_state",
    sb.from("court_display_state").upsert({ court_id: COURT_ID, mode: "headline" }),
  );

  // Demo customers + historical completed bookings (so analytics renders)
  const customers = [
    { id: "c0000001-0000-0000-0000-000000000001", phone: "+923011112221", full_name: "Hamza Khan" },
    { id: "c0000001-0000-0000-0000-000000000002", phone: "+923011112222", full_name: "Ayesha Tariq" },
    { id: "c0000001-0000-0000-0000-000000000003", phone: "+923011112223", full_name: "Bilal Ahmed" },
  ];
  await ok("customers", sb.from("customers").upsert(customers));

  // Clear prior demo history then insert fresh
  await sb.from("bookings").delete().like("notes", "seed:%");
  const history = [
    { d: -2, h: 19, sport: "cricket", cust: 0, amt: 5000, method: "cash_on_arrival", src: "online", lbl: "Peak" },
    { d: -2, h: 20, sport: "futsal", cust: 1, amt: 5000, method: "bank_transfer", src: "online", lbl: "Peak" },
    { d: -3, h: 11, sport: "cricket", cust: 2, amt: 3500, method: "cash_on_arrival", src: "walk_in", lbl: "Off-peak" },
    { d: -5, h: 14, sport: "futsal", cust: 0, amt: 3000, method: "cash_on_arrival", src: "online", lbl: "Off-peak" },
    { d: -6, h: 21, sport: "cricket", cust: 1, amt: 5000, method: "bank_transfer", src: "online", lbl: "Peak" },
    { d: -7, h: 12, sport: "futsal", cust: 2, amt: 3000, method: "cash_on_arrival", src: "walk_in", lbl: "Off-peak" },
  ];
  for (const [i, h] of history.entries()) {
    const startsAt = isoFromNow(h.d, h.h);
    const endsAt = isoFromNow(h.d, h.h + 1);
    const { data: b, error } = await sb
      .from("bookings")
      .insert({
        venue_id: VENUE_ID,
        court_id: COURT_ID,
        sport_id: h.sport,
        customer_id: customers[h.cust].id,
        starts_at: startsAt,
        ends_at: endsAt,
        status: "completed",
        source: h.src,
        payment_method: h.method,
        amount_due: h.amt,
        arrived_at: startsAt,
        notes: `seed:${h.lbl}`,
      })
      .select("id")
      .single();
    if (error) {
      console.error("✗ history booking", error);
      process.exit(1);
    }
    await sb.from("payments").insert({
      booking_id: b!.id,
      provider: h.method === "bank_transfer" ? "bank_transfer" : "cash",
      amount: h.amt,
      status: "succeeded",
      method: h.method === "bank_transfer" ? "bank" : "cash",
    });
  }
  console.log(`✓ ${history.length} historical bookings + payments`);

  console.log("\nSeed complete.");
}

main();
