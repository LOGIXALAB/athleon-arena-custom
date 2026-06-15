/** Domain-level error with a stable machine code (mapped to HTTP status at the edge). */
export class DomainError extends Error {
  code: string;
  constructor(code: string, message?: string) {
    super(message ?? code);
    this.name = "DomainError";
    this.code = code;
  }
}

/** Maps domain error codes to HTTP statuses for API responses. */
export function statusForCode(code: string): number {
  switch (code) {
    case "SLOT_TAKEN":
      return 409;
    case "INVALID_EVENT":
      return 422;
    case "SCORING_LOCKED":
    case "OUTSIDE_WINDOW":
    case "FORBIDDEN":
      return 403;
    case "NOT_FOUND":
      return 404;
    case "ILLEGAL_TRANSITION":
    case "NO_PRICE_CONFIGURED":
    case "VALIDATION":
      return 400;
    default:
      return 400;
  }
}
