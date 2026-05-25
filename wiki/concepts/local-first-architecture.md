# Local-First Architecture

## Summary
All user-facing state in Atlas is stored in Zustand stores with `persist` middleware targeting `localStorage` (~70 stores, all keyed under the `ogden-` prefix). `syncService` **is implemented and auth-wired** but covers only **four slices** — projects, zones, structures, queued comments. The rest of the v3 design surface is localStorage-only *even when authenticated*. Data survives page reloads but the uncovered majority does **not** survive device switches or browser clears unless the steward exports a project bundle.

> ⚠️ The old claim here ("backend exists but stores are not yet synced") was a verified inaccuracy, corrected 2026-05-16 — see [the partial-sync boundary](#partial-sync-boundary-the-real-state-2026-05-16).

## How It Works
Each Zustand store follows this pattern:
```typescript
export const useXStore = create<XState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item) => set((s) => ({ items: [...s.items, item] })),
      // ...
    }),
    {
      name: 'ogden-x',           // localStorage key
      version: 2,                 // migration version
      migrate: (persisted, ver) => { /* migration logic */ },
      partialize: (state) => {    // exclude transient state
        const { placementMode, ...rest } = state;
        return rest;
      },
    },
  ),
);
```

## Partial-sync boundary: the real state (2026-05-16)

`apps/web/src/lib/syncService.ts` is **fully implemented and wired** —
`main.tsx` starts it on auth and stops it on logout; it calls real
`api.projects.*` / `api.designFeatures.*` endpoints. It is *not* orphaned.
What it is, is **partial**. It round-trips only:

| Synced (survives device switch when authenticated) | Store |
|---|---|
| Projects | `projectStore` |
| Zones | `zoneStore` |
| Structures | `builtEnvironmentStoreV2` |
| Comments (queued) | comment queue |

**Everything else is localStorage-only even when authenticated** — design
elements (`landDesign`), vegetation, every Observe annotation namespace
(hazards/sectors/ecology/pasture/conventional-crop/SWOT), project metadata
(`designStatus`, `designHorizonYears`, zone thresholds),
`regenerationPlanStore`, succession/temporal state — ~70 persisted `ogden-`
stores total, only 3–4 of which sync.

### Mitigation: the project-bundle escape hatch
Until full sync lands, the multi-device path is a **project bundle** —
`apps/web/src/lib/projectBundle.ts` snapshots the entire `ogden-`
localStorage namespace (minus a 4-key denylist) to one JSON file; import
overwrites + reloads so every store re-hydrates and runs its own `migrate`.
Surfaced via `ProjectBundleBar` on the v3 shell, which also serves as the
data-safety banner. See
[ADR 2026-05-16 — multi-device bundle escape hatch](../decisions/2026-05-16-atlas-multi-device-bundle-escape-hatch.md).

### Sync queue is bounded (2026-05-25)
The failed-write retry queue (`apps/web/src/lib/syncQueue.ts`, IndexedDB
`ogden-sync-queue`/`ops`) was an unbounded append log that grew to ~250k ops
and OOM-crashed the renderer on command-centre routes (`flush()` loaded the
whole queue via `getAll()`). It is now bounded by a **coalescing deterministic
key** `storeType:action:localId` — re-queuing an entity overwrites its prior op,
capping the queue at the count of distinct pending entities. `flush()` reads a
bounded `getBatch(FLUSH_BATCH=200)` cursor slice, `reconcile()` collapses any
pre-existing runaway queue at `syncService.start()`, and exhausted ops are now
dropped. See [ADR 2026-05-25](../decisions/2026-05-25-sync-queue-oom-coalescing-fix.md).
### Sync queue circuit-breaker (2026-05-25)
The executor circuit-breaker deferred above is now closed. `executeQueuedOp`
routed create/update through the *swallowing* live-path handlers, so `flush()`
never saw a throw — `retryCount` never incremented and (after the coalescing-key
fix) a failing op re-enqueued under the same key `flush()` had just dequeued,
silently dropping it after one pass. Each swallowing create/update handler gained
a `rethrow = false` param that re-throws before the re-enqueue; the queue path
opts in while the live path keeps fail-soft enqueue. Exhausted ops
(`MAX_RETRIES`) are surfaced via `handleExhaustedOp` (`flush()`'s `onDrop`) into a
new `droppedStores` channel on `connectivityStore`, a `toast.error`, and a
highest-severity `OfflineBanner`. See
[ADR 2026-05-25](../decisions/2026-05-25-atlas-sync-circuit-breaker.md). This is
the safety property that makes turning on the full-coverage path
(`FLAGS.SYNC_STATE_BLOBS`) safe — a persistently-failing blob push now surfaces
instead of vanishing.

## Sync Strategy (Planned — full coverage deferred to backlog)
Extending `syncService` from the 4 covered slices to the full ~70-store v3
surface is the real long-term fix, deferred as a backlog item (too large to
gate the testing window on). Intended shape:
1. On project creation: POST to API, store returned `serverId`
2. On mutation: debounced PATCH to API using `serverId`
3. On app load: if online, fetch latest from API, merge with local
4. Conflict resolution: last-write-wins with timestamp comparison

## Where It's Used
Every feature in the app — zones, structures, paddocks, crops, paths, utilities, comments, scenarios, fieldwork, portal configs, financial settings.

## Constraints
- Never assume data is in the database — always check both DB and payload
- PDF export service handles this by accepting `payload` for client-only data
- `data_completeness_score` on the project is the only server-computed value
- Portal configs are localStorage-only — public portals can't be shared yet (launch blocker)

## Risk
Data loss on browser clear for the uncovered ~66 stores; multi-device only via manual bundle export/import; no real-time collaboration. Full `syncService` coverage remains the #1 launch blocker — the bundle is a tester-window mitigation, not a resolution.
