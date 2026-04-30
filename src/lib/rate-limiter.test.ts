/**
 * Property-based tests for the in-memory rate limiter.
 *
 * Feature: performance-optimization
 * Property 7: Rate Limit Enforcement
 * Validates: Requirements 14.1, 14.2, 14.3
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { createRateLimiter } from './rate-limiter';

// ---------------------------------------------------------------------------
// Property 7: Rate Limit Enforcement
//
// For any user making requests to an Edge Function, once the request count
// within the current 60-second window exceeds the configured limit (20 for
// chat, 30 for TTS), all subsequent requests in that window SHALL receive
// HTTP 429 with a Retry-After header.
//
// Validates: Requirements 14.1, 14.2, 14.3
// ---------------------------------------------------------------------------

describe('Rate Limiter — Property 7: Rate Limit Enforcement', () => {
  it('allows exactly `limit` requests, then rejects all subsequent ones', () => {
    // Feature: performance-optimization, Property 7: Rate limit enforcement
    fc.assert(
      fc.property(
        fc.record({
          limit: fc.integer({ min: 1, max: 50 }),
          extraRequests: fc.integer({ min: 1, max: 20 }),
        }),
        ({ limit, extraRequests }) => {
          const limiter = createRateLimiter(limit, 60_000);
          const userId = 'test-user';

          // First `limit` requests — all must be allowed
          for (let i = 0; i < limit; i++) {
            const result = limiter.check(userId);
            expect(result.allowed).toBe(true);
          }

          // Extra requests beyond the limit — all must be rejected with retryAfter
          for (let i = 0; i < extraRequests; i++) {
            const result = limiter.check(userId);
            expect(result.allowed).toBe(false);
            expect(result.retryAfter).toBeGreaterThan(0);
            expect(result.retryAfter).toBeLessThanOrEqual(60);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('different users have independent rate limit counters', () => {
    // Feature: performance-optimization, Property 7: Rate limit enforcement
    fc.assert(
      fc.property(
        fc.record({
          limit: fc.integer({ min: 1, max: 20 }),
          userCount: fc.integer({ min: 2, max: 10 }),
        }),
        ({ limit, userCount }) => {
          const limiter = createRateLimiter(limit, 60_000);

          // Each user exhausts their own limit independently
          for (let u = 0; u < userCount; u++) {
            const userId = `user-${u}`;
            for (let i = 0; i < limit; i++) {
              const result = limiter.check(userId);
              expect(result.allowed).toBe(true);
            }
            // One more request for this user should be rejected
            const overflow = limiter.check(userId);
            expect(overflow.allowed).toBe(false);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('retryAfter is always a positive integer (seconds) when limit is exceeded', () => {
    // Feature: performance-optimization, Property 7: Rate limit enforcement
    fc.assert(
      fc.property(
        fc.record({
          limit: fc.integer({ min: 1, max: 30 }),
          windowMs: fc.integer({ min: 1_000, max: 120_000 }),
        }),
        ({ limit, windowMs }) => {
          const limiter = createRateLimiter(limit, windowMs);
          const userId = 'retry-after-user';

          // Exhaust the limit
          for (let i = 0; i < limit; i++) {
            limiter.check(userId);
          }

          // The next request must have a valid retryAfter
          const result = limiter.check(userId);
          expect(result.allowed).toBe(false);
          expect(result.retryAfter).toBeDefined();
          expect(Number.isInteger(result.retryAfter)).toBe(true);
          expect(result.retryAfter!).toBeGreaterThan(0);
          expect(result.retryAfter!).toBeLessThanOrEqual(Math.ceil(windowMs / 1000));
        },
      ),
      { numRuns: 100 },
    );
  });

  it('chat rate limit: 20 requests per minute (Requirement 14.1)', () => {
    const CHAT_LIMIT = 20;
    const WINDOW_MS = 60_000;
    const limiter = createRateLimiter(CHAT_LIMIT, WINDOW_MS);
    const userId = 'chat-user';

    // Exactly 20 requests should be allowed
    for (let i = 0; i < CHAT_LIMIT; i++) {
      expect(limiter.check(userId).allowed).toBe(true);
    }

    // 21st request must be rejected with Retry-After: 60
    const result = limiter.check(userId);
    expect(result.allowed).toBe(false);
    expect(result.retryAfter).toBeGreaterThan(0);
    expect(result.retryAfter).toBeLessThanOrEqual(60);
  });

  it('window reset: allows requests again after window expires', () => {
    // Use a very short window to simulate expiry via store manipulation
    const limit = 3;
    const windowMs = 60_000;
    const store = new Map();
    const limiter = createRateLimiter(limit, windowMs, store);
    const userId = 'reset-user';

    // Exhaust the limit
    for (let i = 0; i < limit; i++) {
      limiter.check(userId);
    }
    expect(limiter.check(userId).allowed).toBe(false);

    // Simulate window expiry by backdating the resetAt timestamp
    const entry = store.get(userId)!;
    entry.resetAt = Date.now() - 1; // already expired

    // Now the next request should be allowed (new window)
    const result = limiter.check(userId);
    expect(result.allowed).toBe(true);
  });
});
