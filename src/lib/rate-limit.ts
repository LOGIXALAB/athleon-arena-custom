/**
 * Minimal in-memory sliding-window rate limiter. Per-process (fine for a single
 * venue's traffic; swap for Redis/Upstash if horizontally scaled). Never throws.
 */
const hits = new Map<string, number[]>();

export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const arr = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (arr.length >= max) {
    hits.set(key, arr);
    return false; // blocked
  }
  arr.push(now);
  hits.set(key, arr);
  return true; // allowed
}

export function clientIp(req: Request): string {
  const h = req.headers;
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "unknown"
  );
}
