import "server-only";
import { DomainError } from "@/lib/core/errors";
import { getBookingByToken, type BookingBundle } from "@/lib/db/queries/booking";

/** Resolves a management capability token to its booking, or throws NOT_FOUND. */
export async function resolveToken(token: string): Promise<BookingBundle> {
  const bundle = await getBookingByToken(token);
  if (!bundle) throw new DomainError("NOT_FOUND", "Booking not found");
  return bundle;
}
