# ADR: Act Tier-Shell beforeLoad Route Guards

**Date:** 2026-06-07
**Status:** accepted
**Branch:** feat/structured-capture-forms
**Commit:** e0a65aca

---

## Context

Commit `67d184c9` wired `STRATUM_PREREQS` into the `obj()` authoring helper so
that every Plan objective now inherits real `prerequisiteObjectiveIds` from its
stratum. The Plan spine and the interactive Act paths (handleSelectObjective /
handleSelectStratum in ActTierShell) already enforce the gate. However, navigating
DIRECTLY to a locked Act URL (bookmarked link, URL bar, external link) bypassed
all guards and rendered locked content silently.

Two routes were vulnerable:
- `act/tier-shell/$objectiveId` -- renders objective-execution mode
- `act/tier-shell/stratum/$stratumId` -- renders stratum-bearing tier shell

The S1 landing (`act/tier-shell`) is always unlocked and is the redirect target.

---

## Decision

Add TanStack Router v1 `beforeLoad` guards to both vulnerable routes.

### `buildActLockContext(projectId)` helper

A synchronous function defined once in `routes/index.tsx`, called by both guards.

```typescript
function buildActLockContext(projectId: string) {
  if (import.meta.env.DEV && useDevUnlockStore.getState().unlockAll)
    return undefined;
  const project = useProjectStore
    .getState()
    .projects.find((p) => p.id === projectId || p.serverId === projectId);
  if (!project) return undefined;
  const { objectives } = resolveObjectivesForProject(project);
  const ps = usePlanStratumProgressStore.getState();
  const effectiveProgress = computeEffectiveProgress(
    selectProjectProgress(ps, projectId),
    project.metadata?.visionProfile ?? null,
    project.metadata?.team ?? null,
    objectives,
    project.metadata ?? null,
  );
  const deferredSet = toDeferredSet(selectDeferredObjectives(ps, projectId));
  const statuses = computeAllObjectiveStatuses(
    objectives,
    effectiveProgress.flatMap,
    deferredSet,
  );
  return { statuses, objectives };
}
```

Reads Zustand stores via `.getState()` (synchronous; persist middleware hydrates
from localStorage before the first render, so the data is available in beforeLoad).

Returns `undefined` when:
- DEV unlock toggle (`useDevUnlockStore.unlockAll`) is on in development -- guard
  is fully bypassed, supporting iterative design work without completing S1 first
- Project not found by `id` or `serverId` -- unknown project, let the component 404

### Objective guard

```typescript
beforeLoad: ({ params }) => {
  const ctx = buildActLockContext(params.projectId);
  if (!ctx) return;
  if (!ctx.objectives.some((o) => o.id === params.objectiveId)) return;
  if ((ctx.statuses[params.objectiveId] ?? 'locked') === 'locked') {
    throw redirect({
      to: '/v3/project/$projectId/act/tier-shell',
      params: { projectId: params.projectId },
    });
  }
},
```

Unknown `objectiveId` passes through (not in objectives list) -- lets the component
handle with its existing graceful empty state.

### Stratum guard

```typescript
beforeLoad: ({ params }) => {
  const ctx = buildActLockContext(params.projectId);
  if (!ctx) return;
  const stratumStates = computeAllStratumStates(
    PLAN_STRATA.map((s) => s.id),
    ctx.objectives,
    ctx.statuses,
  );
  if ((stratumStates[params.stratumId] ?? 'locked') === 'locked') {
    throw redirect({
      to: '/v3/project/$projectId/act/tier-shell',
      params: { projectId: params.projectId },
    });
  }
},
```

Defaults to `'locked'` for an unknown `stratumId` (belt-and-suspenders).

---

## Alternatives Considered

**Component-level redirect (useEffect):** Fires AFTER the component renders,
producing a visual flash. TanStack Router `beforeLoad` is the idiomatic zero-flash
intercept point.

**Middleware / global route guard:** Would require iterating all routes in a
centralized hook. Per-route `beforeLoad` is more explicit and doesn't
over-generalize the gate to non-Act routes.

---

## Consequences

- Deep-linked locked Act URLs redirect to `act/tier-shell` (S1 landing) with no
  visual flash or locked content rendered.
- DEV unlock toggle (`useDevUnlockStore.unlockAll`) bypasses both guards -- DEV
  only, tree-shaken in production.
- Unlocked deep links (e.g. a known-complete objective URL) render normally.
- The redirect target (`act/tier-shell`) is always reachable (S1 is the entry
  stratum, always unlocked).
- Existing Plan prerequisite gate invariants (tested by spineGate.conformance.test.ts)
  are the authoritative source of truth; the beforeLoad guards consume the same
  status engine, so they stay in sync automatically.

---

## Verification

Smoke-tested via `window.__TSR_ROUTER__.navigate()` on MTC (`feat/structured-capture-forms`):

| Test | Expected | Result |
|---|---|---|
| Locked objective deep-link | Redirect to `act/tier-shell` | PASS |
| Unlocked objective deep-link | Render normally | PASS |
| Locked stratum deep-link | Redirect to `act/tier-shell` | PASS |
| DEV unlock ON, locked URL | No redirect | PASS |
| DEV unlock OFF, same URL | Redirect again | PASS |
