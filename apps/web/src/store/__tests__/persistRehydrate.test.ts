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

// Mock the durable telemetry sink so we can assert rehydrate failures are
// forwarded to it without exercising the real buffer/network path.
const { recordClientError } = vi.hoisted(() => ({ recordClientError: vi.fn() }));
vi.mock('../../lib/clientErrorLog', () => ({ recordClientError }));

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
    recordClientError.mockClear();
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

  it('forwards a rehydrate failure to the durable client-error sink', async () => {
    const store = makeStore('ogden-conventional-crops', '{ not valid json');
    rehydrateWithLogging(store);
    await flush();
    expect(recordClientError).toHaveBeenCalledTimes(1);
    expect(recordClientError).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'persist_rehydrate',
        projectId: null,
        context: { persistKey: 'ogden-conventional-crops' },
      }),
    );
  });

  it('does NOT call the sink on a clean rehydrate', async () => {
    const store = makeStore('probe-clean', JSON.stringify({ state: { value: 1 }, version: 0 }));
    rehydrateWithLogging(store);
    await flush();
    expect(recordClientError).not.toHaveBeenCalled();
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

  it('runs onHydrated AFTER hydration settles, with fully-hydrated state', async () => {
    const store = makeStore('probe-hook', JSON.stringify({ state: { value: 5 }, version: 0 }));
    let seen: number | undefined;
    rehydrateWithLogging(store, {
      onHydrated: () => {
        // Proves the hook fires post-hydration: a synchronous getState() after
        // rehydrateWithLogging would read 0 under async storage; here it is 5.
        seen = store.getState().value;
      },
    });
    await flush();
    expect(seen).toBe(5);
  });

  it('passes the hydration error to onHydrated and still runs it', async () => {
    const store = makeStore('probe-hook-err', '{ not valid json');
    const hook = vi.fn();
    rehydrateWithLogging(store, { onHydrated: hook });
    await flush();
    expect(hook).toHaveBeenCalledTimes(1);
    expect(hook).toHaveBeenCalledWith(expect.anything()); // error arg present
  });

  it('still honours nameOverride when passed via the options object', async () => {
    const store = makeStore('probe-opts-name', 'bad{');
    rehydrateWithLogging(store, { nameOverride: 'opts-label' });
    await flush();
    expect(errSpy).toHaveBeenCalledWith(
      expect.stringContaining('[persist:opts-label] rehydrate failed'),
      expect.anything(),
    );
  });

  it('an onHydrated throw does not break the rehydrate chain', async () => {
    const store = makeStore('probe-hook-throw', JSON.stringify({ state: { value: 3 }, version: 0 }));
    rehydrateWithLogging(store, {
      onHydrated: () => {
        throw new Error('boom');
      },
    });
    await flush();
    // The thrown hook is caught and logged; hydrated state is intact.
    expect(store.getState().value).toBe(3);
    expect(errSpy).toHaveBeenCalledWith(
      expect.stringContaining('[persist:probe-hook-throw] onHydrated hook threw'),
      expect.anything(),
    );
  });
});
