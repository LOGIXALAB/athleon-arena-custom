/**
 * Pricing engine — most-specific rule wins. Pure: rules in, price out.
 * The owner's pricing screen writes the rules (DB rows); this never contains them.
 */

export interface PricingRuleInput {
  id: string;
  court_id: string | null;
  sport_id: string | null;
  days_of_week: number[] | null;
  time_from: string | null; // 'HH:MM:SS'
  time_to: string | null;
  price_per_slot: number;
  currency: string;
  label: string | null;
  priority: number;
  is_active: boolean;
}

export interface PriceQuery {
  courtId: string;
  sportId: string;
  dow: number; // 0=Sun
  /** Minutes since local midnight for the slot start. */
  startMinutes: number;
}

export interface ResolvedPrice {
  amount: number;
  currency: string;
  label?: string;
  ruleId?: string;
}

export class NoPriceError extends Error {
  constructor() {
    super("NO_PRICE_CONFIGURED");
    this.name = "NoPriceError";
  }
}

function toMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}

function inWindow(startMinutes: number, from: string | null, to: string | null): boolean {
  if (from == null || to == null) return true;
  const f = toMinutes(from);
  const t = toMinutes(to);
  // window is [from, to)
  if (f <= t) return startMinutes >= f && startMinutes < t;
  // wrap past midnight
  return startMinutes >= f || startMinutes < t;
}

export function resolvePrice(rules: PricingRuleInput[], q: PriceQuery): ResolvedPrice {
  const matches = rules.filter(
    (r) =>
      r.is_active &&
      (r.court_id == null || r.court_id === q.courtId) &&
      (r.sport_id == null || r.sport_id === q.sportId) &&
      (r.days_of_week == null || r.days_of_week.includes(q.dow)) &&
      inWindow(q.startMinutes, r.time_from, r.time_to),
  );

  if (matches.length === 0) throw new NoPriceError();

  const specificity = (r: PricingRuleInput) =>
    Number(!!r.court_id) +
    Number(!!r.sport_id) +
    Number(!!r.days_of_week) +
    Number(!!(r.time_from && r.time_to));

  const best = matches
    .slice()
    .sort((a, b) => specificity(b) - specificity(a) || b.priority - a.priority)[0];

  return {
    amount: Number(best.price_per_slot),
    currency: best.currency,
    label: best.label ?? undefined,
    ruleId: best.id,
  };
}
