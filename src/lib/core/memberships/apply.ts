/**
 * Membership discount application. Optional hook the pricing flow calls;
 * no-ops cleanly when memberships are disabled / the customer has none.
 */

export interface ActiveMembership {
  discountPct: number;
  priorityBookingDays: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function applyMembership(amount: number, m: ActiveMembership | null): number {
  if (!m || m.discountPct <= 0) return amount;
  return round2(amount * (1 - m.discountPct / 100));
}

/**
 * Members can book further ahead than the public. Returns whether a slot at
 * `slotStart` is within the booking horizon for this customer.
 */
export function withinBookingHorizon(
  slotStart: Date,
  now: Date,
  publicHorizonDays: number,
  m: ActiveMembership | null,
): boolean {
  const horizonDays = publicHorizonDays + (m?.priorityBookingDays ?? 0);
  const limit = new Date(now);
  limit.setDate(limit.getDate() + horizonDays);
  return slotStart <= limit;
}
