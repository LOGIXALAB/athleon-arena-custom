import type { PaymentMethod } from "./transitions";

const MINUTE = 60_000;

/**
 * Computes the hold expiry for a new booking.
 * - online: 15-minute checkout hold
 * - bank_transfer: min(starts_at, created + 4h) — until ops can verify a proof
 * - cash_on_arrival: no expiry (holds until the slot; no-show worker handles it)
 */
export function computeHoldExpiry(
  method: PaymentMethod,
  createdAt: Date,
  startsAt: Date,
): Date | null {
  switch (method) {
    case "online":
      return new Date(createdAt.getTime() + 15 * MINUTE);
    case "bank_transfer": {
      const fourHours = new Date(createdAt.getTime() + 4 * 60 * MINUTE);
      return fourHours < startsAt ? fourHours : startsAt;
    }
    case "cash_on_arrival":
      return null;
  }
}

/** When a bank-transfer proof is uploaded, extend the hold to the slot start. */
export function holdAfterProof(startsAt: Date): Date {
  return startsAt;
}
