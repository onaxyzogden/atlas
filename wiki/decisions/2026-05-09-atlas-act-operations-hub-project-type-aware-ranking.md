# Act Operations Hub — Project-type-aware ranking

**Date:** 2026-05-09
**Branch:** feat/atlas-permaculture
**Status:** Implemented

## Decision

Make the Act stage's right-rail Operations Hub re-rank the items it
already surfaces (`TodaysPriorities`, `AlertsPanel`) by per-project-type
module affinity. No new cards, no new tools, no new stores — the signal
is consumed at the sort step right before each panel slices to its
display cap.

When the project has an effective project type set, items tagged with
their owning Act module re-rank by a hand-authored
`Record<PlanProjectTypeKey, readonly ActModule[]>` table. When the
project type is `null` (MTC fallback or a real project where the
steward hasn't touched the Plan picker and the wizard has no
`projectType`), behavior is identical to the prior source-append order
— the affinity sort short-circuits.

## Why ranking, not bespoke tools

An audit of the existing 13 Act module cards (across `build`,
`maintain`, `livestock`, `harvest`, `review`, `network`) found that
roughly 70% of project-type-specific operational logging already
absorbs through notes fields and feature-linking. Building bespoke
type-specific cards or draw tools would be premature without validated
customer demand. Ranking is the cheap, reversible win: it changes what
gets seen first without changing what's seen at all.

The re-rank is also the only place an *existing* steward feels the
project-type lens during daily field work. The Plan-stage card
provides type-specific design prompts; without a corresponding Act
signal, a Conservation steward and a Retreat-Center steward see
identical hubs. Now they don't.

## Why re-use the Plan-stage precedence rule

A second source-of-truth for "what project type is this?" would
inevitably drift from the Plan picker. Both stages now read through
[`useEffectivePlanProjectType`](../../apps/web/src/v3/plan/hooks/useEffectivePlanProjectType.ts)
(extracted as a drive-by during the same day's
[cross-check chip work](2026-05-09-atlas-plan-project-type-checklist.md)),
so the precedence rule
`effectiveType = hasInteracted ? storedType : wizardSeed` is enforced
once. The Plan stage uses the full `{ effectiveType, hasInteracted }`
return for its first-toggle lock-in; Act only consumes
`effectiveType`.

## Affinity table

[`apps/web/src/v3/act/data/projectTypeModuleAffinity.ts`](../../apps/web/src/v3/act/data/projectTypeModuleAffinity.ts)
holds a single `Record<PlanProjectTypeKey, readonly ActModule[]>`
where the array is the priority order (lower index = higher priority):

| Project type | Module priority order |
|---|---|
| Regenerative Farm | harvest → livestock → maintain → build → review → network |
| Retreat Center | network → maintain → review → build → harvest → livestock |
| Homestead | maintain → harvest → livestock → build → network → review |
| Educational Farm | network → review → maintain → harvest → build → livestock |
| Conservation | review → maintain → build → network → harvest → livestock |
| Multi-Enterprise | build → review → harvest → maintain → livestock → network |

These rankings reflect what *daily field work* looks like for each
archetype, not parcel scope or design priority. They are a v1
best-guess; the table is a single hard-coded constant and reversible
in one commit.

`getModuleAffinityRank(type, module)` returns the index, or
`Number.POSITIVE_INFINITY` for null/unknown so unmapped items sink to
the bottom of any affinity-sorted list.

## Source → module tagging

Each panel row now carries a `module: ActModule | null` plus an
internal `_appendOrder: number` (stable-sort secondary key).

**TodaysPriorities:**

| Source | `module` |
|---|---|
| `fieldTasks` (`category: 'ops'`) | `'maintain'` |
| `fieldTasks` (`category: 'weather' \| 'regulation'`) | `'review'` |
| `fieldTasks` (`category: 'team' \| 'education'`) | `'network'` |
| `maintenanceTasks` | `'maintain'` |
| `harvestEntries` | `'harvest'` |
| `milestones` (succession) | `'harvest'` |
| `events` | `'network'` |

**AlertsPanel:**

| Source | `module` |
|---|---|
| `hazards` | `'review'` |
| `paddocks` (water-point unset, no fencing) | `'livestock'` |

The `fieldTasks.category` mapping covers the live values in
[`fieldTaskStore.ts:17-22`](../../apps/web/src/store/fieldTaskStore.ts);
unmapped categories return `null` and sink to the bottom of an
affinity-sorted list.

## Sort logic

**TodaysPriorities** — currently no sort; affinity sort fires only
when `effectiveType` is set, then slice to 8:

```ts
if (effectiveType) {
  acc.sort((a, b) => {
    const ra = getModuleAffinityRank(effectiveType, a.module);
    const rb = getModuleAffinityRank(effectiveType, b.module);
    if (ra !== rb) return ra - rb;
    return a._appendOrder - b._appendOrder; // stable
  });
}
return acc.slice(0, 8);
```

**AlertsPanel** — severity is always primary; affinity is a secondary
tier within the same severity, then `_appendOrder` as a stable
tiebreaker; slice to 5:

