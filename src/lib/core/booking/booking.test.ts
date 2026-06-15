import { describe, it, expect } from "vitest";
import { canTransition, assertTransition, initialStatus } from "./transitions";
import { computeHoldExpiry } from "./holds";
import { sliceWindow, dayOfWeekInTz, instantToLocalMinutes } from "./slots";
import { computeAvailability } from "./availability";
import { applyMembership } from "../memberships/apply";
import type { PricingRuleInput } from "../pricing/engine";

describe("booking transitions", () => {
  it("allows legal transitions and rejects illegal ones", () => {
    expect(canTransition("reserved", "confirmed")).toBe(true);
    expect(canTransition("confirmed", "checked_in")).toBe(true);
    expect(canTransition("completed", "in_progress")).toBe(false);
    expect(canTransition("pending_payment", "checked_in")).toBe(false);
    expect(() => assertTransition("completed", "confirmed")).toThrow();
  });

  it("picks the right initial status per payment method", () => {
    expect(initialStatus("online", "online")).toBe("pending_payment");
    expect(initialStatus("bank_transfer", "online")).toBe("pending_verification");
    expect(initialStatus("cash_on_arrival", "online")).toBe("reserved");
    expect(initialStatus("cash_on_arrival", "walk_in")).toBe("confirmed");
  });
});

describe("hold expiry", () => {
  const created = new Date("2026-06-15T10:00:00Z");
  it("online holds for 15 minutes", () => {
    const exp = computeHoldExpiry("online", created, new Date("2026-06-20T10:00:00Z"));
    expect(exp?.toISOString()).toBe("2026-06-15T10:15:00.000Z");
  });
  it("bank transfer holds up to 4h but never past the slot", () => {
    const soon = computeHoldExpiry("bank_transfer", created, new Date("2026-06-15T12:00:00Z"));
    expect(soon?.toISOString()).toBe("2026-06-15T12:00:00.000Z"); // capped at starts_at
    const far = computeHoldExpiry("bank_transfer", created, new Date("2026-06-20T10:00:00Z"));
    expect(far?.toISOString()).toBe("2026-06-15T14:00:00.000Z"); // 4h
  });
  it("cash on arrival never expires", () => {
    expect(computeHoldExpiry("cash_on_arrival", created, new Date("2026-06-20T10:00:00Z"))).toBeNull();
  });
});

describe("slot slicing (Asia/Karachi, UTC+5, no DST)", () => {
  it("produces hourly slots converted to correct UTC instants", () => {
    const slots = sliceWindow("2026-06-15", "09:00:00", "23:00:00", 60, "Asia/Karachi");
    expect(slots.length).toBe(14);
    // 09:00 PKT = 04:00 UTC
    expect(slots[0].startsAt).toBe("2026-06-15T04:00:00.000Z");
    expect(slots[0].endsAt).toBe("2026-06-15T05:00:00.000Z");
    // local minutes round-trip
    expect(instantToLocalMinutes(slots[0].startsAt, "Asia/Karachi")).toBe(9 * 60);
  });

  it("computes weekday from a bare date", () => {
    expect(dayOfWeekInTz("2026-06-15")).toBe(1); // Monday
  });
});

describe("availability composition", () => {
  const rules: PricingRuleInput[] = [
    {
      id: "base",
      court_id: null,
      sport_id: null,
      days_of_week: null,
      time_from: null,
      time_to: null,
      price_per_slot: 3000,
      currency: "PKR",
      label: "Off-peak",
      priority: 0,
      is_active: true,
    },
  ];

  it("marks booked slots unavailable and prices the rest", () => {
    const slots = computeAvailability({
      courtId: "c1",
      sportId: "cricket",
      dateISO: "2026-06-20",
      timezone: "Asia/Karachi",
      schedule: { opens: "09:00:00", closes: "12:00:00", slotMinutes: 60 },
      busy: [{ startsAt: "2026-06-20T05:00:00.000Z", endsAt: "2026-06-20T06:00:00.000Z" }], // 10:00 PKT
      blocks: [],
      rules,
      membership: null,
      now: new Date("2026-06-15T00:00:00Z"),
    });
    expect(slots.length).toBe(3); // 9,10,11
    expect(slots[0].available).toBe(true);
    expect(slots[0].price).toBe(3000);
    expect(slots[1].available).toBe(false); // 10:00 is booked
  });

  it("applies a membership discount to the price", () => {
    expect(applyMembership(3000, { discountPct: 10, priorityBookingDays: 0 })).toBe(2700);
    expect(applyMembership(3000, null)).toBe(3000);
  });
});
