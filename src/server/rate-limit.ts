import "server-only";

/**
 * Minimal fixed-window rate limiter for write actions (comments, uploads…).
 * In-memory, so limits are per server process — good enough for a single
 * instance. Swap for a shared store when running several replicas.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

export class RateLimitError extends Error {
  constructor() {
    super("You're doing that too often. Please wait a moment and try again.");
    this.name = "RateLimitError";
  }
}

export function assertRateLimit(key: string, max: number, windowMs: number): void {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    if (buckets.size > 10_000) {
      for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
    }
    return;
  }
  if (bucket.count >= max) throw new RateLimitError();
  bucket.count++;
}
