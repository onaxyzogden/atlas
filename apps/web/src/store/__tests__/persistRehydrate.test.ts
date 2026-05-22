/**
 * @vitest-environment happy-dom
 *
 * Proves the corrected rehydrate-failure instrumentation actually fires.
 *
 * Regression context: the original design caught a *rejected* rehydrate()
 * promise, but zustand 5's persist middleware HANDLES deserialization errors
 * internally (middleware.mjs:431-436) — the promise resolves and the error is
 * delivered only to the onRehydrateStorage callback. These tests assert that
 * rehydrateWithLogging surfaces a malformed-storage failure (the exact silent
 * mode that wiped project mtc on 2026-05-21) via console.error.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { rehydrateWithLogging } from '../persistRehydrate.js';

interface Probe {
  value: number;
}

/** Build a persist store backed by an in-memory map seeded with `raw`. */
function makeStore(name: string, raw: string | null) {
  const backing = new Map<string, string>();
  if (raw !== null) backing.set(name, raw);
  const storage = {
    getItem: (k: string) => backing.get(k) ?? null,
    setItem: (k: string, v: string) => {
      backing.set(k, v);
    },
    removeItem: (k: string) => {
      backing.delete(k);
    },
  };
  return create<Probe>()(
    persist(() => ({ value: 0 }), {
      name,
      storage: createJSONStorage(() => storage),
      // Isolate the explicit-rehydrate path; we drive hydration ourselves.
      skipHydration: true,
    }),
  );
}

/** Flush microtasks + one macrotask so the hydrate() promise chain settles. */
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('rehydrateWithLogging', () => {
  let errSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    errSpy.mockRestore();
  });

  it('logs "[persist:<name>] rehydrate failed" when stored JSON is malformed', async () => {
    const store = makeStore('probe-bad', '{ not valid json');
    rehydrateWithLogging(store);
    await flush();
    expect(errSpy).toHaveBeenCalledWith(
      expect.stringContaining('[persist:probe-bad] rehydrate failed'),
      expect.anything(),
    );
  });

  it('does not log and applies stored state on a clean rehydrate', async () => {
    const store = makeStore('probe-ok', JSON.stringify({ state: { value: 7 }, version: 0 }));
    rehydrateWithLogging(store);
    await flush();
    expect(errSpy).not.toHaveBeenCalled();
    expect(store.getState().value).toBe(7);
  });

  it('auto-derives the persist name from getOptions when no override is passed', async () => {
    const store = makeStore('probe-derive', 'still bad{');
    rehydrateWithLogging(store);
    await flush();
    expect(errSpy).toHaveBeenCalledWith(
      expect.stringContaining('probe-derive'),
      expect.anything(),
    );
  });

  it('honours an explicit name override in the log label', async () => {
    const store = makeStore('probe-raw-name', 'bad{');
    rehydrateWithLogging(store, 'custom-label');
    await flush();
    expect(errSpy).toHaveBeenCalledWith(
      expect.stringContaining('[persist:custom-label] rehydrate failed'),
      expect.anything(),
    );
  });
});
