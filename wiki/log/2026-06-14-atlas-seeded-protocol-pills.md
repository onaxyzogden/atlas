# 2026-06-14 — Seeded protocol pills + Protocol mode pinned group

**Branch:** `main` · **Commit:** `4fc1744b` · **Status:** committed, NOT pushed · **Amanah:** pure IA/navigation, no capital/sale/financing surface

## Summary

Introduced a **separate mapping layer** that seeds standing protocols onto objectives without modifying either schema. Two UI surfaces make the relationship visible and navigable:

- **Pill strip (Surface B):** coloured pills under the objective title in `ObjectiveDetailPanel` — one per seeded protocol. Clicking navigates to Protocol mode with the protocol pre-selected.
- **Pinned group (Surface C):** in Protocol mode, when the user arrives via a pill (URL carries `fromObjective`), a teal-accented *"For this objective"* group pins the seeded protocols at the top of the library list.

No auto-activation. All protocols remain opt-in; the pills are navigate-only.

## Data model — Approach 3 (separate mapping layer)

Three alternatives were considered:

1. `seededProtocols?: string[]` on each objective schema entry
2. `seededObjectives?: string[]` on each protocol template
3. **Separate `SeededProtocolMap` files per project type** ← chosen

Approach 3 keeps both schemas clean and puts the relationship in one auditable place.

**New files:**
- `packages/shared/src/relationships/seededProtocols/types.ts` — `SeededProtocolMap = Partial<Record<string, readonly string[]>>`
- `packages/shared/src/relationships/seededProtocols/universal.ts` — 17 of 19 universal objectives seeded (s1-boundaries, s4-zones intentionally omitted — no direct universal protocol match)
- `packages/shared/src/relationships/seededProtocols/homestead.ts` — 12 homestead-specific seedings (s1-vision household-labour override + 11 hms- specific objectives)
- `packages/shared/src/relationships/seededProtocols/index.ts` — `resolveSeededProtocols(objectiveId, primaryTypeId, secondaryTypeIds?): readonly string[]` merges universal + primary-type map with dedup

**Export added:** `packages/shared/src/index.ts` re-exports `resolveSeededProtocols` + `SeededProtocolMap`.

## New component — SeededProtocolPills

`apps/web/src/v3/plan/strata/SeededProtocolPills.tsx`

- Props: `{ objective: PlanStratumObjective; projectId: string }`
- Reads `typeRecord` from `useProjectStore` (avoids the `Project` type vs. Zustand store shape mismatch — `metadata.projectTypeRecord` does not exist on the API `Project` type)
- Calls `useProtocolLibrary()` to resolve IDs → full `StandardProtocolTemplate` objects
- Renders nothing when seedings list is empty (`return null`)
- Color map: `judgment=blue (C.blue/C.blueDim)`, `cyclical=teal`, `threshold=amber`, `freeform=gray`; unknown types fall back to `FALLBACK_COLOR`
- On click: `navigate({ search: prev => ({ ...prev, planMode: 'protocol', fromObjective: id, selectProtocol: pid }) })`

Mounted in `ObjectiveDetailPanel.tsx` immediately after `<ObjectiveHeader />` (line 351).

## Protocol mode changes

**`ProtocolColumn.tsx`** — new optional props:
```
pinnedGroup?: ProtocolTierGroup
pinnedGroupLabel?: string
```
When set, renders the pinned group with a teal heading + divider before the regular tier groups. Rows use the same toggle-button shape as regular rows but with teal border/background accent.

**`PlanStratumShell.tsx`** — extended `useSearch` cast with `fromObjective?: string; selectProtocol?: string`. When `planMode === 'protocol'` and `fromObjective` is set:
1. Calls `resolveSeededProtocols` → filters `protocolLib.templates` → builds `ProtocolTierGroup`
2. Passes `pinnedGroup` + `pinnedGroupLabel` to `<ProtocolColumn>`
3. Auto-selects `search.selectProtocol` on entry via a `useEffect` + `useRef` guard (fires once per param change)

## Errors encountered and fixed

1. **`Property 'metadata' does not exist on type 'Project'` (ObjectiveDetailPanel.tsx)** — original mount tried to read `project?.metadata?.projectTypeRecord` from the route's `Project` shape. Fixed by moving store access into `SeededProtocolPills` itself (reads from `useProjectStore`).

2. **`'colors' is possibly 'undefined'`** — index access on `const TYPE_COLOR = { ... } as const` doesn't narrow to non-undefined in strict TS. Fixed with `(TYPE_COLOR as Record<string, { bg: string; text: string }>)[protocol.type] ?? FALLBACK_COLOR`.

## Verification

- `tsc --noEmit`: EXIT 0, 4 pre-existing baseline errors only (`syncServiceWorkItemsFallback.test.ts` ×1, `WorkConflictSection.test.tsx` ×3)
- `pnpm --filter @ogden/web run lint`: exits 2, but **only** the 4 pre-existing baseline errors — no new errors from this work
- Tests: 1383/1383 passing (pre-existing baseline)
- Live browser verification deferred (deterministic map-mount preview hang on v3 server-backed projects — [[project-screenshot-hang]])

## Files changed (9)

| File | Type |
|------|------|
| `packages/shared/src/relationships/seededProtocols/types.ts` | NEW |
| `packages/shared/src/relationships/seededProtocols/universal.ts` | NEW |
| `packages/shared/src/relationships/seededProtocols/homestead.ts` | NEW |
| `packages/shared/src/relationships/seededProtocols/index.ts` | NEW |
| `packages/shared/src/index.ts` | MODIFIED |
| `apps/web/src/v3/plan/strata/SeededProtocolPills.tsx` | NEW |
| `apps/web/src/v3/plan/strata/ObjectiveDetailPanel.tsx` | MODIFIED |
| `apps/web/src/v3/plan/strata/ProtocolColumn.tsx` | MODIFIED |
| `apps/web/src/v3/plan/strata/PlanStratumShell.tsx` | MODIFIED |

Entities updated: [[entities/plan-tier-shell]].
