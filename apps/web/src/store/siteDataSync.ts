/**
 * siteDataSync — UI-independent bridge between `useProjectStore` and
 * `useSiteDataStore`.
 *
 * The invariant we enforce here:
 *
 *   For every project with a non-null `parcelBoundaryGeojson`,
 *   `useSiteDataStore.dataByProject[id]` should reach `status: 'complete'`.
 *
 * That is a data-layer invariant, not a UI concern. Historically the trigger
 * lived as a `useEffect` inside `ProjectPage.tsx` and `LifecycleProjectPage.tsx`
 * — every new entry surface (v3 OBSERVE / PLAN / ACT, mobile, anything future)
 * had to remember to re-mount the same effect or the fetch silently never
 * ran. v3 forgot, which is the bug this module fixes for good.
 *
 * Mechanism: subscribe once at module-load to `useProjectStore` and watch each
 * project's `parcelBoundaryGeojson` reference. When a boundary appears or
 * changes (creation, edit, IndexedDB-restore on cold start, builtin sample
 * hydration, duplication), schedule a debounced `fetchForProject`. When a
 * project is removed, cancel its debouncer and abort any in-flight fetch.
 *
 * UI surfaces only *read* `useSiteDataStore.dataByProject[id]`. They never
 * trigger fetches. New surfaces get the data for free; removing the legacy
 * pages does not regress the trigger.
 *
 * Bootstrap: imported once from `main.tsx` immediately after `projectStore`,
 * so by the time this module's top-level subscribe call runs the project
 * store is fully created. Async rehydration that follows fires our subscriber
 * naturally as boundaries land via setState.
 *
 * HMR safety: the previous unsubscriber is cached on `globalThis` and called
 * on re-evaluation so Vite hot-reloads don't stack subscriptions.
 */

import { debounce, type DebouncedFn } from '../lib/debounce.js';
import { useProjectStore, type LocalProject } from './projectStore.js';
import { useSiteDataStore, abortFetchForProject } from './siteDataStore.js';
import { deriveSiteFetchArgs } from './siteFetchArgs.js';

// ── Per-project debouncers ────────────────────────────────────────────────
// Each project gets its own debouncer keyed by id so rapid boundary edits
// for project A don't cancel a pending fetch for project B.

type FetchArgs = Parameters<
  ReturnType<typeof useSiteDataStore.getState>['fetchForProject']
>;

const debouncers = new Map<string, DebouncedFn<FetchArgs>>();

function getDebouncer(projectId: string): DebouncedFn<FetchArgs> {
  let d = debouncers.get(projectId);
  if (!d) {
    d = debounce<FetchArgs>((...args) => {
      void useSiteDataStore.getState().fetchForProject(...args);
    }, 400);
    debouncers.set(projectId, d);
  }
  return d;
}

function dropProject(projectId: string): void {
  const d = debouncers.get(projectId);
  if (d) {
    d.cancel();
    debouncers.delete(projectId);
  }
  abortFetchForProject(projectId);
}

/**
 * Compute centroid + bbox for the project's boundary and schedule a debounced
 * fetch. Pure function — no React, no UI dependencies. Safe to call from any
 * code path that produces a project with a boundary.
 *
 * Geometry parse failures are swallowed (the boundary may be transiently
 * invalid mid-edit). The next valid setState will retry.
 */
export function scheduleSiteDataFetch(project: LocalProject): void {
  const args = deriveSiteFetchArgs(project);
  if (!args) return; // no boundary, or invalid geometry — wait for the next setState
  getDebouncer(project.id)(project.id, args.center, args.country, args.bbox);
}

// ── Subscribe to project-store changes ────────────────────────────────────
// Keep a snapshot of (id → boundary reference) between ticks. Diff on each
// state change to find:
//   - new boundaries (project added with a boundary, or boundary set on an
//     existing project) → schedule fetch
//   - removed projects → cancel debouncer + abort in-flight fetch
//
// Reference equality is enough: `updateProject` always replaces the project
// object via `set((state) => ({ projects: state.projects.map(...) }))`, so a
// boundary that is "the same FeatureCollection" by content is also the same
// reference (it gets re-spread but the inner reference doesn't change unless
// the caller passes a new one). New boundaries always come from `MapToolbar`
// or `geodataCache.get` writing fresh objects, so reference diffing is sound.

type BoundarySnapshot = Map<string, GeoJSON.FeatureCollection | null>;

function takeSnapshot(projects: readonly LocalProject[]): BoundarySnapshot {
  const snap: BoundarySnapshot = new Map();
  for (const p of projects) snap.set(p.id, p.parcelBoundaryGeojson);
  return snap;
}

function diffAndDispatch(
  prev: BoundarySnapshot,
  next: BoundarySnapshot,
  projects: readonly LocalProject[],
): void {
  // Schedule for new/changed boundaries.
  for (const project of projects) {
    if (!project.parcelBoundaryGeojson) continue;
    const before = prev.get(project.id);
    if (before !== project.parcelBoundaryGeojson) {
      scheduleSiteDataFetch(project);
    }
  }
  // Drop removed projects.
  for (const id of prev.keys()) {
    if (!next.has(id)) dropProject(id);
  }
}

let lastSnapshot: BoundarySnapshot = takeSnapshot(
  useProjectStore.getState().projects,
);

// Cover the case where the project store already had projects-with-boundaries
// at module load (e.g. HMR replay, or a builtin hydrated synchronously before
// our subscribe registration). The subscriber wouldn't fire for these because
// no setState happened — sweep them once on init.
for (const project of useProjectStore.getState().projects) {
  if (project.parcelBoundaryGeojson) scheduleSiteDataFetch(project);
}

const unsubscribe = useProjectStore.subscribe((state) => {
  const next = takeSnapshot(state.projects);
  diffAndDispatch(lastSnapshot, next, state.projects);
  lastSnapshot = next;
});

// HMR cleanup: tear down the previous instance's subscription before
// installing this one's. Without this guard, every Vite hot-reload of either
// store would stack a new subscriber and fire N times per setState.
declare global {
  // eslint-disable-next-line no-var
  var __ogdenSiteDataSyncCleanup: (() => void) | undefined;
}
if (typeof globalThis !== 'undefined') {
  globalThis.__ogdenSiteDataSyncCleanup?.();
  globalThis.__ogdenSiteDataSyncCleanup = () => {
    unsubscribe();
    for (const id of debouncers.keys()) dropProject(id);
    debouncers.clear();
  };
}
