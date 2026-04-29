# Zustand Selector Discipline (Atlas Web)

**Date:** 2026-04-26
**Status:** Adopted (third recurrence triggered codification)
**Scope:** `apps/web/src/features/**` — any component using Zustand store hooks

## Context

Three independent render-loop incidents in three weeks have traced to the same anti-pattern in Zustand selectors:

1. **EnterpriseRevenueMixCard** (commit `5f8e245`) — `s.structures.filter(...)` returning fresh array refs.
2. **InternalVsPublicViewCard + StakeholderReviewModeCard, pass 1** (commit `3b7ef6c`) — same `.filter().sort()` shape.
3. **StakeholderReviewModeCard, pass 2 + 4 sibling portal cards** (this commit) — `s.getConfig(project.id)` getter-in-selector, plus `.filter(...).length` carryovers.

In each case the `panel`-level `ErrorBoundary` swallowed "Maximum update depth exceeded" thrown after the subscribe loop failed to settle, masking the root cause until a user opened the panel in a populated project state.

## Decision

**Zustand selectors must return one of:**

- A primitive (`number`, `string`, `boolean`).
- A direct field reference from store state (e.g., `(s) => s.phases`, not `(s) => s.phases.filter(...)`).
- An action function reference (`(s) => s.updateConfig`).

**Selectors must not:**

- Call store getter methods that internally `find()`/`filter()`/`map()` (e.g., `s.getConfig(id)`, `s.getVisionData(id)`). Even when the underlying `find` returns a stable ref, mutations elsewhere on the source array re-run the selector and can return new refs on the same render path, re-entering subscribe under cascading updates.
- Compute derived arrays or objects inline (`s.structures.filter(...)`).
- Compute derived primitives that *depend on* a fresh-array intermediate (`s.structures.filter(...).length`) — technically safe (numbers compare by value) but inefficient and easy to refactor wrong; treat the same as the array case.

**Required pattern:**

```tsx
// ❌ wrong — getter-in-selector, fresh refs on mutation cascade
const config = usePortalStore((s) => s.getConfig(project.id));

// ❌ wrong — fresh array each call
const phases = usePhaseStore((s) =>
  s.phases.filter((p) => p.projectId === project.id),
);

// ✅ right — subscribe to raw, derive in useMemo
const allConfigs = usePortalStore((s) => s.configs);
const config = useMemo(
  () => allConfigs.find((c) => c.projectId === project.id),
  [allConfigs, project.id],
);

const allPhases = usePhaseStore((s) => s.phases);
const phases = useMemo(
  () => allPhases.filter((p) => p.projectId === project.id),
  [allPhases, project.id],
);
```

## Rationale

Zustand v5's default selector equality is `Object.is`. Any selector that constructs a new array/object each call defeats it; any selector that reaches through a getter method couples the result identity to the source array's identity in ways that surface as render loops only under specific cascading-update sequences (e.g., parent's `useMemo` calling `createConfig` while the child's selector is also subscribed to `configs`).

The hoist-then-useMemo pattern keeps the subscription stable on the raw field (mutated only on relevant actions) and isolates derived data behind React's render-equality guarantees.

## Enforcement

- **Manual review:** `grep -rE "use\w+Store\(\s*\(s\)\s*=>\s*s\.(get\w+\(|\w+\.(filter|map|sort|slice)\()" apps/web/src/features` should return nothing.
- **Future:** consider an ESLint rule `no-derived-zustand-selector` if a fourth incident occurs.

## Sites patched under this ADR

- `apps/web/src/features/portal/StakeholderReviewModeCard.tsx`
- `apps/web/src/features/portal/PortalConfigPanel.tsx`
- `apps/web/src/features/portal/PortalShareSnapshotCard.tsx`
- `apps/web/src/features/portal/ServiceStewardshipFramingCard.tsx`
- `apps/web/src/features/portal/ShareLinkReadinessCard.tsx`

## Known unfixed sites (deferred, low-risk)

- `apps/web/src/features/vision/StageRevealNarrativeCard.tsx:62` — `s.getVisionData(projectId)`.
- `apps/web/src/features/export/InvestorSummaryExport.tsx:24` — `s.getVisionData(project.id)`.

Both are outside the originally-flagged blast radius (portal + economics) and not currently reproducing loops; sweep on next pass.