```ts
rows.sort((a, b) => {
  const sa = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
  if (sa !== 0) return sa;
  if (effectiveType) {
    const ra = getModuleAffinityRank(effectiveType, a.module);
    const rb = getModuleAffinityRank(effectiveType, b.module);
    if (ra !== rb) return ra - rb;
  }
  return a._appendOrder - b._appendOrder;
});
return rows.slice(0, 5);
```

`AlertsPanel` previously had no explicit sort either; the new sort
preserves the existing severity-first ordering verbatim when
`effectiveType` is `null`.

## Verification

TypeScript: `tsc --noEmit` clean.

Dev preview at `apps/web` Vite port 5200, with seeded test items
spanning all six modules on the `351 House — Atlas Sample` project
(`projectType: homestead`):

- **MTC fallback** (`/v3/project/mtc/act`, wizard `projectType: null`) —
  `Today's Priorities` empty (no field tasks for today),
  `Alerts` shows the existing single hazard (frost) — identical to
  current main. Regression check ✓.
- **Real project, homestead** (wizard seed, `effectiveType:
  'homestead'`) —
  Priorities order: `maintain, maintain, harvest, network, network, review`.
  Alerts: high-severity livestock fencing first; within medium
  severity, livestock water-point alert ranks above review hazard
  (livestock=2 < review=5).
- **Real project, conservation** (stored selection, `effectiveType:
  'conservation'`) —
  Priorities reorder to: `review, maintain, maintain, network, network, harvest`
  (review jumps from #6 to #1, harvest drops from #3 to #6).
  Alerts: high-severity unchanged; within medium, hazard (review=0)
  promoted above water-point (livestock=5).
- **Real project, picker cleared** (`hasInteracted: true`,
  `selectedType: null`, so `effectiveType: null`) — source-append
  order fully restored: field tasks in declared order, then
  maintenance, harvest, event. Alerts in source order:
  high-fencing, medium-flood, medium-water-point.
- **Plan-side regression** — `PlanProjectTypeCard` renders all six
  options + the homestead checklist via the shared hook; first-toggle
  lock-in still works (no change observable from the prior ADR's
  behavior).

## Risks

- **Affinity rankings feel "wrong" for a real steward.** Mitigation:
  hard-coded constant, easy to tune. v1 best-guess documented at the
  top of `projectTypeModuleAffinity.ts`.
- **Re-rank surprises a steward used to source-append order.**
  Mitigation: behavior unchanged when `effectiveType` is `null`. MTC
  fallback (`projectType: null`) is the dev sentinel — unaffected.
- **Source→module mapping wrong for some `fieldTask.category`.**
  Mitigation: unmapped categories return `null`, sinking to bottom.
  Follow-up to align field-task categories with Act modules cleanly is
  out of scope here.

## Out of scope (deferred)

- New project-type-specific cards or draw tools (transect walks, guest
  events, tank readings, etc.) — re-evaluate when a real customer
  asks.
- A "Routines for [type]" card at the top of `ActOpsAside`.
- A 4th adaptive Quick-Log slot in `ActTools` — toolbar stays
  universal.
- Wiring affinity into `UpcomingEvents` — events are already
  network-only, so ranking is irrelevant there.
- Visual indication of why an item ranks high (e.g. a "type-aligned"
  chip).
- Tagging `livestock` items into `TodaysPriorities`. The vestigial
  `wantLivestock` gate currently affects nothing.

## Files

- Created [`apps/web/src/v3/act/data/projectTypeModuleAffinity.ts`](../../apps/web/src/v3/act/data/projectTypeModuleAffinity.ts)
- Edited [`apps/web/src/v3/act/ops/TodaysPriorities.tsx`](../../apps/web/src/v3/act/ops/TodaysPriorities.tsx) — row tagging + sort + slice
- Edited [`apps/web/src/v3/act/ops/AlertsPanel.tsx`](../../apps/web/src/v3/act/ops/AlertsPanel.tsx) — row tagging + sort + slice
- Consumed (already extracted upstream same day): [`apps/web/src/v3/plan/hooks/useEffectivePlanProjectType.ts`](../../apps/web/src/v3/plan/hooks/useEffectivePlanProjectType.ts)

## Follow-up — v1 sanity review (2026-05-09)

The v1 affinity table was sanity-checked against pen-and-paper steward-day
walkthroughs for all six archetypes the same day it shipped. See
[`2026-05-09-atlas-act-affinity-v1-sanity-review.md`](2026-05-09-atlas-act-affinity-v1-sanity-review.md).
Headline: 4/6 archetypes confirm v1 (regenerative_farm, retreat_center,
educational_farm, conservation); 2/6 surface candidate tweaks
(homestead — promote `livestock` over `harvest`; multi_enterprise —
promote `network` 3 positions). The review recommends shipping nothing
until real-steward telemetry exists; tweaks are deferred. The review
also flags a Schedule-module gap (the `'schedule'` `ActModule` is
absent from the affinity table and currently sinks to the bottom for
every type via `Number.POSITIVE_INFINITY`).
