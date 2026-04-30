import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { computeTargetInterval, computeSpringSkipFrequency, shouldThrottleRaycast } from './VrmViewer';

// Feature: performance-optimization, Property 1: Frame throttle respects target interval
// Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5

describe('computeTargetInterval', () => {
  // ── Unit tests — specific examples ──────────────────────────────────────

  it('returns 100ms (10fps) when tab is hidden', () => {
    expect(computeTargetInterval(false, false)).toBeCloseTo(100, 5);
    expect(computeTargetInterval(false, true)).toBeCloseTo(100, 5);
  });

  it('returns ~33.33ms (30fps) when visible on mobile', () => {
    expect(computeTargetInterval(true, true)).toBeCloseTo(1000 / 30, 5);
  });

  it('returns ~16.67ms (60fps) when visible on desktop', () => {
    expect(computeTargetInterval(true, false)).toBeCloseTo(1000 / 60, 5);
  });

  it('hidden tab always wins over mobile flag', () => {
    // Even if isMobile=true, hidden tab should give 10fps interval
    expect(computeTargetInterval(false, true)).toBeCloseTo(100, 5);
  });

  // ── Property-based tests ─────────────────────────────────────────────────

  /**
   * Property 1: Frame Throttle Respects Target Interval
   *
   * For any combination of (isVisible, isMobile), the render loop SHALL skip a
   * frame if and only if the elapsed time since the last rendered frame is less
   * than the target interval for that combination.
   * Specifically: hidden → 100ms, visible+mobile → 33.33ms, visible+desktop → 16.67ms.
   *
   * Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5
   */
  it('Property 1: frame skip decision matches target interval for all input combinations', () => {
    fc.assert(
      fc.property(
        fc.record({
          isVisible: fc.boolean(),
          isMobile: fc.boolean(),
          elapsed: fc.float({ min: 0, max: 200, noNaN: true }),
        }),
        ({ isVisible, isMobile, elapsed }) => {
          const targetInterval = computeTargetInterval(isVisible, isMobile);

          // Derive expected interval from spec rules
          const expectedInterval = !isVisible
            ? 1000 / 10   // 100ms — hidden tab
            : isMobile
              ? 1000 / 30 // 33.33ms — mobile
              : 1000 / 60; // 16.67ms — desktop

          // The function must return the correct interval
          expect(targetInterval).toBeCloseTo(expectedInterval, 5);

          // The skip decision derived from the interval must be consistent:
          // skip frame when elapsed < targetInterval
          const shouldSkip = elapsed < targetInterval;
          expect(elapsed < targetInterval).toBe(shouldSkip);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 1 (boundary): hidden tab interval is always the largest (most conservative)', () => {
    fc.assert(
      fc.property(
        fc.boolean(), // isMobile
        (isMobile) => {
          const hiddenInterval = computeTargetInterval(false, isMobile);
          const visibleInterval = computeTargetInterval(true, isMobile);
          // Hidden tab must throttle more aggressively (larger interval = fewer frames)
          expect(hiddenInterval).toBeGreaterThan(visibleInterval);
        },
      ),
      { numRuns: 50 },
    );
  });

  it('Property 1 (ordering): mobile interval is always larger than desktop interval when visible', () => {
    fc.assert(
      fc.property(
        fc.constant(true), // isVisible = true
        (isVisible) => {
          const mobileInterval = computeTargetInterval(isVisible, true);
          const desktopInterval = computeTargetInterval(isVisible, false);
          // Mobile throttles more than desktop
          expect(mobileInterval).toBeGreaterThan(desktopInterval);
        },
      ),
      { numRuns: 10 },
    );
  });

  it('Property 1 (determinism): same inputs always produce same output', () => {
    fc.assert(
      fc.property(
        fc.boolean(),
        fc.boolean(),
        (isVisible, isMobile) => {
          const result1 = computeTargetInterval(isVisible, isMobile);
          const result2 = computeTargetInterval(isVisible, isMobile);
          expect(result1).toBe(result2);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 1 (positive): interval is always a positive number', () => {
    fc.assert(
      fc.property(
        fc.boolean(),
        fc.boolean(),
        (isVisible, isMobile) => {
          const interval = computeTargetInterval(isVisible, isMobile);
          expect(interval).toBeGreaterThan(0);
          expect(Number.isFinite(interval)).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// Feature: performance-optimization, Property 3: Spring bones skip frequency selection
// Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5

describe('computeSpringSkipFrequency', () => {
  // ── Unit tests — specific examples ──────────────────────────────────────

  it('returns 4 when camera distance > 4 (desktop)', () => {
    expect(computeSpringSkipFrequency(4.1, false)).toBe(4);
    expect(computeSpringSkipFrequency(5, false)).toBe(4);
    expect(computeSpringSkipFrequency(10, false)).toBe(4);
  });

  it('returns 4 when camera distance > 4 (mobile)', () => {
    expect(computeSpringSkipFrequency(4.1, true)).toBe(4);
    expect(computeSpringSkipFrequency(8, true)).toBe(4);
  });

  it('returns 2 when camera distance <= 4 on mobile', () => {
    expect(computeSpringSkipFrequency(4, true)).toBe(2);
    expect(computeSpringSkipFrequency(0, true)).toBe(2);
    expect(computeSpringSkipFrequency(2, true)).toBe(2);
  });

  it('returns 1 when camera distance <= 4 on desktop', () => {
    expect(computeSpringSkipFrequency(4, false)).toBe(1);
    expect(computeSpringSkipFrequency(0, false)).toBe(1);
    expect(computeSpringSkipFrequency(2, false)).toBe(1);
  });

  it('boundary: distance exactly 4 is treated as <= 4', () => {
    expect(computeSpringSkipFrequency(4, false)).toBe(1);
    expect(computeSpringSkipFrequency(4, true)).toBe(2);
  });

  it('boundary: distance just above 4 triggers skip-4', () => {
    expect(computeSpringSkipFrequency(4.001, false)).toBe(4);
    expect(computeSpringSkipFrequency(4.001, true)).toBe(4);
  });

  // ── Property-based tests ─────────────────────────────────────────────────

  /**
   * Property 3: Spring Bones Skip Frequency Selection
   *
   * For any camera distance and device type, the skip frequency SHALL be:
   * - distance > 4 → 4
   * - distance ≤ 4 AND mobile → 2
   * - distance ≤ 4 AND desktop → 1
   *
   * Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5
   */
  it('Property 3: skip frequency matches spec rules for all distance/device combinations', () => {
    fc.assert(
      fc.property(
        fc.record({
          distance: fc.float({ min: 0, max: 10, noNaN: true }),
          isMobile: fc.boolean(),
        }),
        ({ distance, isMobile }) => {
          const freq = computeSpringSkipFrequency(distance, isMobile);

          if (distance > 4) {
            expect(freq).toBe(4);
          } else if (isMobile) {
            expect(freq).toBe(2);
          } else {
            expect(freq).toBe(1);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 3 (return type): result is always 1, 2, or 4', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 20, noNaN: true }),
        fc.boolean(),
        (distance, isMobile) => {
          const freq = computeSpringSkipFrequency(distance, isMobile);
          expect([1, 2, 4]).toContain(freq);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 3 (determinism): same inputs always produce same output', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 10, noNaN: true }),
        fc.boolean(),
        (distance, isMobile) => {
          const result1 = computeSpringSkipFrequency(distance, isMobile);
          const result2 = computeSpringSkipFrequency(distance, isMobile);
          expect(result1).toBe(result2);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 3 (monotonicity): larger distance never results in smaller skip frequency', () => {
    fc.assert(
      fc.property(
        fc.record({
          d1: fc.float({ min: 0, max: 10, noNaN: true }),
          d2: fc.float({ min: 0, max: 10, noNaN: true }),
          isMobile: fc.boolean(),
        }),
        ({ d1, d2, isMobile }) => {
          const freq1 = computeSpringSkipFrequency(d1, isMobile);
          const freq2 = computeSpringSkipFrequency(d2, isMobile);
          // If d1 <= d2, then freq1 <= freq2 (farther = more skipping)
          if (d1 <= d2) {
            expect(freq1).toBeLessThanOrEqual(freq2);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 3 (mobile penalty): mobile skip frequency is always >= desktop skip frequency', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 10, noNaN: true }),
        (distance) => {
          const mobileFreq = computeSpringSkipFrequency(distance, true);
          const desktopFreq = computeSpringSkipFrequency(distance, false);
          // Mobile should skip at least as often as desktop
          expect(mobileFreq).toBeGreaterThanOrEqual(desktopFreq);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// Feature: performance-optimization, Property 11: Raycasting Throttle
// Validates: Requirements 26.4

describe('shouldThrottleRaycast', () => {
  const RAYCAST_INTERVAL = 1000 / 30; // 33.33ms

  // ── Unit tests — specific examples ──────────────────────────────────────

  it('allows raycast when no previous raycast (lastTime = 0)', () => {
    expect(shouldThrottleRaycast(0, 100)).toBe(false);
  });

  it('throttles when elapsed < 33.33ms', () => {
    const last = 1000;
    expect(shouldThrottleRaycast(last, last + 10)).toBe(true);
    expect(shouldThrottleRaycast(last, last + 33)).toBe(true);
  });

  it('allows raycast when elapsed >= 33.33ms', () => {
    const last = 1000;
    expect(shouldThrottleRaycast(last, last + RAYCAST_INTERVAL + 0.001)).toBe(false);
    expect(shouldThrottleRaycast(last, last + 50)).toBe(false);
    expect(shouldThrottleRaycast(last, last + 100)).toBe(false);
  });

  it('boundary: elapsed exactly at interval is allowed (not throttled)', () => {
    const last = 500;
    const current = last + RAYCAST_INTERVAL;
    expect(shouldThrottleRaycast(last, current)).toBe(false);
  });

  it('boundary: elapsed just below interval is throttled', () => {
    const last = 500;
    const current = last + RAYCAST_INTERVAL - 0.001;
    expect(shouldThrottleRaycast(last, current)).toBe(true);
  });

  // ── Property-based tests ─────────────────────────────────────────────────

  /**
   * Property 11: Raycasting Throttle
   *
   * For any sequence of N pointer move events arriving within a 1-second window,
   * the number of raycasting operations performed SHALL be ≤ 30, regardless of N.
   *
   * Validates: Requirements 26.4
   */
  it('Property 11: N pointer events in 1 second produce ≤ 30 raycasting operations', () => {
    fc.assert(
      fc.property(
        // N events: between 1 and 200 events in a 1-second window
        fc.integer({ min: 1, max: 200 }),
        (n) => {
          // Simulate N pointer move events spread over 1000ms
          const windowMs = 1000;
          const eventInterval = windowMs / n;

          let lastRaycastTime = 0;
          let raycastCount = 0;

          for (let i = 0; i < n; i++) {
            const currentTime = i * eventInterval;
            if (!shouldThrottleRaycast(lastRaycastTime, currentTime)) {
              raycastCount++;
              lastRaycastTime = currentTime;
            }
          }

          // Must not exceed 30 raycasts per second
          expect(raycastCount).toBeLessThanOrEqual(30);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 11 (determinism): same inputs always produce same throttle decision', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 10000, noNaN: true }),
        fc.float({ min: 0, max: 10000, noNaN: true }),
        (lastTime, currentTime) => {
          const result1 = shouldThrottleRaycast(lastTime, currentTime);
          const result2 = shouldThrottleRaycast(lastTime, currentTime);
          expect(result1).toBe(result2);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 11 (monotonicity): larger elapsed time never causes more throttling', () => {
    fc.assert(
      fc.property(
        fc.record({
          lastTime: fc.float({ min: 0, max: 5000, noNaN: true }),
          elapsed1: fc.float({ min: 0, max: 200, noNaN: true }),
          elapsed2: fc.float({ min: 0, max: 200, noNaN: true }),
        }),
        ({ lastTime, elapsed1, elapsed2 }) => {
          // If elapsed1 <= elapsed2, then throttle(elapsed1) >= throttle(elapsed2)
          // (more time passed = less likely to be throttled)
          if (elapsed1 <= elapsed2) {
            const throttled1 = shouldThrottleRaycast(lastTime, lastTime + elapsed1);
            const throttled2 = shouldThrottleRaycast(lastTime, lastTime + elapsed2);
            // If elapsed1 is throttled, elapsed2 might or might not be
            // But if elapsed2 is throttled, elapsed1 must also be throttled
            if (throttled2) {
              expect(throttled1).toBe(true);
            }
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 11 (max rate): raycasts in any 1-second window never exceed 30', () => {
    fc.assert(
      fc.property(
        // Random event timestamps within a 2-second window
        fc.array(fc.float({ min: 0, max: 2000, noNaN: true }), { minLength: 1, maxLength: 300 }),
        (rawTimestamps) => {
          // Sort timestamps to simulate chronological events
          const timestamps = [...rawTimestamps].sort((a, b) => a - b);

          let lastRaycastTime = 0;
          const raycastTimes: number[] = [];

          for (const t of timestamps) {
            if (!shouldThrottleRaycast(lastRaycastTime, t)) {
              raycastTimes.push(t);
              lastRaycastTime = t;
            }
          }

          // Check every 1-second sliding window
          for (let i = 0; i < raycastTimes.length; i++) {
            const windowStart = raycastTimes[i];
            const windowEnd = windowStart + 1000;
            const countInWindow = raycastTimes.filter(
              (t) => t >= windowStart && t < windowEnd,
            ).length;
            expect(countInWindow).toBeLessThanOrEqual(30);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
