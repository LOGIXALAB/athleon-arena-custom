import { DomainError } from "../errors";

export type BookingStatus =
  | "pending_payment"
  | "pending_verification"
  | "reserved"
  | "confirmed"
  | "checked_in"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "expired"
  | "no_show";

export type PaymentMethod = "online" | "bank_transfer" | "cash_on_arrival";

/** The single source of truth for legal booking status transitions. */
export const ALLOWED: Record<BookingStatus, BookingStatus[]> = {
  pending_payment: ["confirmed", "cancelled", "expired"],
  pending_verification: ["confirmed", "cancelled", "expired"],
  reserved: ["confirmed", "cancelled", "no_show"],
  confirmed: ["checked_in", "cancelled", "no_show"],
  checked_in: ["in_progress", "completed"],
  in_progress: ["completed"],
  completed: [],
  cancelled: [],
  expired: [],
  no_show: [],
};

/** Statuses that occupy a slot (covered by the no-overlap exclusion constraint). */
export const LIVE_STATUSES: BookingStatus[] = [
  "pending_payment",
  "pending_verification",
  "reserved",
  "confirmed",
  "checked_in",
  "in_progress",
];

export function canTransition(from: BookingStatus, to: BookingStatus): boolean {
  return ALLOWED[from]?.includes(to) ?? false;
}

export function assertTransition(from: BookingStatus, to: BookingStatus): void {
  if (!canTransition(from, to)) {
    throw new DomainError("ILLEGAL_TRANSITION", `${from} → ${to}`);
  }
}

/** The status a freshly created booking starts in, by payment method + source. */
export function initialStatus(
  method: PaymentMethod,
  source: "online" | "walk_in" | "ops",
): BookingStatus {
  if (source === "walk_in" || source === "ops") return "confirmed"; // ops books + collects directly
  switch (method) {
    case "online":
      return "pending_payment";
    case "bank_transfer":
      return "pending_verification";
    case "cash_on_arrival":
      return "reserved";
  }
}
