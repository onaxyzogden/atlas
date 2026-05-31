# 2026-05-31 -- Protocol Layer: triggered protocol surface in the Act stage

**Branch.** `feat/atlas-permaculture` (one explicit-path commit pending tsc gate; wiki backfill committed separately at `627972cc`).

**Objective.** Surface triggered standing protocols in the Act stage so stewards can see when an IF condition has fired and log their response. The evaluation engine (auto-triggering from Observe data) remains deferred; triggering is manual via the store for this slice. Five phases.

---

**Phase 1 -- `useProtocolStore` (`apps/web/src/store/protocolStore.ts`).** New Zustand persist store bridging Plan (activation) to Act (triggered display). Pattern mirrors `hazardsStore.ts`: `create + persist + rehydrateWithLogging`, `partialize: { records }`, persist key `ogden-protocols`, version 1. Shape: `ActivatedProtocolRecord { templateId, projectId, status: 'active'|'triggered'|'suspended', activatedAt, deferredUntil?, lastLoggedAt? }`. Actions: `activateProtocol` (idempotent upsert), `markTriggered`, `logResponse` (flips to 'active', sets `lastLoggedAt`), `defer(isoUntil)`, `suspendProtocol`. Selector: `getTriggered(projectId)` -- filters by `status === 'triggered'` AND (`deferredUntil` unset OR past); computed at read-time so no timer is needed. `upsert` helper ensures idempotent activate/re-activate.

**Phase 2 -- Wire Plan activation to the store (`apps/web/src/v3/plan/spine/PlanSpinePrototype.tsx`).** Added `useParams({ strict: false })` to get `projectId` from the URL (same pattern as `ActTierShell`). The two activation seams in the confirmation flow and protocol mode panel now also call `activateProtocol(projectId, id)` guarded by `projectId` truthy: `onActivate` (line 241 after edit) and `onRestore` (line 257). Plan-side decisions still work without a URL projectId (guard is silent).

**Phase 3 -- `TriggeredProtocolsPanel` + feeds map + CSS.**
- `apps/web/src/v3/act/data/protocolFeedsMap.ts` -- 4-entry static mapping: `'Pasture & Forage' -> 'animals-livestock'`, `'Livestock & Animal Health' -> 'animals-livestock'`, `'Water & Hydrology' -> 'hydrology'`, `'Soil' -> 'soil'`. Covers all 4 distinct `feeds` labels in the 10-template standard catalogue. Labels absent from the map pass through (always visible regardless of active module).
- `apps/web/src/v3/act/ops/TriggeredProtocolsPanel.tsx` -- panel component. Reactive selector: `useProtocolStore(s => projectId ? s.getTriggered(projectId) : [])` (inline call so Zustand sees reference changes). Module filter: when `activeModule !== null`, only shows protocols whose `feeds` intersect the mapping OR whose feeds have no mapping entry (pass-through). Per-card actions: "Log Response" calls `logResponse` + shows "Logged ✓" for 1.5 s via `useState<Set<string>>`; "Defer 24h" calls `defer` with `Date.now() + 86_400_000`. Template lookup: `STANDARD_PROTOCOL_TEMPLATES.find(t => t.id === record.templateId)`. Reuses `.panel`, `.alertItem`, `.alertIcon`, `.alertBody`, `.alertTitle`, `.alertMeta`, `.alertChip`, `.primaryBtn`, `.secondaryBtn` from `ActOpsAside.module.css`. Feed chip is first element of `template.feeds` array.
- `apps/web/src/v3/act/ops/ActOpsAside.module.css` -- 2 additions: `.alertItem[data-protocol='triggered'] { --alert-color: #c4a265; }` (amber gold, matches design token) and `.protocolActions { display: flex; gap: 6px; margin-top: 6px; flex-wrap: wrap; }`.

**Phase 4 -- Mount in both Act right-rail surfaces.**
- `ActOpsAside.tsx` -- added `useProtocolStore` import; `showProtocols = triggered.length > 0` computed before the `activeModule === null` guard; panel mounted as first child in BOTH branches (empty-state branch with `activeModule={null}`, full-panels branch with `activeModule={activeModule}`). The compass-link empty state always shows protocols if triggered -- the plan requirement that protocols surface even when no module is selected.
- `ActOpsDashboard.tsx` -- same pattern: panel mounted as first child of `.dashboard`, guarded by `triggered.length > 0`, `activeModule={null}`.

**Phase 5 -- Amber pulsing map marker (`apps/web/src/v3/act/tier-shell/ProtocolMapMarkers.tsx`).** New component, pattern mirrors `ActTierMapMarkers`: `useRef<maplibregl.Marker | null>`, teardown-and-replace in a `useEffect`, cleanup on unmount. Injects `@keyframes ogden-protocol-pulse` CSS once via `document.head` using a stable style id guard (`ogden-protocol-pulse`). When `triggeredCount > 0`, places a single 16px amber (`.ogden-protocol-marker`) pulsing dot at `centroid: [lng, lat]`. Mounted in `ActTierShell.tsx` adjacent to `ActTierMapMarkers`, with `triggeredCount` from `useProtocolStore(s => s.getTriggered(id)).length`.

**Key design decisions.**
- Panel position: own dedicated panel (not injected into AlertsPanel) -- protocols are standing rules, fundamentally different from operational hazard signals; conflating them muddies the signal type.
- `activeModule === null` handling: store read happens BEFORE the guard; the panel renders in both branches so it's visible even in the compass-link empty state.
- `ProofEvent` NOT created on Log Response: `ProofEvent` schema requires a `workItemId` back-link (D4 design); no WorkItem is associated with a protocol response. `logResponse()` sets `lastLoggedAt` directly instead.
- `getTriggered` uses `get()` (current state) at read-time -- no stale closure issues; the `deferredUntil` check is computed on every selector call so expired deferrals re-appear naturally on the next render.

**tsc.** Verified clean via `pnpm run typecheck` (8 GB heap, per `_b4_web_tsc3.txt` precedent).

Continues [[log/2026-05-31-atlas-act-objective-tool-rail]] and [[log/2026-05-31-plan-nav-v1.1-deferred-seams]]. Protocol store connects Plan [[entities/web-app]] activation seam to Act display.

---

**Addendum (same day) -- bugfix: "Maximum update depth exceeded".** The four Act consumers read triggered records via `useProtocolStore((s) => s.getTriggered(projectId))`. `getTriggered` runs `.filter()` and returns a **fresh array reference on every call**; under Zustand v5 the selector result is the `useSyncExternalStore` snapshot, so a new reference each render is read as a state change and drives an infinite re-render loop (the `: []` fallback literal in `TriggeredProtocolsPanel` had the same defect). No `useShallow` precedent exists in the codebase, so the fix selects the reference-stable `records` array and derives the filtered list in `useMemo`, centralised in a new exported hook `useTriggeredProtocols(projectId)` in `protocolStore.ts` (module-level `EMPTY` constant for the stable null/empty result). The imperative `getTriggered` store method is retained for `getState()` / console use (`markTriggered` verification path). All four call sites (`TriggeredProtocolsPanel`, `ActOpsAside`, `ActOpsDashboard`, `ActTierShell`) now call the hook. tsc clean (exit 0, 8 GB heap).
