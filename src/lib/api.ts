import { NextResponse } from "next/server";
import { DomainError, statusForCode } from "@/lib/core/errors";

export function ok<T>(data: T, init?: number) {
  return NextResponse.json(data, { status: init ?? 200 });
}

export function fail(code: string, message: string, status?: number) {
  return NextResponse.json(
    { error: { code, message } },
    { status: status ?? statusForCode(code) },
  );
}

/** Wraps a handler, turning DomainError into a proper { error } response. */
export async function handle(fn: () => Promise<NextResponse>): Promise<NextResponse> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof DomainError) return fail(e.code, e.message, statusForCode(e.code));
    console.error("[api] unhandled error:", e);
    return fail("INTERNAL", e instanceof Error ? e.message : "Unexpected error", 500);
  }
}

/** Postgres exclusion-constraint violation (no-overlap) surfaces as 23P01. */
export function isExclusionViolation(e: unknown): boolean {
  return (
    typeof e === "object" &&
    e !== null &&
    "code" in e &&
    (e as { code?: string }).code === "23P01"
  );
}
