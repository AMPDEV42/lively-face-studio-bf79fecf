/**
 * Property-based tests for useAudioAnalyser hook.
 *
 * Feature: performance-optimization
 * Property 4: Audio Analyser Connection Deduplication
 * Validates: Requirements 9.2, 9.5
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { renderHook, act } from '@testing-library/react';
import { useAudioAnalyser } from './useAudioAnalyser';

// ---------------------------------------------------------------------------
// Web Audio API mocks (jsdom does not provide these)
// ---------------------------------------------------------------------------

/** Tracks how many times createMediaElementSource has been called */
let createMediaElementSourceCallCount = 0;

function createMockAudioContext() {
  const analyserNode = {
    fftSize: 128,
    smoothingTimeConstant: 0.5,
    frequencyBinCount: 64,
    connect: vi.fn(),
    disconnect: vi.fn(),
    getByteFrequencyData: vi.fn(),
  };

  const mediaElementSource = {
    connect: vi.fn(),
    disconnect: vi.fn(),
  };

  const ctx = {
    state: 'running' as AudioContextState,
    createAnalyser: vi.fn(() => analyserNode),
    createMediaElementSource: vi.fn(() => {
      createMediaElementSourceCallCount++;
      return mediaElementSource;
    }),
    createMediaStreamSource: vi.fn(() => mediaElementSource),
    resume: vi.fn(() => Promise.resolve()),
    destination: {},
  };

  return ctx;
}

let mockCtx: ReturnType<typeof createMockAudioContext>;

beforeEach(() => {
  createMediaElementSourceCallCount = 0;
  mockCtx = createMockAudioContext();

  // Mock AudioContext globally
  vi.stubGlobal('AudioContext', vi.fn(() => mockCtx));

  // Mock sonner toast to avoid errors in test environment
  vi.mock('sonner', () => ({
    toast: {
      error: vi.fn(),
    },
  }));
});

// ---------------------------------------------------------------------------
// Helper: create a minimal HTMLAudioElement-like object
// ---------------------------------------------------------------------------
function createMockAudioElement(): HTMLAudioElement {
  return {} as HTMLAudioElement;
}

// ---------------------------------------------------------------------------
// Property 4: Audio Analyser Connection Deduplication
// For any N calls to connectAudioElement with the same HTMLAudioElement,
// createMediaElementSource SHALL be called exactly 1 time.
// Validates: Requirements 9.2, 9.5
// ---------------------------------------------------------------------------
describe('useAudioAnalyser — Property 4: Audio Analyser Connection Deduplication', () => {
  it('createMediaElementSource is called exactly once for N calls with the same element', () => {
    // Feature: performance-optimization, Property 4: Audio analyser connection deduplication
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 20 }),
        (n) => {
          // Reset call count and mock for each property run
          createMediaElementSourceCallCount = 0;
          mockCtx = createMockAudioContext();
          vi.stubGlobal('AudioContext', vi.fn(() => mockCtx));

          const { result } = renderHook(() => useAudioAnalyser());
          const audio = createMockAudioElement();

          act(() => {
            for (let i = 0; i < n; i++) {
              result.current.connectAudioElement(audio);
            }
          });

          expect(createMediaElementSourceCallCount).toBe(1);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('createMediaElementSource is called again when a different element is passed', () => {
    const { result } = renderHook(() => useAudioAnalyser());
    const audio1 = createMockAudioElement();
    const audio2 = createMockAudioElement();

    act(() => {
      result.current.connectAudioElement(audio1);
      result.current.connectAudioElement(audio2);
    });

    // Two different elements → two createMediaElementSource calls
    expect(createMediaElementSourceCallCount).toBe(2);
  });

  it('AudioContext.resume is called when context is suspended on re-connection', () => {
    const { result } = renderHook(() => useAudioAnalyser());
    const audio = createMockAudioElement();

    // First connection
    act(() => {
      result.current.connectAudioElement(audio);
    });

    // Simulate suspended state
    mockCtx.state = 'suspended';

    // Second call with same element — should resume, not create new source
    act(() => {
      result.current.connectAudioElement(audio);
    });

    expect(createMediaElementSourceCallCount).toBe(1);
    expect(mockCtx.resume).toHaveBeenCalled();
  });
});
