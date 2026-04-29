/**
 * Property-based tests for LightingManager.
 *
 * Feature: performance-optimization
 * Property 2: Lighting Cache Threshold
 * Validates: Requirements 3.2, 3.3
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { LightingManager, type LightingConfig } from './vrm-lighting';

// ---------------------------------------------------------------------------
// THREE.Scene mock — LightingManager only calls add(), remove(), getObjectByName()
// ---------------------------------------------------------------------------

function createMockScene() {
  const objects: Map<string, object> = new Map();

  return {
    add: vi.fn((obj: { name?: string }) => {
      if (obj.name) objects.set(obj.name, obj);
    }),
    remove: vi.fn((obj: { name?: string }) => {
      if (obj.name) objects.delete(obj.name);
    }),
    getObjectByName: vi.fn((name: string) => objects.get(name) ?? null),
  };
}

// ---------------------------------------------------------------------------
// Minimal THREE light mock — LightingManager sets .intensity and .color on lights
// ---------------------------------------------------------------------------

vi.mock('three', () => {
  class MockColor {
    r = 1; g = 1; b = 1;
    setHex(_hex: number) { return this; }
    getHexString() { return 'ffffff'; }
  }

  class MockLight {
    name = '';
    intensity: number;
    color: MockColor;
    position = { set: vi.fn() };
    constructor(_color?: number, intensity = 1) {
      this.intensity = intensity;
      this.color = new MockColor();
    }
    dispose() {}
  }

  return {
    AmbientLight: MockLight,
    DirectionalLight: MockLight,
    Light: MockLight,
  };
});

// ---------------------------------------------------------------------------
// Base config used across tests
// ---------------------------------------------------------------------------

const BASE_CONFIG: LightingConfig = {
  preset: 'test',
  ambientIntensity: 0.8,
  keyLightIntensity: 1.2,
  fillLightIntensity: 0.4,
  rimLightIntensity: 0.3,
  ambientColor: '#ffffff',
  keyLightColor: '#ffffff',
};

// ---------------------------------------------------------------------------
// Helper: count how many times the lights are actually updated
// We track this by observing changes to the light intensity values via
// getCurrentConfig() before and after the call.
// ---------------------------------------------------------------------------

function countActualUpdates(
  manager: LightingManager,
  configs: LightingConfig[],
): number {
  let updateCount = 0;
  let prevConfig = manager.getCurrentConfig();

  for (const config of configs) {
    manager.updateLighting(config);
    const nextConfig = manager.getCurrentConfig();

    // If any intensity changed, an update was applied
    const changed =
      nextConfig.ambientIntensity !== prevConfig.ambientIntensity ||
      nextConfig.keyLightIntensity !== prevConfig.keyLightIntensity ||
      nextConfig.fillLightIntensity !== prevConfig.fillLightIntensity ||
      nextConfig.rimLightIntensity !== prevConfig.rimLightIntensity;

    if (changed) {
      updateCount++;
      prevConfig = nextConfig;
    }
  }

  return updateCount;
}

// ---------------------------------------------------------------------------
// Property 2: Lighting Cache Threshold
//
// For any pair of lighting configurations (old, new):
//   - If max absolute delta across all intensities < 0.01 → skip update
//   - If max absolute delta >= 0.01 → apply update and update cache
//
// Validates: Requirements 3.2, 3.3
// ---------------------------------------------------------------------------

describe('LightingManager — Property 2: Lighting Cache Threshold', () => {
  let scene: ReturnType<typeof createMockScene>;
  let manager: LightingManager;

  beforeEach(() => {
    scene = createMockScene();
    // Cast to unknown first to satisfy TypeScript — the mock satisfies the interface
    manager = new LightingManager(scene as unknown as import('three').Scene, false);
  });

  it('skips update when all intensity deltas are below threshold (< 0.01)', () => {
    // Feature: performance-optimization, Property 2: Lighting cache threshold
    fc.assert(
      fc.property(
        // Generate a base intensity and a delta strictly below threshold
        fc.record({
          base: fc.float({ min: Math.fround(0.1), max: Math.fround(1.9), noNaN: true }),
          delta: fc.float({ min: 0, max: Math.fround(0.009), noNaN: true }),
        }),
        ({ base, delta }) => {
          const freshScene = createMockScene();
          const mgr = new LightingManager(
            freshScene as unknown as import('three').Scene,
            false,
          );

          // First update — primes the cache
          const firstConfig: LightingConfig = {
            ...BASE_CONFIG,
            ambientIntensity: base,
            keyLightIntensity: base,
            fillLightIntensity: base,
            rimLightIntensity: base,
          };
          mgr.updateLighting(firstConfig);

          // Second update — all deltas are below threshold
          const secondConfig: LightingConfig = {
            ...firstConfig,
            ambientIntensity: base + delta,
            keyLightIntensity: base + delta,
            fillLightIntensity: base + delta,
            rimLightIntensity: base + delta,
          };
          mgr.updateLighting(secondConfig);

          // The config should still reflect the first update (cache hit → skip)
          const current = mgr.getCurrentConfig();
          expect(current.ambientIntensity).toBe(base);
          expect(current.keyLightIntensity).toBe(base);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('applies update when at least one intensity delta is >= 0.01', () => {
    // Feature: performance-optimization, Property 2: Lighting cache threshold
    fc.assert(
      fc.property(
        // Generate a base intensity and a delta >= threshold
        // Note: Math.fround(0.01) = 0.009999999776482582 which is < 0.01 (the threshold),
        // so we use 0.011 as the minimum to ensure delta is strictly above the threshold.
        fc.record({
          base: fc.float({ min: Math.fround(0.1), max: Math.fround(1.5), noNaN: true }),
          delta: fc.float({ min: Math.fround(0.011), max: Math.fround(0.5), noNaN: true }),
        }),
        ({ base, delta }) => {
          const freshScene = createMockScene();
          const mgr = new LightingManager(
            freshScene as unknown as import('three').Scene,
            false,
          );

          // First update — primes the cache
          const firstConfig: LightingConfig = {
            ...BASE_CONFIG,
            ambientIntensity: base,
            keyLightIntensity: base,
            fillLightIntensity: base,
            rimLightIntensity: base,
          };
          mgr.updateLighting(firstConfig);

          // Second update — rimLightIntensity delta >= threshold
          const newRim = base + delta;
          const secondConfig: LightingConfig = {
            ...firstConfig,
            rimLightIntensity: newRim,
          };
          mgr.updateLighting(secondConfig);

          // The config should reflect the second update (cache miss → apply)
          const current = mgr.getCurrentConfig();
          expect(current.rimLightIntensity).toBe(newRim);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('first call always applies update (no cache yet)', () => {
    // Feature: performance-optimization, Property 2: Lighting cache threshold
    fc.assert(
      fc.property(
        fc.record({
          ambientIntensity: fc.float({ min: 0, max: Math.fround(2), noNaN: true }),
          keyLightIntensity: fc.float({ min: 0, max: Math.fround(2), noNaN: true }),
          fillLightIntensity: fc.float({ min: 0, max: Math.fround(2), noNaN: true }),
          rimLightIntensity: fc.float({ min: 0, max: Math.fround(2), noNaN: true }),
        }),
        ({ ambientIntensity, keyLightIntensity, fillLightIntensity, rimLightIntensity }) => {
          const freshScene = createMockScene();
          const mgr = new LightingManager(
            freshScene as unknown as import('three').Scene,
            false,
          );

          const config: LightingConfig = {
            ...BASE_CONFIG,
            ambientIntensity,
            keyLightIntensity,
            fillLightIntensity,
            rimLightIntensity,
          };
          mgr.updateLighting(config);

          const current = mgr.getCurrentConfig();
          expect(current.ambientIntensity).toBe(ambientIntensity);
          expect(current.keyLightIntensity).toBe(keyLightIntensity);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('cache is updated after a successful update (subsequent small delta is skipped)', () => {
    // After applying an update, the cache should reflect the new values.
    // A subsequent call with a small delta from the NEW values should be skipped.
    const base = 1.0;
    const bigDelta = 0.5; // >= threshold → applied
    const smallDelta = 0.005; // < threshold → skipped

    const firstConfig: LightingConfig = {
      ...BASE_CONFIG,
      rimLightIntensity: base,
    };
    manager.updateLighting(firstConfig);

    // Apply a big change — cache updates to base + bigDelta
    const secondConfig: LightingConfig = {
      ...firstConfig,
      rimLightIntensity: base + bigDelta,
    };
    manager.updateLighting(secondConfig);
    expect(manager.getCurrentConfig().rimLightIntensity).toBe(base + bigDelta);

    // Now apply a tiny change from the NEW cached value — should be skipped
    const thirdConfig: LightingConfig = {
      ...secondConfig,
      rimLightIntensity: base + bigDelta + smallDelta,
    };
    manager.updateLighting(thirdConfig);
    // Still at base + bigDelta (third update was skipped)
    expect(manager.getCurrentConfig().rimLightIntensity).toBe(base + bigDelta);
  });

  it('exact threshold boundary: delta === 0.01 applies update, delta < 0.01 skips', () => {
    const base = 1.0;

    // delta exactly at threshold (>= 0.01) → should apply
    const freshScene1 = createMockScene();
    const mgr1 = new LightingManager(
      freshScene1 as unknown as import('three').Scene,
      false,
    );
    mgr1.updateLighting({ ...BASE_CONFIG, rimLightIntensity: base });
    mgr1.updateLighting({ ...BASE_CONFIG, rimLightIntensity: base + 0.01 });
    expect(mgr1.getCurrentConfig().rimLightIntensity).toBe(base + 0.01);

    // delta just below threshold (< 0.01) → should skip
    const freshScene2 = createMockScene();
    const mgr2 = new LightingManager(
      freshScene2 as unknown as import('three').Scene,
      false,
    );
    mgr2.updateLighting({ ...BASE_CONFIG, rimLightIntensity: base });
    mgr2.updateLighting({ ...BASE_CONFIG, rimLightIntensity: base + 0.009 });
    expect(mgr2.getCurrentConfig().rimLightIntensity).toBe(base);
  });
});
