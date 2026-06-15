import { resolvePrice, type PricingRuleInput } from "../pricing/engine";
import { applyMembership, type ActiveMembership } from "../memberships/apply";
import {
  sliceWindow,
  dayOfWeekInTz,
  instantToLocalMinutes,
  type SlotWindow,
} from "./slots";

export interface BusyRange {
  startsAt: string;
  endsAt: string;
}

export interface ScheduleInput {
  opens: string;
  closes: string;
  slotMinutes: number;
}

export interface Slot extends SlotWindow {
  available: boolean;
  price: number;
  basePrice: number;
  priceLabel?: string;
  currency: string;
}

export interface AvailabilityInput {
  courtId: string;
  sportId: string;
  dateISO: string;
  timezone: string;
  schedule: ScheduleInput | null;
  busy: BusyRange[];
  blocks: BusyRange[];
  rules: PricingRuleInput[];
  membership: ActiveMembership | null;
  now: Date;
}

function overlaps(a: SlotWindow, b: BusyRange): boolean {
  return a.startsAt < b.endsAt && b.startsAt < a.endsAt;
}

/** Pure availability computation. The route handler fetches inputs and calls this. */
export function computeAvailability(input: AvailabilityInput): Slot[] {
  if (!input.schedule) return [];
  const dow = dayOfWeekInTz(input.dateISO);
  const candidates = sliceWindow(
    input.dateISO,
    input.schedule.opens,
    input.schedule.closes,
    input.schedule.slotMinutes,
    input.timezone,
  );

  return candidates.map((c) => {
    const clash =
      input.busy.some((b) => overlaps(c, b)) || input.blocks.some((b) => overlaps(c, b));
    const inPast = new Date(c.startsAt) <= input.now;
    let price = 0;
    let basePrice = 0;
    let label: string | undefined;
    let currency = "PKR";
    try {
      const resolved = resolvePrice(input.rules, {
        courtId: input.courtId,
        sportId: input.sportId,
        dow,
        startMinutes: instantToLocalMinutes(c.startsAt, input.timezone),
      });
      basePrice = resolved.amount;
      price = applyMembership(resolved.amount, input.membership);
      label = resolved.label;
      currency = resolved.currency;
    } catch {
      // no price configured for this slot — surface as unavailable, price 0
    }
    return {
      ...c,
      available: !clash && !inPast && basePrice > 0,
      price,
      basePrice,
      priceLabel: label,
      currency,
    };
  });
}
