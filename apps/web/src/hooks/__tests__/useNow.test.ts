/**
 * @vitest-environment happy-dom
 *
 * useNow — interval-driven ISO-timestamp tick. Pins the cadence,
 * unmount cleanup, and intervalMs re-arm against regression of the
 * rotation-adherence "now" staleness fix.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useNow } from '../useNow.js';

const T0 = new Date('2026-05-20T00:00:00.000Z').getTime();

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(T0));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useNow', () => {
  it('seeds with the current ISO timestamp', () => {
    const { result } = renderHook(() => useNow(60_000));
    expect(result.current).toBe(new Date(T0).toISOString());
  });

  it('refreshes after the interval elapses', () => {
    const { result } = renderHook(() => useNow(60_000));
    expect(result.current).toBe(new Date(T0).toISOString());

    act(() => {
      vi.advanceTimersByTime(60_000);
    });

    expect(result.current).toBe(new Date(T0 + 60_000).toISOString());
  });

  it('clears the interval on unmount (no orphan timers)', () => {
    const { unmount } = renderHook(() => useNow(60_000));
    expect(vi.getTimerCount()).toBeGreaterThan(0);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('honours a custom cadence and re-arms when intervalMs changes', () => {
    const { result, rerender } = renderHook(
      ({ ms }: { ms: number }) => useNow(ms),
      { initialProps: { ms: 5_000 } },
    );
    expect(result.current).toBe(new Date(T0).toISOString());

    act(() => {
      vi.advanceTimersByTime(5_000);
    });
    expect(result.current).toBe(new Date(T0 + 5_000).toISOString());

    rerender({ ms: 1_000 });
    act(() => {
      vi.advanceTimersByTime(1_000);
    });
    expect(result.current).toBe(new Date(T0 + 6_000).toISOString());
  });
});
