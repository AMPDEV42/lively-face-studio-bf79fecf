/**
 * In-memory rate limiter using a Map with TTL.
 *
 * Designed to be used in Edge Functions (Deno) and testable in Node/vitest.
 * Each Edge Function instance maintains its own in-memory store — this is
 * intentional (no external Redis required per the spec).
 */

export interface RateLimitEntry {
  count: number;
  resetAt: number; // Unix timestamp ms
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfter?: number; // seconds until window resets (only when !allowed)
}

export interface RateLimiter {
  check(userId: string): RateLimitResult;
  reset(userId?: string): void;
}

/**
 * Creates a rate limiter backed by an in-memory Map.
 *
 * @param limit     Maximum number of requests allowed per window
 * @param windowMs  Window duration in milliseconds
 * @param store     Optional external Map (useful for testing / sharing state)
 */
export function createRateLimiter(
  limit: number,
  windowMs: number,
  store: Map<string, RateLimitEntry> = new Map(),
): RateLimiter {
  function check(userId: string): RateLimitResult {
    const now = Date.now();
    const entry = store.get(userId);

    if (!entry || now >= entry.resetAt) {
      // First request in this window (or window has expired) — reset counter
      store.set(userId, { count: 1, resetAt: now + windowMs });
      return { allowed: true };
    }

    if (entry.count < limit) {
      entry.count += 1;
      return { allowed: true };
    }

    // Limit exceeded — calculate seconds until window resets
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return { allowed: false, retryAfter };
  }

  function reset(userId?: string): void {
    if (userId !== undefined) {
      store.delete(userId);
    } else {
      store.clear();
    }
  }

  return { check, reset };
}
