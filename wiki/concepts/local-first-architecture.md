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
### Project create is single-pathed + idempotent (2026-05-31)
Project creation used to fire from two un-coordinated places: the wizard create
sites (`WizardStep1Site.tsx`, `NewProjectPage.tsx`) called `api.projects.create()`
inline, *and* `syncService.subscribeToProjects()` fired an un-awaited,
non-idempotent `syncProjectCreate` on every added project -- a **double-create
race** that could mint two server rows for one wizard project. All create now
routes through one canonical action `syncProjectNow(localId): {ok, serverId?,
error?}`: idempotent (`serverId` short-circuit + `isBuiltin` guard), race-free (a
module-level `inFlightProjectSync` promise map dedupes concurrent calls), and
awaitable so the wizard can `toast.error` on failure (while still navigating --
local-first). A per-row "Sync now" button in `PortfolioProjectList` triggers it
for any never-synced non-builtin project. See
[ADR 2026-05-31 -- project-sync hardening](../decisions/2026-05-31-atlas-project-sync-hardening.md).

> ✅ **Boundary-hydration gap (closed 2026-06-01):** server-synced projects arrive
> with `hasParcelBoundary: true` but `parcelBoundaryGeojson: null` (the `GET /projects`
> list/sync path omits geometry; only `GET /projects/:id` embeds it via `ST_AsGeoJSON`).
> `hydrateProjectBoundaries()` (`syncService.ts`) now back-fills geometry for those
> candidates via `api.projects.get(serverId)`, writing through `updateProject` under the
> `isSyncing` guard so the subscription doesn't echo it back as a boundary edit. The
> Portfolio Map (`PortfolioMapPage.tsx`) drives it from a memoized `pendingBoundaryKey`
> effect that re-fires whenever the set of un-hydrated server-boundary projects changes
> (covers projects that sync down *after* mount, not just the mount-time set); an
> `inFlightBoundaryHydration` Set dedupes overlapping runs so each project is fetched at
> most once. The "fall back to `metadata.centerLat/centerLng`" path was already native in
> `projectCentroid`. Server-only projects (e.g. Halton Hills) thus become valid
> flow/relationship endpoints. Landed in commit `5aa973a4`
> (`feat(portfolio): hydrate parcel geometry for server-synced projects`).
> *Verification caveat:* the hardened fix is typecheck-clean (the 2 boundary files have
> zero `tsc` errors; the project-wide typecheck failure on 2026-06-01 was entirely
> unrelated `sourceFeatureRef` observe-schema WIP) and the diff matches the approved plan,
> but it was **not** live-verified with a screenshot — the working tree was too polluted
> with unrelated half-migrated WIP to boot a trustworthy preview. Live confirmation of a
> drawn flow/relationship line to Halton Hills remains a recommended next-session check.

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

### Local-first hardening: durable cache + full real-time coverage (2026-06-04)

Plan `the-goal-is-to-bright-blanket` reframed the target around the actual user:
a small (2–6 person) **trusted field team that works land with often no
connectivity at all** — full days offline are the *normal* case, not the
exception. So the design target is "the field device is fully functional with no
server in sight, for hours," with the network as a luxury that opportunistically
reconciles. The eventual on-site **field-hub** (Docker stack on a site mini-PC for
LAN sync) and a CRDT conflict model are noted as future directions — explicitly
out of scope; this work hardened the device side first. The existing `rev`-based
"steward picks keep-mine / keep-server" conflict model is kept (right-sized for a
trusted team).

- **Phase 1 (commit `0dae9cdf`) — durable offline cache.** Moved the
  `SYNCED_STORES` set off `localStorage` (the ~5–10 MB origin cap silently fails
  writes / evicts state after a heavy offline day) onto an **IndexedDB** persist
  backend (`idbPersistStorage`, DB `ogden-state`), with a lazy one-time
  `localStorage`→IndexedDB migration on first read and async-rehydration safety.
- **Phase 2 (commits `d2fd8930`→`4d8f3b7a`) — full real-time + reconnect coverage
  for the four typed-record Act stores.** These all flow through the single
  generic `synced_records` PUT, each row carrying its own monotonic `rev` +
  `updated_at`. Added a generic `record_upserted`/`record_deleted` WS event pair;
  the server broadcasts author-excluded on the PUT; a single guarded client apply
  `applyIncomingRecord` (shared by the live WS handler and the reconnect
  delta-pull) owns per-record `rev` bookkeeping + three guards (rev/echo →
  author never double-applies own echo; version-skew drop; init-clobber → pending
  un-synced local push never overwritten) inside `setSyncGuard`; a new
  `GET .../changed-since?since=<ISO>` endpoint + `pullActRecordDelta` lets an
  all-day-offline device **pull** what teammates changed while it was gone
  (broadcast alone only reaches peers connected at broadcast time), advancing the
  `lastSyncedAt` watermark to the newest *server* `updated_at` (clock-skew-immune).
  Gated behind `FEATURE_SYNC_STATE_BLOBS` (default OFF). See
  [[decisions/2026-06-04-olos-local-first-record-broadcast-reconnect-delta]].

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
