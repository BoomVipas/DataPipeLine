import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// We need a fresh module instance per test so the in-memory store is reset.
// Vitest's module isolation via vi.isolateModules achieves this.

describe('rateLimit', () => {
  let rateLimit: (key: string, limit?: number, windowMs?: number) => boolean;

  beforeEach(async () => {
    // Re-import the module fresh for each test to get a clean in-memory store.
    vi.resetModules();
    const mod = await import('@/lib/rate-limit');
    rateLimit = mod.rateLimit;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('allows the first request', () => {
    expect(rateLimit('user-1', 5)).toBe(true);
  });

  it('allows requests up to the limit', () => {
    for (let i = 0; i < 5; i++) {
      expect(rateLimit('user-1', 5)).toBe(true);
    }
  });

  it('blocks the request that exceeds the limit', () => {
    for (let i = 0; i < 5; i++) rateLimit('user-1', 5);
    expect(rateLimit('user-1', 5)).toBe(false);
  });

  it('tracks different keys independently', () => {
    for (let i = 0; i < 5; i++) rateLimit('user-a', 5);
    // user-a is exhausted, but user-b should still be allowed
    expect(rateLimit('user-b', 5)).toBe(true);
  });

  it('uses a default limit of 10', () => {
    for (let i = 0; i < 10; i++) {
      expect(rateLimit('user-1')).toBe(true);
    }
    expect(rateLimit('user-1')).toBe(false);
  });

  it('allows requests again after the window expires', () => {
    vi.useFakeTimers();

    for (let i = 0; i < 5; i++) rateLimit('user-1', 5, 1_000);
    // Still blocked inside the window
    expect(rateLimit('user-1', 5, 1_000)).toBe(false);

    // Advance time past the 1-second window
    vi.advanceTimersByTime(1_001);

    // Old timestamps are now outside the window; request should be allowed again
    expect(rateLimit('user-1', 5, 1_000)).toBe(true);
  });

  it('uses a rolling window, not a fixed bucket', () => {
    vi.useFakeTimers();

    // Use 3 of the 5 slots at t=0
    rateLimit('user-1', 5, 1_000);
    rateLimit('user-1', 5, 1_000);
    rateLimit('user-1', 5, 1_000);

    // Advance 600ms — first 3 timestamps are still within the 1s window
    vi.advanceTimersByTime(600);

    // Use 2 more (now at 5 total in-window requests)
    rateLimit('user-1', 5, 1_000);
    rateLimit('user-1', 5, 1_000);

    // Blocked — window is full
    expect(rateLimit('user-1', 5, 1_000)).toBe(false);

    // Advance 401ms more (total 1001ms from t=0) — first 3 timestamps fall out of the window
    vi.advanceTimersByTime(401);

    // Now only 2 timestamps remain in the window → should be allowed
    expect(rateLimit('user-1', 5, 1_000)).toBe(true);
  });
});
