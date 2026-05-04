---
date: 2026-04-26
status: accepted
tags: [zustand, react, performance, anti-pattern]
---

# Zustand selector stability — subscribe raw, derive in useMemo

## Context

Two Atlas dashboard panels (Feasibility, Herd Rotation) crashed with React's
"Maximum update depth exceeded" error. Stack traces pointed to components
that read Zustand store slices via selectors of the form:

```ts
const items = useStore((s) => s.items.filter((x) => x.projectId === id));
const phases = usePhaseStore((s) => s.getProjectPhases(projectId));
```

Both shapes return a freshly-allocated array on every store snapshot read.
Zustand v5 uses `useSyncExternalStore`, which compares the current snapshot
against the previous via `Object.is`. A new array literal each call means
the snapshot is *always* "new" → React schedules a re-render → selector runs
again → new array → infinite loop.

## Decision

**Selectors must return stable references.** Subscribe to the raw slice the
store already memoises, then derive filtered/sorted views with `useMemo` in
the component:

```ts
// ✗ Anti-pattern — new array every call
const paddocks = useLivestockStore((s) => s.paddocks.filter((p) => p.projectId === id));

// ✓ Stable subscription + derived view
const allPaddocks = useLivestockStore((s) => s.paddocks);
const paddocks = useMemo(
  () => allPaddocks.filter((p) => p.projectId === id),
  [allPaddocks, id],
);
```

The same rule applies to selectors that call store *methods* returning new
arrays (e.g. `getProjectPhases(id)`): treat them as derivations, not
subscriptions. Pull the underlying array, derive in `useMemo`.

## Scope

Six files corrected in this session:

- `apps/web/src/features/decision/SeasonalRealismCard.tsx`
- `apps/web/src/components/panels/TimelinePanel.tsx`
- `apps/web/src/features/livestock/MultiSpeciesPlannerCard.tsx`
- `apps/web/src/features/fieldwork/WalkChecklistCard.tsx` (4 selectors)
- `apps/web/src/features/ai-design-support/DesignBriefPitchCard.tsx` (5 selectors)
- `apps/web/src/features/ai-design-support/EducationalExplainerCard.tsx` (5 selectors)

## Consequences

- Panel render loops eliminated; ErrorBoundary fallbacks no longer triggered
  on the affected pages.
- New convention for future Atlas card/panel components: never inline `.filter`,
  `.sort`, or `.map` inside a Zustand selector. Subscribe to slices; derive
  in the component.
- A lint rule (custom ESLint) would catch this class of bug at authoring
  time — deferred, but worth considering when the codebase grows.
