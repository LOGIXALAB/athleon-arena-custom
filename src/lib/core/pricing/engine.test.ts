import { describe, it, expect } from "vitest";
import { resolvePrice, NoPriceError, type PricingRuleInput } from "./engine";

const base: PricingRuleInput = {
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
};

const peak: PricingRuleInput = {
  id: "peak",
  court_id: null,
  sport_id: null,
  days_of_week: [5, 6, 0],
  time_from: "18:00:00",
  time_to: "23:00:00",
  price_per_slot: 5000,
  currency: "PKR",
  label: "Peak",
  priority: 10,
  is_active: true,
};

const cricketWeekday: PricingRuleInput = {
  id: "cwd",
  court_id: null,
  sport_id: "cricket",
  days_of_week: [1, 2, 3, 4],
  time_from: null,
  time_to: null,
  price_per_slot: 3500,
  currency: "PKR",
  label: "Cricket weekday",
  priority: 5,
  is_active: true,
};

const rules = [base, peak, cricketWeekday];

describe("pricing engine — most specific rule wins", () => {
  it("falls back to the venue-wide base off-peak", () => {
    const r = resolvePrice(rules, { courtId: "c1", sportId: "futsal", dow: 1, startMinutes: 10 * 60 });
    expect(r.amount).toBe(3000);
    expect(r.label).toBe("Off-peak");
  });

  it("applies peak on Friday evening", () => {
    const r = resolvePrice(rules, { courtId: "c1", sportId: "futsal", dow: 5, startMinutes: 19 * 60 });
    expect(r.amount).toBe(5000);
    expect(r.label).toBe("Peak");
  });

  it("prefers the sport-specific weekday rule over base", () => {
    const r = resolvePrice(rules, { courtId: "c1", sportId: "cricket", dow: 2, startMinutes: 11 * 60 });
    expect(r.amount).toBe(3500);
    expect(r.label).toBe("Cricket weekday");
  });

  it("peak (more specific window+days) beats cricket-weekday on a peak day", () => {
    // Friday is not in cricketWeekday days, so peak wins cleanly on Fri evening
    const r = resolvePrice(rules, { courtId: "c1", sportId: "cricket", dow: 5, startMinutes: 20 * 60 });
    expect(r.amount).toBe(5000);
  });

  it("throws when nothing matches", () => {
    expect(() =>
      resolvePrice([peak], { courtId: "c1", sportId: "futsal", dow: 1, startMinutes: 10 * 60 }),
    ).toThrow(NoPriceError);
  });
});
