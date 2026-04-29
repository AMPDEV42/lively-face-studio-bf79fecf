/**
 * Property-based tests for idle expression fade optimization.
 *
 * Feature: performance-optimization
 * Property 10: Expression Lerp Bounds
 * Validates: Requirements 19.4
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { lerp } from './idle-expression-advanced';

// ---------------------------------------------------------------------------
// Unit tests — specific examples
// ---------------------------------------------------------------------------

describe('lerp', () => {
  it('returns start when t=0', () => {
    expect(lerp(0.2, 0.8, 0)).toBeCloseTo(0.2);
    expect(lerp(0, 1, 0)).toBeCloseTo(0);
  });

  it('returns end when t=1', () => {
    expect(lerp(0.2, 0.8, 1)).toBeCloseTo(0.8);
    expect(lerp(0, 1, 1)).toBeCloseTo(1);
  });

  it('returns midpoint when t=0.5', () => {
    expect(lerp(0, 1, 0.5)).toBeCloseTo(0.5);
    expect(lerp(0.2, 0.8, 0.5)).toBeCloseTo(0.5);
  });

  it('works when start > end (fade out direction)', () => {
    expect(lerp(0.8, 0, 0.5)).toBeCloseTo(0.4);
    expect(lerp(1, 0, 0.25)).toBeCloseTo(0.75);
  });

  it('returns start when start === end', () => {
    expect(lerp(0.5, 0.5, 0.3)).toBeCloseTo(0.5);
  });

  // ── Property-based tests ─────────────────────────────────────────────────

  /**
   * Property 10: Expression Lerp Bounds
   *
   * For any start weight s ∈ [0, 1], end weight e ∈ [0, 1], and interpolation
   * factor t ∈ [0, 1], the lerp result lerp(s, e, t) SHALL satisfy
   * min(s, e) ≤ result ≤ max(s, e).
   *
   * Validates: Requirements 19.4
   */
  it('Property 10: lerp result is always within [min(start, end), max(start, end)]', () => {
    // Feature: performance-optimization, Property 10: Expression lerp bounds
    fc.assert(
      fc.property(
        fc.record({
          start: fc.float({ min: 0, max: 1, noNaN: true }),
          end: fc.float({ min: 0, max: 1, noNaN: true }),
          t: fc.float({ min: 0, max: 1, noNaN: true }),
        }),
        ({ start, end, t }) => {
          const result = lerp(start, end, t);
          const lo = Math.min(start, end);
          const hi = Math.max(start, end);
          // Allow tiny floating-point tolerance
          expect(result).toBeGreaterThanOrEqual(lo - 1e-6);
          expect(result).toBeLessThanOrEqual(hi + 1e-6);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 10 (linearity): lerp(s, e, t) = s + (e - s) * t for all inputs', () => {
    fc.assert(
      fc.property(
        fc.record({
          start: fc.float({ min: 0, max: 1, noNaN: true }),
          end: fc.float({ min: 0, max: 1, noNaN: true }),
          t: fc.float({ min: 0, max: 1, noNaN: true }),
        }),
        ({ start, end, t }) => {
          const result = lerp(start, end, t);
          const expected = start + (end - start) * t;
          expect(result).toBeCloseTo(expected, 10);
        },
      ),
      { numRuns: 100 },
    );
  });
});
